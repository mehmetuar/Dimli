import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  DataSource,
  EntityManager,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Reservation, ReservationStatus } from '../entities/reservation.entity';
import { RecurringClosure } from '../entities/recurring-closure.entity';
import { MatchAnnouncement } from '../../match-announcements/match-announcement.entity';
import { Pitch } from '../../pitches/entities/pitch.entity';
import { User } from '../../users/user.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { ReservationSupportService } from './reservation-support.service';
import { ReservationLifecycleService } from './reservation-lifecycle.service';
import {
  addIstanbulDays,
  istanbulDateTimeToUtc,
  nowInIstanbul,
  toIstanbulParts,
} from '../../common/turkey-time.util';

// Sürekli (haftalık) kapatma + tek seferlik manuel doldurma + gece materialize cron'u.
// blockSlot sendSystemMessage için Support'u, removeRecurringClosure revokeConfirmation için
// Lifecycle'ı kullanır. Transaction'lar bu servis içinde korunur.
@Injectable()
export class ReservationRecurringService {
  private readonly logger = new Logger(ReservationRecurringService.name);

  constructor(
    @InjectRepository(RecurringClosure)
    private recurringClosureRepository: Repository<RecurringClosure>,
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    @InjectRepository(Pitch)
    private pitchRepository: Repository<Pitch>,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
    private support: ReservationSupportService,
    private lifecycle: ReservationLifecycleService,
  ) {}

  async manualFill(pitchId: string, slotTime: Date) {
    this.logger.log(
      `Manual fill initiated for pitch: ${pitchId}, time: ${slotTime}`,
    );

    return this.dataSource.transaction(async (manager) => {
      const pitch = await manager.findOne(Pitch, {
        where: { id: pitchId },
        relations: ['business'],
      });
      if (!pitch) throw new NotFoundException('Saha bulunamadı.');

      return this.blockSlot(manager, pitchId, slotTime);
    });
  }

  // Bir saat dilimini doluya çevirir: bekleyen talepleri reddeder, "rakip arıyor"
  // ilanlarını iptal eder ve teamsiz bir DIRECT reservation oluşturur. manualFill()
  // (tek seferlik kapatma) ve recurring-closure materialization (haftalık tekrar)
  // tarafından paylaşılır — recurringClosureId verilirse oluşan satır o kurala bağlanır.
  private async blockSlot(
    manager: EntityManager,
    pitchId: string,
    slotTime: Date,
    recurringClosureId?: string,
  ) {
    {
      const approvalTime = new Date(slotTime);
      const windowStart = new Date(approvalTime.getTime() - 15 * 60000);
      const windowEnd = new Date(approvalTime.getTime() + 15 * 60000);

      // 1. Check if already FULL
      const existingApproved = await manager.findOne(Reservation, {
        where: {
          pitchId: pitchId,
          status: ReservationStatus.APPROVED,
          slotTime: Between(windowStart, windowEnd),
        },
      });
      if (existingApproved) {
        throw new ConflictException('Bu saat zaten dolu.');
      }

      // 2. Reject all pending reservations
      const pendingReservations = await manager.find(Reservation, {
        where: {
          pitchId: pitchId,
          slotTime: Between(windowStart, windowEnd),
          status: ReservationStatus.PENDING,
        },
        relations: ['team', 'team.captain', 'team.players'],
      });

      if (pendingReservations.length > 0) {
        for (const pending of pendingReservations) {
          pending.status = ReservationStatus.REJECTED;
          await manager.save(pending);

          if (pending.matchAnnouncementId) {
            try {
              await this.support.sendSystemMessage(
                manager,
                pending.matchAnnouncementId,
                pending.team,
                `{{SHIELD}} Bu saat için saha ayrılmış durumda.\n\nİşletme sahibi saati doluya geçirdi. Yeni bir maç ayarlamak için sitemizdeki diğer saatlere göz atabilirsiniz.\n\nEğer bir sorun olduğunu düşünüyorsanız lütfen işletme ile iletişime geçin.`,
                { type: 'MANUAL_FILL_REJECTED', reservationId: pending.id },
              );
            } catch (e) {
              this.logger.error(
                'Failed to send system message for pending reservation on manual fill',
                e,
              );
            }
          }

          // Notifications to players
          try {
            const playersToNotify: User[] = [];
            if (pending.team?.players)
              playersToNotify.push(...pending.team.players);

            for (const player of playersToNotify) {
              await this.notificationsService.create({
                userId: player.id,
                type: 'SYSTEM',
                title: 'Maç Yapılacak Saat Doldu',
                message: `Bu saat için saha ayrılmış durumda. İşletme sahibi saati doluya geçirdi.`,
                relatedId: pending.id,
                read: false,
                metadata: {
                  type: 'MANUAL_FILL_REJECTED',
                  reservationId: pending.id,
                },
              });
            }
          } catch (e) {
            this.logger.error(
              'Failed to send notifications to pending reservation players on manual fill',
              e,
            );
          }
        }
      }

      // 3. Cancel all pending rakip araniyor announcements
      const pad = (n: number) => String(n).padStart(2, '0');
      const {
        dateStr: approvedDateStr,
        hours: approvedHour,
        minutes: approvedMinute,
      } = toIstanbulParts(approvalTime);
      const approvedTimeStr = `${pad(approvedHour)}:${pad(approvedMinute)}`;

      const pendingAnnouncements = await manager.find(MatchAnnouncement, {
        where: {
          pitchId: pitchId,
          date: approvedDateStr,
          time: approvedTimeStr,
          status: 'PENDING',
        },
        relations: ['team', 'team.captain', 'team.players'],
      });

      if (pendingAnnouncements.length > 0) {
        for (const ann of pendingAnnouncements) {
          ann.status = 'CANCELLED';
          await manager.save(ann);

          const notifiedPlayerIds = new Set<string>();

          const notifyUser = async (userId: string) => {
            if (!userId || notifiedPlayerIds.has(userId)) return;
            notifiedPlayerIds.add(userId);
            await this.notificationsService.create({
              userId: userId,
              type: 'SYSTEM',
              title: 'İlan Saat Dolduğu İçin Kaldırıldı',
              message: `Bu saat için saha ayrılmış durumda. İşletme sahibi saati doluya geçirdi.`,
              relatedId: ann.id,
              read: false,
              metadata: {
                type: 'ANNOUNCEMENT_SLOT_TAKEN',
                announcementId: ann.id,
              },
            });
          };

          const captainId = ann.team?.captain?.id || ann.team?.captainId;
          if (captainId) await notifyUser(captainId);

          if (ann.team?.players) {
            for (const player of ann.team.players) {
              await notifyUser(player.id);
            }
          }
        }
      }

      // 4. Create DIRECT reservation to block the slot
      const manualRes = manager.create(Reservation, {
        pitchId: pitchId,
        slotTime: approvalTime,
        status: ReservationStatus.APPROVED,
        type: 'DIRECT',
        teamId: null as unknown as string,
        recurringClosureId: recurringClosureId || (null as unknown as string),
      });

      await manager.save(manualRes);
      this.logger.log(
        `Manual block successfully created for pitch ${pitchId} at ${slotTime}`,
      );

      return { success: true, reservation: manualRes };
    }
  }

  // Bugünden itibaren `windowDays` gün ileriye kadar, `firstOccurrence` ile aynı
  // saat/dakikada haftalık tekrar eden tarihleri döner (firstOccurrence dahil).
  private computeWeeklyOccurrences(
    firstOccurrence: Date,
    windowDays: number,
  ): Date[] {
    const dates: Date[] = [];
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + windowDays);

    let current = new Date(firstOccurrence);
    while (current <= horizon) {
      dates.push(new Date(current));
      current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    return dates;
  }

  // Bugünden `horizon`'a kadar, verilen haftanın gününe (`dayOfWeek`, İngilizce
  // 'Monday'..'Sunday') ve saate denk gelen, henüz geçmemiş tüm tarihleri döner.
  private computeUpcomingWeekdayOccurrences(
    dayOfWeek: string,
    hour: number,
    minute: number,
    horizon: Date,
  ): Date[] {
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const targetDay = dayNames.indexOf(dayOfWeek);
    if (targetDay === -1) return [];

    const dates: Date[] = [];
    const now = new Date();
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    let cursorDateStr = nowInIstanbul().dateStr;

    while (istanbulDateTimeToUtc(cursorDateStr, '00:00') <= horizon) {
      const [y, m, d] = cursorDateStr.split('-').map(Number);
      // Haftanın günü saf takvim olgusudur (saatten bağımsız) — Date.UTC ile
      // zon-nötr hesaplanır, İstanbul'a çevirmeye gerek yok.
      if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() === targetDay) {
        const occurrence = istanbulDateTimeToUtc(cursorDateStr, timeStr);
        if (occurrence >= now) {
          dates.push(occurrence);
        }
      }
      cursorDateStr = addIstanbulDays(cursorDateStr, 1);
    }
    return dates;
  }

  // İşletmenin haftanın belirli bir gün+saatini sürekli (her hafta tekrar eden)
  // doluya çevirmesini sağlar. `slotTime`, işletmenin tıkladığı slotun tam tarih+
  // saatidir; dayOfWeek buradan hesaplanır ve ilk materialize edilen hafta da budur.
  async createRecurringClosure(
    pitchId: string,
    slotTime: Date,
    startTime: string,
    endTime: string,
  ) {
    const pitch = await this.pitchRepository.findOne({
      where: { id: pitchId },
    });
    if (!pitch) throw new NotFoundException('Saha bulunamadı');

    const firstOccurrence = new Date(slotTime);
    const dayOfWeek = firstOccurrence.toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: 'Europe/Istanbul',
    });

    // Aynı saha+gün+saat için zaten aktif bir kural varsa yeni kural açma —
    // "sadece bu haftayı boşa çıkar" sonrası aynı slota tekrar "Sürekli Kapat"
    // basıldığında duplicate kural oluşmasını engeller; bunun yerine tıklanan
    // haftayı mevcut kurala bağlı olarak yeniden doldurur.
    const existingClosure = await this.recurringClosureRepository.findOne({
      where: { pitchId, dayOfWeek, startTime, endTime, isActive: true },
    });

    if (existingClosure) {
      await this.dataSource.transaction(async (manager) => {
        await this.blockSlot(
          manager,
          pitchId,
          firstOccurrence,
          existingClosure.id,
        );
      });

      this.logger.log(
        `Recurring closure ${existingClosure.id} reused for pitch ${pitchId} (${dayOfWeek} ${startTime}-${endTime}); re-blocked ${firstOccurrence.toISOString()}.`,
      );

      return {
        success: true,
        recurringClosure: existingClosure,
        blockedCount: 1,
        skippedCount: 0,
        reused: true,
      };
    }

    const closure = this.recurringClosureRepository.create({
      pitchId,
      dayOfWeek,
      startTime,
      endTime,
      isActive: true,
    });
    const saved = await this.recurringClosureRepository.save(closure);

    const occurrences = this.computeWeeklyOccurrences(firstOccurrence, 60);

    let blockedCount = 0;
    let skippedCount = 0;
    for (const occurrenceDate of occurrences) {
      try {
        await this.dataSource.transaction(async (manager) => {
          await this.blockSlot(manager, pitchId, occurrenceDate, saved.id);
        });
        blockedCount++;
      } catch (e) {
        skippedCount++;
        this.logger.warn(
          `Recurring closure occurrence skipped for pitch ${pitchId} at ${occurrenceDate}: ${(e as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Recurring closure ${saved.id} created for pitch ${pitchId} (${dayOfWeek} ${startTime}-${endTime}). Blocked ${blockedCount}, skipped ${skippedCount}.`,
    );

    return {
      success: true,
      recurringClosure: saved,
      blockedCount,
      skippedCount,
    };
  }

  async findRecurringClosuresByPitch(pitchId: string) {
    return this.recurringClosureRepository.find({
      where: { pitchId, isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  // Sürekli kapatma kuralını tamamen kaldırır: kuralı siler ve bu kurala bağlı,
  // henüz geçmemiş tüm haftaların bloklarını revokeConfirmation ile açar
  // (bekleyen REJECTED talepleri de PENDING'e geri döndürür).
  async removeRecurringClosure(id: string) {
    const closure = await this.recurringClosureRepository.findOne({
      where: { id },
    });
    if (!closure) {
      throw new NotFoundException('Sürekli kapatma kuralı bulunamadı');
    }

    closure.isActive = false;
    await this.recurringClosureRepository.save(closure);

    const futureReservations = await this.reservationRepository.find({
      where: {
        recurringClosureId: id,
        status: ReservationStatus.APPROVED,
        slotTime: MoreThanOrEqual(new Date()),
      },
    });

    for (const reservation of futureReservations) {
      try {
        await this.lifecycle.revokeConfirmation(reservation.id);
      } catch (e) {
        this.logger.error(
          `Failed to revoke recurring occurrence ${reservation.id} while removing closure ${id}`,
          e,
        );
      }
    }

    await this.recurringClosureRepository.delete(id);

    return { success: true, removedOccurrences: futureReservations.length };
  }

  // Her gece, aktif tüm sürekli kapatma kurallarının 60 günlük materialize
  // penceresini öne doğru taze tutar — henüz oluşturulmamış gelecek haftaları doldurur.
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async topUpRecurringClosures() {
    const activeClosures = await this.recurringClosureRepository.find({
      where: { isActive: true },
    });
    if (activeClosures.length === 0) return;

    const windowDays = 60;
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + windowDays);

    for (const closure of activeClosures) {
      try {
        const [hour, minute] = closure.startTime.split(':').map(Number);
        const occurrences = this.computeUpcomingWeekdayOccurrences(
          closure.dayOfWeek,
          hour,
          minute,
          horizon,
        );

        for (const occurrenceDate of occurrences) {
          const existing = await this.reservationRepository.findOne({
            where: { recurringClosureId: closure.id, slotTime: occurrenceDate },
          });
          if (existing) continue;

          try {
            await this.dataSource.transaction(async (manager) => {
              await this.blockSlot(
                manager,
                closure.pitchId,
                occurrenceDate,
                closure.id,
              );
            });
          } catch (e) {
            this.logger.warn(
              `Top-up skipped for recurring closure ${closure.id} at ${occurrenceDate}: ${(e as Error).message}`,
            );
          }
        }
      } catch (e) {
        this.logger.error(
          `Failed to top up recurring closure ${closure.id}`,
          e,
        );
      }
    }
  }
}
