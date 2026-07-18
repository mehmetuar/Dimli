import {
  BadRequestException,
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
  In,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Reservation, ReservationStatus } from '../entities/reservation.entity';
import { RecurringClosure } from '../entities/recurring-closure.entity';
import { MatchAnnouncement } from '../../match-announcements/match-announcement.entity';
import { Pitch } from '../../pitches/entities/pitch.entity';
import { User } from '../../users/user.entity';
import { Team } from '../../teams/team.entity';
import { ChatService } from '../../chat/chat.service';
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
    @InjectRepository(Team)
    private teamRepository: Repository<Team>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationsService: NotificationsService,
    private dataSource: DataSource,
    private support: ReservationSupportService,
    private lifecycle: ReservationLifecycleService,
    // ChatModule ReservationsModule'e düz import'la bağlı (ReservationSupportService
    // emsali) — yeni modül import'u gerekmez.
    private chatService: ChatService,
  ) {}

  // Kanal adı/bildirim metinleri sunucuda üretilir — client locale'ine güvenilmez.
  private static readonly DAY_LABELS: Record<string, string> = {
    Monday: 'Pazartesi',
    Tuesday: 'Salı',
    Wednesday: 'Çarşamba',
    Thursday: 'Perşembe',
    Friday: 'Cuma',
    Saturday: 'Cumartesi',
    Sunday: 'Pazar',
  };

  private dayLabel(dayOfWeek: string): string {
    return ReservationRecurringService.DAY_LABELS[dayOfWeek] ?? dayOfWeek;
  }

  async manualFill(pitchId: string, ownerId: string, slotTime: Date) {
    this.logger.log(
      `Manual fill initiated for pitch: ${pitchId}, time: ${slotTime}`,
    );

    // GÜVENLİK: yalnız sahanın işletme sahibi slotu doluya çevirebilir.
    await this.lifecycle.assertPitchOwnedBy(pitchId, ownerId);

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
    ownerId: string,
    slotTime: Date,
    startTime: string,
    endTime: string,
    // Opsiyonel tek adımda abone ataması — eski client'lar bu alanları
    // göndermez, davranış birebir korunur.
    teamShortId?: string,
    opponentTeamShortId?: string,
  ) {
    const pitch = await this.pitchRepository.findOne({
      where: { id: pitchId },
    });
    if (!pitch) throw new NotFoundException('Saha bulunamadı');

    // GÜVENLİK: yalnız sahanın işletme sahibi sürekli kapatma oluşturabilir.
    await this.lifecycle.assertPitchOwnedBy(pitchId, ownerId);

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

      if (teamShortId) {
        await this.assignTeamToClosure(
          existingClosure.id,
          ownerId,
          teamShortId,
          opponentTeamShortId,
        );
      }

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

    if (teamShortId) {
      await this.assignTeamToClosure(
        saved.id,
        ownerId,
        teamShortId,
        opponentTeamShortId,
      );
    }

    return {
      success: true,
      recurringClosure: saved,
      blockedCount,
      skippedCount,
    };
  }

  async findRecurringClosuresByPitch(pitchId: string, ownerId: string) {
    // GÜVENLİK: yalnız sahanın işletme sahibi kapatma kurallarını görebilir.
    await this.lifecycle.assertPitchOwnedBy(pitchId, ownerId);
    return this.recurringClosureRepository.find({
      where: { pitchId, isActive: true },
      relations: ['team', 'opponentTeam'],
      order: { createdAt: 'ASC' },
    });
  }

  // Takım kodunu (shortId, ABC-123) birebir sorguyla çözer — tüm takımları
  // yükleyip aramak yerine unique index'e gider (ölçeklenebilirlik şartı).
  private async resolveTeamByCode(code: string): Promise<Team> {
    const normalized = code.trim().toUpperCase();
    if (!/^[A-Z]{3}-\d{3}$/.test(normalized)) {
      throw new BadRequestException(
        'Geçersiz takım kodu. Örnek format: ABC-123',
      );
    }
    const team = await this.teamRepository
      .createQueryBuilder('team')
      .where('UPPER(team.short_id) = :shortId', { shortId: normalized })
      .getOne();
    if (!team) {
      throw new NotFoundException(`${normalized} kodlu takım bulunamadı.`);
    }
    return team;
  }

  private async getTeamMemberIds(teamIds: string[]): Promise<string[]> {
    if (!teamIds.length) return [];
    const members = await this.userRepository.find({
      where: { teamId: In(teamIds) },
      select: ['id'],
    });
    return members.map((m) => m.id);
  }

  // Sabit kapatmaya takım atar (tek takım veya rakipli çift takım) ve atanan
  // takım(lar)ın tüm oyuncularını içeren kalıcı abone (SUBSCRIPTION) kanalını
  // açar. Önceki atama varsa kanalıyla birlikte değiştirilir. Onay akışı yok —
  // işletmenin tek taraflı işlemidir.
  async assignTeamToClosure(
    closureId: string,
    ownerId: string,
    teamShortId: string,
    opponentTeamShortId?: string,
  ) {
    const closure = await this.recurringClosureRepository.findOne({
      where: { id: closureId, isActive: true },
    });
    if (!closure) {
      throw new NotFoundException('Sürekli kapatma kuralı bulunamadı');
    }

    // GÜVENLİK: yalnız sahanın işletme sahibi atama yapabilir.
    await this.lifecycle.assertPitchOwnedBy(closure.pitchId, ownerId);

    const pitch = await this.pitchRepository.findOne({
      where: { id: closure.pitchId },
      relations: ['business'],
    });
    if (!pitch) throw new NotFoundException('Saha bulunamadı.');
    // Silinmesi planlanmış/silinmiş sahaya yeni abonelik açılamaz (§60 uyumu).
    if (pitch.deletedAt || pitch.scheduledDeletionAt) {
      throw new ConflictException(
        'Bu saha silinmek üzere — yeni abonelik atanamaz.',
      );
    }

    const team = await this.resolveTeamByCode(teamShortId);
    let opponentTeam: Team | null = null;
    if (opponentTeamShortId) {
      opponentTeam = await this.resolveTeamByCode(opponentTeamShortId);
      if (opponentTeam.id === team.id) {
        throw new BadRequestException('İki takım kodu aynı olamaz.');
      }
    }

    // Önceki atama varsa: kanalını kapat + eski üyeleri bilgilendir.
    const previousTeamIds = [closure.teamId, closure.opponentTeamId].filter(
      (id): id is string => !!id,
    );
    if (previousTeamIds.length) {
      const previousMemberIds = await this.getTeamMemberIds(previousTeamIds);
      await this.chatService.deleteSubscriptionChannelByClosure(closure.id);
      await this.notificationsService.createSubscriptionNotification(
        previousMemberIds,
        'Abonelik Sona Erdi',
        `${pitch.business?.name ?? pitch.name} sahasındaki her ${this.dayLabel(closure.dayOfWeek)} ${closure.startTime} aboneliğiniz işletme tarafından sonlandırıldı.`,
      );
    }

    closure.teamId = team.id;
    closure.opponentTeamId = opponentTeam?.id ?? null;
    await this.recurringClosureRepository.save(closure);

    const players = await this.userRepository.find({
      where: {
        teamId: In(opponentTeam ? [team.id, opponentTeam.id] : [team.id]),
      },
    });

    const businessName = pitch.business?.name ?? pitch.name;
    const dayLabel = this.dayLabel(closure.dayOfWeek);
    const channelName = `${businessName} — Her ${dayLabel} ${closure.startTime}`;

    const channel = await this.chatService.createSubscriptionChannel(
      closure.id,
      channelName,
      players,
    );

    // Sistem mesajı: push'u atlanır (skipPush) — aynı olay için aşağıdaki
    // abonelik bildirimi zaten push gönderiyor (§13/§17 çift push kuralı).
    const matchupText = opponentTeam
      ? `${team.name} ile ${opponentTeam.name} takımları`
      : `${team.name} takımı`;
    await this.chatService.sendMessage(
      channel.id,
      null,
      `{{STADIUM}} Bu sohbet, ${businessName} — ${pitch.name} sahasındaki her ${dayLabel} ${closure.startTime}–${closure.endTime} sabit rezervasyon aboneliğiniz için oluşturuldu.\n\n${matchupText} bu saate abonedir. Sohbet, işletme aboneliği sonlandırana kadar açık kalır.`,
      true,
      undefined,
      true,
    );

    await this.notificationsService.createSubscriptionNotification(
      players.map((p) => p.id),
      'Sabit Rezervasyon Aboneliği',
      `${businessName}, takımınızı her ${dayLabel} ${closure.startTime}–${closure.endTime} sabit rezervasyon abonesi olarak ekledi.`,
    );

    this.logger.log(
      `Subscriber assigned to closure ${closure.id}: team=${team.id}${opponentTeam ? ` opponent=${opponentTeam.id}` : ''}; channel=${channel.id}`,
    );

    return {
      success: true,
      recurringClosure: await this.recurringClosureRepository.findOne({
        where: { id: closure.id },
        relations: ['team', 'opponentTeam'],
      }),
    };
  }

  // Atamayı kaldırır: abone kanalı (mesaj geçmişiyle) silinir, üyeler bilgilendirilir.
  async unassignTeamFromClosure(closureId: string, ownerId: string) {
    const closure = await this.recurringClosureRepository.findOne({
      where: { id: closureId },
    });
    if (!closure) {
      throw new NotFoundException('Sürekli kapatma kuralı bulunamadı');
    }

    // GÜVENLİK: yalnız sahanın işletme sahibi atamayı kaldırabilir.
    await this.lifecycle.assertPitchOwnedBy(closure.pitchId, ownerId);

    const assignedTeamIds = [closure.teamId, closure.opponentTeamId].filter(
      (id): id is string => !!id,
    );
    if (!assignedTeamIds.length) {
      return { success: true, removed: false };
    }

    const memberIds = await this.getTeamMemberIds(assignedTeamIds);
    await this.chatService.deleteSubscriptionChannelByClosure(closure.id);

    closure.teamId = null;
    closure.opponentTeamId = null;
    await this.recurringClosureRepository.save(closure);

    const pitch = await this.pitchRepository.findOne({
      where: { id: closure.pitchId },
      relations: ['business'],
    });
    await this.notificationsService.createSubscriptionNotification(
      memberIds,
      'Abonelik Sona Erdi',
      `${pitch?.business?.name ?? 'İşletme'} sahasındaki her ${this.dayLabel(closure.dayOfWeek)} ${closure.startTime} aboneliğiniz işletme tarafından sonlandırıldı.`,
    );

    this.logger.log(`Subscriber unassigned from closure ${closure.id}.`);
    return { success: true, removed: true };
  }

  // Sürekli kapatma kuralını tamamen kaldırır: kuralı siler ve bu kurala bağlı,
  // henüz geçmemiş tüm haftaların bloklarını revokeConfirmation ile açar
  // (bekleyen REJECTED talepleri de PENDING'e geri döndürür).
  async removeRecurringClosure(id: string, ownerId: string) {
    const closure = await this.recurringClosureRepository.findOne({
      where: { id },
    });
    if (!closure) {
      throw new NotFoundException('Sürekli kapatma kuralı bulunamadı');
    }

    // GÜVENLİK: yalnız sahanın işletme sahibi kuralı kaldırabilir.
    await this.lifecycle.assertPitchOwnedBy(closure.pitchId, ownerId);

    // Abone ataması varsa: kanalı açıkça sil (channelRemoved yayını için — salt
    // FK CASCADE'e bırakılırsa client'lar olayı alamaz) ve üyeleri bilgilendir.
    const assignedTeamIds = [closure.teamId, closure.opponentTeamId].filter(
      (id): id is string => !!id,
    );
    if (assignedTeamIds.length) {
      const memberIds = await this.getTeamMemberIds(assignedTeamIds);
      await this.chatService.deleteSubscriptionChannelByClosure(closure.id);
      const pitchForName = await this.pitchRepository.findOne({
        where: { id: closure.pitchId },
        relations: ['business'],
      });
      await this.notificationsService.createSubscriptionNotification(
        memberIds,
        'Abonelik Sona Erdi',
        `${pitchForName?.business?.name ?? 'İşletme'} sahasındaki her ${this.dayLabel(closure.dayOfWeek)} ${closure.startTime} aboneliğiniz, sabit kapatma kaldırıldığı için sona erdi.`,
      );
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
        // ownerId aynı işletmeye ait (yukarıda doğrulandı) — iç revoke'a aktarılır.
        await this.lifecycle.revokeConfirmation(reservation.id, ownerId);
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
