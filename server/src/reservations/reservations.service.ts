import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Repository,
  DeepPartial,
  Between,
  MoreThanOrEqual,
  Not,
  Equal,
  IsNull,
} from 'typeorm';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { RecurringClosure } from './entities/recurring-closure.entity';
import { ChatService } from '../chat/chat.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Notification } from '../notifications/notification.entity';
import { ChatChannel } from '../chat/chat-channel.entity';
import { ChatParticipant } from '../chat/chat-participant.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Pitch } from '../pitches/entities/pitch.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';
import { User } from '../users/user.entity';
import { SubscriptionService } from '../subscription/subscription.service';
import {
  addIstanbulDays,
  isPitchClosedOnDate,
  istanbulDateTimeToUtc,
  nowInIstanbul,
  toIstanbulParts,
} from '../common/turkey-time.util';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    @InjectRepository(RecurringClosure)
    private recurringClosureRepository: Repository<RecurringClosure>,
    @InjectRepository(Pitch)
    private pitchRepository: Repository<Pitch>,
    @InjectRepository(BusinessOwner)
    private businessOwnerRepository: Repository<BusinessOwner>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private chatService: ChatService,
    private notificationsService: NotificationsService,
    @InjectRepository(ChatChannel)
    private chatChannelRepository: Repository<ChatChannel>,
    private dataSource: DataSource,
    private subscriptionService: SubscriptionService,
  ) {}

  // ... existing methods ...

  @Cron(CronExpression.EVERY_MINUTE)
  async checkMatchReminders() {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const twoHoursFiveMinutesFromNow = new Date(
      now.getTime() + 2 * 60 * 60 * 1000 + 5 * 60 * 1000,
    );

    const reservations = await this.reservationRepository.find({
      where: {
        status: ReservationStatus.APPROVED,
        reminderSent: false,
        slotTime: Between(twoHoursFromNow, twoHoursFiveMinutesFromNow),
      },
      relations: [
        'team',
        'team.players',
        'opponentTeam',
        'opponentTeam.players',
        'pitch',
        'pitch.business',
      ],
    });

    if (reservations.length > 0) {
      this.logger.log(
        `Found ${reservations.length} matches starting in ~2 hours. Sending reminders...`,
      );
    }

    for (const reservation of reservations) {
      const playersToNotify: any[] = [];

      // Add Team A players
      if (reservation.team?.players) {
        playersToNotify.push(...reservation.team.players);
      }

      // Add Team B players
      if (reservation.opponentTeam?.players) {
        playersToNotify.push(...reservation.opponentTeam.players);
      }

      const timeStr = reservation.slotTime.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const pitchName = reservation.pitch?.name || 'Saha';
      const businessName = reservation.pitch?.business?.name || 'İşletme';

      // Send notifications
      for (const player of playersToNotify) {
        await this.notificationsService.create({
          userId: player.id,
          type: 'MATCH_REMINDER',
          title: '⏳ Maçın Başlamasına 2 Saat Kaldı!',
          message: `${businessName} - ${pitchName} sahasındaki maçınız saat ${timeStr}'da başlayacak. Hazırlanmayı unutmayın!`,
          relatedId: reservation.id,
          read: false,
          metadata: {
            reservationId: reservation.id,
            matchTime: timeStr,
            pitchName,
          },
        });
      }

      // Mark as sent
      reservation.reminderSent = true;
      await this.reservationRepository.save(reservation);
    }
  }

  async manualFill(pitchId: string, slotTime: Date) {
    this.logger.log(
      `Manual fill initiated for pitch: ${pitchId}, time: ${slotTime}`,
    );

    return this.dataSource.transaction(async (manager) => {
      const pitch = await manager.findOne(Pitch, {
        where: { id: pitchId },
        relations: ['business'],
      });
      if (!pitch) throw new Error('Saha bulunamadı');

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
        throw new Error('Bu saat zaten dolu.');
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
              await this.sendSystemMessage(
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
            const playersToNotify: any[] = [];
            if (pending.team?.players)
              playersToNotify.push(...pending.team.players);

            for (const player of playersToNotify) {
              await this.notificationsService.create({
                userId: player.id,
                type: 'SYSTEM',
                title: '❌ Maç Yapılacak Saat Doldu',
                message: `⚠️ Bu saat için saha ayrılmış durumda. İşletme sahibi saati doluya geçirdi.`,
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
              title: '⚠️ İlan Saat Dolduğu İçin Kaldırıldı',
              message: `⚠️ Bu saat için saha ayrılmış durumda. İşletme sahibi saati doluya geçirdi.`,
              relatedId: ann.id,
              read: false,
              metadata: {
                type: 'ANNOUNCEMENT_SLOT_TAKEN',
                announcementId: ann.id,
              },
            });
          };

          const captainId =
            (ann.team?.captain as any)?.id || ann.team?.captainId;
          if (captainId) await notifyUser(captainId as string);

          if (ann.team?.players) {
            for (const player of ann.team.players) {
              await notifyUser((player as any).id as string);
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
        await this.revokeConfirmation(reservation.id);
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

  /**
   * Bir saatin (pitch + slotTime) istek/rezervasyona AÇIK olduğunu doğrular.
   * Kapalı/dolu ise (±15 dk pencerede APPROVED bir rezervasyon: sürekli/sabit
   * kapatma, işletmenin manuel kapatması veya başka takımca onaylanmış maç)
   * 409 ConflictException fırlatır. `code: 'SLOT_UNAVAILABLE'` ile client güvenle
   * dallanır. Kullanıcı slotu bayat (stale) görüp istek attığında sunucu engeli.
   */
  async assertSlotAvailable(pitchId: string, slotTime: Date): Promise<void> {
    const windowStart = new Date(slotTime.getTime() - 15 * 60000);
    const windowEnd = new Date(slotTime.getTime() + 15 * 60000);
    const blocking = await this.reservationRepository.findOne({
      where: {
        pitchId,
        status: ReservationStatus.APPROVED,
        slotTime: Between(windowStart, windowEnd),
      },
    });
    if (!blocking) return;

    const message = blocking.recurringClosureId
      ? 'Bu saat sürekli kapatma nedeniyle dolu (sabit). Lütfen başka bir saat seçin.'
      : !blocking.teamId
        ? 'Bu saat işletme tarafından kapatılmış. Lütfen başka bir saat seçin.'
        : 'Bu saat az önce doldu. Lütfen başka bir saat seçin.';
    throw new ConflictException({ message, code: 'SLOT_UNAVAILABLE' });
  }

  async create(createReservationDto: any) {
    const pitch = await this.pitchRepository.findOne({
      where: { id: createReservationDto.pitchId },
      relations: ['business', 'business.owner'],
    });

    if (!pitch) {
      throw new BadRequestException('Saha bulunamadı.');
    }

    if (pitch.approvalStatus !== 'approved' || !pitch.isActive) {
      throw new ForbiddenException('Bu saha şu anda rezervasyona açık değil.');
    }

    // Saha o tarihte (haftalık sürekli kapatma veya genel pasiflik nedeniyle)
    // kapalıysa rezervasyon oluşturulamaz — PitchSchedule.tsx'teki müşteri
    // tarafı kontrolün sunucu tarafı eşdeğeri (savunma katmanı).
    const { dateStr: slotDateStr } = toIstanbulParts(
      new Date(createReservationDto.slotTime),
    );
    if (isPitchClosedOnDate(pitch, slotDateStr)) {
      throw new ForbiddenException(
        `Bu saha ${slotDateStr} tarihinde kapalı, rezervasyon oluşturamazsınız.`,
      );
    }

    // Slot kapalı/dolu mu? (sabit/manuel kapatma veya başka takımca onaylı maç)
    // Evrensel backstop: challenge-kabul, kendi_aramizda ve direkt rezervasyonun
    // hepsi buradan geçer → hiçbir rezervasyon kapalı slota düşemez.
    await this.assertSlotAvailable(
      createReservationDto.pitchId,
      new Date(createReservationDto.slotTime),
    );

    if (!pitch.business?.owner?.id) {
      throw new BadRequestException(
        'Saha için işletme sahibi bilgisi bulunamadı.',
      );
    }

    const subscription = await this.subscriptionService.findByOwner(
      pitch.business.owner.id,
    );
    if (!subscription || !['active', 'trial'].includes(subscription.status)) {
      throw new ForbiddenException(
        'Bu işletmenin aboneliği aktif değil, rezervasyon yapılamaz.',
      );
    }

    const reservation = this.reservationRepository.create(
      createReservationDto as DeepPartial<Reservation>,
    );
    const savedReservation = (await this.reservationRepository.save(
      reservation,
    )) as unknown as Reservation;

    // Notify Business Owner
    try {
      if (pitch && pitch.business) {
        const owner = await this.businessOwnerRepository.findOne({
          where: { business: { id: pitch.business.id } },
        });

        if (owner) {
          const slotTime = new Date(
            (savedReservation as any).slotTime as string,
          );
          const dateStr = slotTime.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
          });
          const timeStr = slotTime.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          });

          await this.notificationsService.create({
            userId: owner.id,
            type: 'RESERVATION_REQUEST',
            title: 'Yeni Rezervasyon İsteği!',
            message: `${pitch.name} için ${dateStr} saat ${timeStr} dilimine yeni bir istek var.`,
            relatedId: (savedReservation as any).id,
            read: false,
            metadata: {
              reservationId: (savedReservation as any).id,
              pitchName: pitch.name,
              date: dateStr,
              time: timeStr,
              role: 'BUSINESS_OWNER',
            },
          });
          this.logger.log(
            `Notification sent to business owner ${owner.id} for reservation ${(savedReservation as any).id}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to send business owner notification', error);
    }

    return savedReservation;
  }

  async findAll() {
    return this.reservationRepository.find();
  }

  // Find all reservations for a specific pitch on a specific date (range)
  async findByPitchAndDate(pitchId: string, start: Date, end: Date) {
    return this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.pitch', 'pitch')
      .leftJoinAndSelect('reservation.team', 'team')
      .leftJoinAndSelect('team.captain', 'teamCaptain')
      .leftJoinAndSelect('reservation.opponentTeam', 'opponentTeam')
      .leftJoinAndSelect('opponentTeam.captain', 'opponentCaptain')
      .leftJoinAndSelect('reservation.matchAnnouncement', 'matchAnnouncement')
      .where('reservation.pitchId = :pitchId', { pitchId })
      .andWhere('reservation.slotTime >= :start', { start })
      .andWhere('reservation.slotTime <= :end', { end })
      .andWhere('reservation.status != :status', {
        status: ReservationStatus.CANCELLED,
      })
      .orderBy('reservation.slotTime', 'ASC')
      .getMany();
  }

  async findPendingBySlot(pitchId: string, slotTime: Date) {
    return this.reservationRepository.find({
      where: {
        pitch: { id: pitchId },
        slotTime: slotTime,
        status: ReservationStatus.PENDING,
      },
      relations: ['team'],
    });
  }

  async approve(id: string, businessNote?: string) {
    this.logger.log(`Approval process started for reservation: ${id}`);

    return this.dataSource.transaction(async (manager) => {
      // 1. Acquire row-level lock WITHOUT joins — LEFT JOIN + FOR UPDATE OF causes
      //    errors in PostgreSQL when nullable relations (opponentTeam) are null.
      await manager
        .getRepository(Reservation)
        .createQueryBuilder('reservation')
        .setLock('pessimistic_write')
        .where('reservation.id = :id', { id })
        .getOne();

      // Load relations separately; lock is held for the duration of this transaction.
      const reservation = await manager.findOne(Reservation, {
        where: { id },
        relations: [
          'pitch',
          'pitch.business',
          'pitch.timeSlots',
          'team',
          'team.captain',
          'team.players',
          'opponentTeam',
          'opponentTeam.players',
        ],
      });

      if (!reservation) {
        this.logger.error(`Reservation not found: ${id}`);
        throw new Error('Reservation not found');
      }

      // 1.1 Allow Re-approval of REJECTED reservations if slot is free
      if (
        reservation.status !== ReservationStatus.PENDING &&
        reservation.status !== ReservationStatus.REJECTED
      ) {
        throw new Error(
          'Sadece beklemede veya reddedilmiş rezervasyonlar onaylanabilir.',
        );
      }

      this.logger.log(
        `Reservation found. Pitch: ${reservation.pitch?.name}, Business: ${reservation.pitch?.business?.name}`,
      );

      // 2. STRICT DOUBLE BOOKING CHECK (Time Range)
      const approvalTime = new Date(reservation.slotTime);
      const windowStart = new Date(approvalTime.getTime() - 15 * 60000); // -15 mins
      const windowEnd = new Date(approvalTime.getTime() + 15 * 60000); // +15 mins

      const existingApproved = await manager.findOne(Reservation, {
        where: {
          pitchId: reservation.pitchId,
          status: ReservationStatus.APPROVED,
          slotTime: Between(windowStart, windowEnd),
        },
      });

      if (existingApproved) {
        if (existingApproved.id !== id) {
          this.logger.warn(
            `Time conflict detected for reservation ${id} with existing approved reservation ${existingApproved.id}`,
          );
          throw new Error(
            'Bu saat dilimi için zaten onaylanmış bir maç var! (Zaman çakışması)',
          );
        }
      }

      // 3. Approve this reservation
      reservation.status = ReservationStatus.APPROVED;
      await manager.save(reservation);
      this.logger.log(`Reservation ${id} status updated to APPROVED.`);

      // 4. PREPARE AND SEND SYSTEM MESSAGE (Success)
      if (reservation.matchAnnouncementId) {
        // Determine Business Name and Pitch Name
        const businessName = reservation.pitch?.business?.name || 'İşletme';
        const pitchName = reservation.pitch?.name || 'Saha';

        // Format Date with Day Name
        const dayName = approvalTime.toLocaleDateString('tr-TR', {
          weekday: 'long',
        });
        const dateStr = approvalTime.toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        const startTimeStr = approvalTime.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        });

        // Calculate end time from pitch time slots or default +1 hour
        let endTimeStr = '';
        const timeSlots = reservation.pitch?.timeSlots;
        if (timeSlots && timeSlots.length > 0) {
          const matchingSlot = timeSlots.find(
            (slot) => slot.startTime === startTimeStr,
          );
          if (matchingSlot) {
            endTimeStr = matchingSlot.endTime;
          }
        }
        if (!endTimeStr) {
          const endTime = new Date(approvalTime.getTime() + 60 * 60 * 1000);
          endTimeStr = endTime.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          });
        }

        // Construct Message with full details
        let messageContent =
          `Maçınız kesinleşti! {{FOOTBALL}}\n\n` +
          `{{STADIUM}} ${businessName}\n` +
          `{{PIN}} ${pitchName}\n` +
          `{{CALENDAR}} ${dateStr} ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}\n` +
          `{{CLOCK}} ${startTimeStr} - ${endTimeStr}`;

        // Add Business Note if exists
        if (businessNote && businessNote.trim() !== '') {
          messageContent += `\n\n{{COMMENT}} İşletme Notu:\n${businessNote}`;
        }

        this.logger.log(
          `Sending approval system message for matchAnnouncementId: ${reservation.matchAnnouncementId}`,
        );

        await this.sendSystemMessage(
          manager,
          reservation.matchAnnouncementId,
          reservation.team,
          messageContent,
          { type: 'MATCH_APPROVED', reservationId: reservation.id },
        );
      } else {
        this.logger.warn(
          `No matchAnnouncementId found for reservation ${id}, skipping chat message.`,
        );
      }

      // 4.5 SEND NOTIFICATIONS TO ALL TEAM PLAYERS
      try {
        const businessName = reservation.pitch?.business?.name || 'İşletme';
        const pitchName = reservation.pitch?.name || 'Saha';
        const notifDayName = approvalTime.toLocaleDateString('tr-TR', {
          weekday: 'long',
        });
        const notifDateStr = approvalTime.toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        const notifTimeStr = approvalTime.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        });

        const playersToNotify: any[] = [];
        if (reservation.team?.players) {
          playersToNotify.push(...reservation.team.players);
        }
        if (reservation.opponentTeam?.players) {
          playersToNotify.push(...reservation.opponentTeam.players);
        }

        for (const player of playersToNotify) {
          await this.notificationsService.create({
            userId: player.id,
            type: 'SYSTEM',
            title: '⚽ Maçınız Kesinleşti!',
            message: `${businessName} - ${pitchName}\n${notifDateStr} ${notifDayName.charAt(0).toUpperCase() + notifDayName.slice(1)} | ${notifTimeStr}\n\nTakımım sayfasından yaklaşan maçlarınızı görüntüleyebilirsiniz. İyi oyunlar! 🏆`,
            relatedId: reservation.id,
            read: false,
            metadata: {
              type: 'MATCH_APPROVED',
              reservationId: reservation.id,
            },
          });
        }
        this.logger.log(
          `Sent MATCH_APPROVED notifications to ${playersToNotify.length} players.`,
        );
      } catch (error) {
        this.logger.error('Failed to send player notifications:', error);
      }

      // 4.6. Aynı takımın farklı sahalardaki çakışan PENDING rezervasyonlarını iptal et
      try {
        const teamWindowStart = new Date(approvalTime.getTime() - 59 * 60000);
        const teamWindowEnd = new Date(approvalTime.getTime() + 59 * 60000);

        const conflictingReservations = await manager.find(Reservation, {
          where: [
            {
              teamId: reservation.teamId,
              status: ReservationStatus.PENDING,
              slotTime: Between(teamWindowStart, teamWindowEnd),
            },
            {
              opponentTeamId: reservation.teamId,
              status: ReservationStatus.PENDING,
              slotTime: Between(teamWindowStart, teamWindowEnd),
            },
          ],
          relations: [
            'team',
            'team.players',
            'opponentTeam',
            'opponentTeam.players',
            'matchAnnouncement',
          ],
        });

        for (const conflict of conflictingReservations) {
          if (conflict.id === id) continue;

          const conflictTimeStr = approvalTime.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          });
          const conflictEndTimeStr = new Date(
            approvalTime.getTime() + 60 * 60000,
          ).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

          conflict.status = ReservationStatus.CANCELLED;
          await manager.save(conflict);

          if (conflict.matchAnnouncementId) {
            await this.sendSystemMessage(
              manager,
              conflict.matchAnnouncementId,
              conflict.teamId === reservation.teamId
                ? conflict.team
                : conflict.opponentTeam,
              `⚠️ Maç İptal Edildi - Saat Çakışması\n\nFarklı bir sahadaki maçınız onaylandı, maç saatleri çakışıyor.\n{{CLOCK}} Onaylanan maç: ${conflictTimeStr} - ${conflictEndTimeStr}\n\nBu rezervasyon iptal edildi.`,
              { type: 'TIME_CONFLICT_CANCELLED', reservationId: conflict.id },
            );

            if (conflict.matchAnnouncement?.matchType === 'rakip_araniyor') {
              conflict.matchAnnouncement.status = 'CANCELLED';
              await manager.save(conflict.matchAnnouncement);
            }

            const conflictChannel = await manager.findOne(ChatChannel, {
              where: {
                relatedMatchId: conflict.matchAnnouncementId,
                type: 'MATCH_GROUP',
              },
            });
            if (conflictChannel) {
              const conflictParticipants = await manager.find(ChatParticipant, {
                where: { channelId: conflictChannel.id, deletedAt: IsNull() },
              });
              for (const p of conflictParticipants) {
                await manager.update(
                  ChatParticipant,
                  { id: p.id },
                  { deletedAt: new Date() },
                );
              }
            }
          }

          // Hangi takımın saati çakıştığını, hangisinin rakibi yüzünden etkilendiğini belirle
          const conflictingTeam =
            conflict.teamId === reservation.teamId
              ? conflict.team
              : conflict.opponentTeam;
          const innocentTeam =
            conflict.teamId === reservation.teamId
              ? conflict.opponentTeam
              : conflict.team;

          // Saat çakışması olan takıma (başka maçı kesinleşen) bildirim
          const conflictingPlayerIds = new Set<string>();
          if (conflictingTeam?.players)
            conflictingTeam.players.forEach((p) =>
              conflictingPlayerIds.add((p as any).id as string),
            );
          for (const playerId of conflictingPlayerIds) {
            await this.notificationsService.create({
              userId: playerId,
              type: 'SYSTEM',
              title: '⚠️ Maç İptal - Saat Çakışması',
              message: `Aynı saatte farklı bir sahadaki maçınız onaylandığı için bu rezervasyon iptal edildi.`,
              relatedId: conflict.id,
              read: false,
              metadata: {
                type: 'TIME_CONFLICT_CANCELLED',
                reservationId: conflict.id,
              },
            });
          }

          // Rakibinin çakışması nedeniyle maçı iptal edilen (massum) takıma farklı bildirim
          const innocentPlayerIds = new Set<string>();
          if (innocentTeam?.players)
            innocentTeam.players.forEach((p) =>
              innocentPlayerIds.add((p as any).id as string),
            );
          for (const playerId of innocentPlayerIds) {
            await this.notificationsService.create({
              userId: playerId,
              type: 'SYSTEM',
              title: '⚠️ Maç İptal - Saat Çakışması',
              message: `Rakibinizin aynı saatte farklı bir maçı kesinleştiği için bu maç iptal edilmiştir.`,
              relatedId: conflict.id,
              read: false,
              metadata: {
                type: 'TIME_CONFLICT_OPPONENT_CANCELLED',
                reservationId: conflict.id,
              },
            });
          }
        }
      } catch (error) {
        this.logger.error(
          'Failed to cancel conflicting team reservations:',
          error,
        );
      }

      // 4.7. Aynı takımın aynı gün çakışan PENDING rakip_araniyor ilanlarını iptal et (rezervasyonsuz olanlar)
      try {
        const { dateStr: approvedDateStr } = toIstanbulParts(approvalTime);

        const teamAnnouncements = await manager.find(MatchAnnouncement, {
          where: {
            teamId: reservation.teamId,
            date: approvedDateStr,
            status: 'PENDING',
            matchType: 'rakip_araniyor',
          },
          relations: ['team', 'team.captain', 'team.players'],
        });

        for (const ann of teamAnnouncements) {
          if (ann.id === reservation.matchAnnouncementId) continue;

          const annStart = istanbulDateTimeToUtc(approvedDateStr, ann.time);

          const diffMs = Math.abs(annStart.getTime() - approvalTime.getTime());
          if (diffMs >= 60 * 60000) continue; // tam bitişik veya daha uzak → çakışma yok

          ann.status = 'CANCELLED';
          await manager.save(ann);

          const annNotifiedIds = new Set<string>();
          const captainId =
            (ann.team?.captain as any)?.id || (ann.team as any)?.captainId;
          if (captainId) {
            annNotifiedIds.add(captainId as string);
            await this.notificationsService.create({
              userId: captainId as string,
              type: 'SYSTEM',
              title: '⚠️ İlan Kaldırıldı - Saat Çakışması',
              message: `Aynı saatte başka bir sahadaki maçınız onaylandığı için ${ann.date} - ${ann.time} saatindeki ilanınız kaldırıldı.`,
              relatedId: ann.id,
              read: false,
              metadata: {
                type: 'ANNOUNCEMENT_TIME_CONFLICT',
                announcementId: ann.id,
              },
            });
          }
          if (ann.team?.players) {
            for (const player of ann.team.players) {
              const pId = (player as any).id;
              if (!pId || annNotifiedIds.has(pId as string)) continue;
              annNotifiedIds.add(pId as string);
              await this.notificationsService.create({
                userId: pId,
                type: 'SYSTEM',
                title: '⚠️ İlan Kaldırıldı - Saat Çakışması',
                message: `Aynı saatte başka bir sahadaki maçınız onaylandığı için ${ann.date} - ${ann.time} saatindeki ilanınız kaldırıldı.`,
                relatedId: ann.id,
                read: false,
                metadata: {
                  type: 'ANNOUNCEMENT_TIME_CONFLICT',
                  announcementId: ann.id,
                },
              });
            }
          }
        }
      } catch (error) {
        this.logger.error(
          'Failed to cancel conflicting team announcements:',
          error,
        );
      }

      // 5. Reject others for the same slot (PASSIVE STATE)
      const others = await manager.find(Reservation, {
        where: {
          pitchId: reservation.pitchId,
          slotTime: Between(windowStart, windowEnd),
          status: ReservationStatus.PENDING,
        },
        relations: ['team', 'team.captain'],
      });

      if (others.length > 0) {
        this.logger.log(
          `Rejecting ${others.length} conflicting pending reservations.`,
        );
        for (const other of others) {
          if (other.id !== id) {
            other.status = ReservationStatus.REJECTED;
            await manager.save(other);

            // Send Rejection Message
            if (other.matchAnnouncementId) {
              await this.sendSystemMessage(
                manager,
                other.matchAnnouncementId,
                other.team,
                `İşletme farklı bir kullanıcıyı kesinleştirdi. {{SAD}}\nBu saat için maç fırsatınızı kaçırdınız.\nFarklı saatlere göz atmaya ne dersiniz?\n\nEğer bir sorun olduğunu düşünüyorsanız lütfen işletme ile iletişime geçin.`,
                { type: 'MATCH_REJECTED_PASSIVE', reservationId: other.id },
              );

              try {
                const playersToNotify: any[] = [];
                if (other.team?.players)
                  playersToNotify.push(...other.team.players);

                for (const player of playersToNotify) {
                  await this.notificationsService.create({
                    userId: player.id,
                    type: 'SYSTEM',
                    title: 'Maç Fırsatı Kaçtı',
                    message: `İşletme farklı bir takımı kesinleştirdi. Bu saatteki rezervasyonunuz iptal oldu.`,
                    relatedId: other.id,
                    read: false,
                    metadata: {
                      type: 'MATCH_REJECTED_PASSIVE',
                      reservationId: other.id,
                    },
                  });
                }
              } catch (error) {
                this.logger.error(
                  'Failed to send player rejection notifications:',
                  error,
                );
              }
            }
          }
        }
      }

      // 6. Cancel conflicting match announcements (rakip_araniyor) for the same pitch + slot
      try {
        // Build date/time strings matching MatchAnnouncement.date (YYYY-MM-DD) and .time (HH:MM)
        const pad = (n: number) => String(n).padStart(2, '0');
        const {
          dateStr: approvedDateStr,
          hours: approvedHour,
          minutes: approvedMinute,
        } = toIstanbulParts(approvalTime);
        const approvedTimeStr = `${pad(approvedHour)}:${pad(approvedMinute)}`;

        const conflictingAnnouncements = await manager.find(MatchAnnouncement, {
          where: {
            pitchId: reservation.pitchId,
            date: approvedDateStr,
            time: approvedTimeStr,
            status: 'PENDING',
            teamId: Not(Equal(reservation.teamId)),
          },
          relations: ['team', 'team.captain', 'team.players'],
        });

        if (conflictingAnnouncements.length > 0) {
          this.logger.log(
            `Found ${conflictingAnnouncements.length} conflicting match announcement(s) for ${approvedDateStr} ${approvedTimeStr}. Cancelling...`,
          );

          const businessName = reservation.pitch?.business?.name || 'İşletme';
          const notifTitle = '⚠️ İlan Saat Dolduğu İçin Kaldırıldı';
          const notifMessage = `${businessName}, bu saat için farklı bir maçı kesinleştirdi. ${approvedDateStr} - ${approvedTimeStr} saatindeki rakip arama ilanınız kaldırıldı.`;

          for (const ann of conflictingAnnouncements) {
            ann.status = 'CANCELLED';
            await manager.save(ann);
            this.logger.log(
              `MatchAnnouncement ${ann.id} set to CANCELLED due to slot being taken.`,
            );

            const notifiedPlayerIds = new Set<string>();

            // Notify captain first
            const captainId =
              (ann.team?.captain as any)?.id || ann.team?.captainId;
            if (captainId) {
              notifiedPlayerIds.add(captainId as string);
              await this.notificationsService.create({
                userId: captainId as string,
                type: 'SYSTEM',
                title: notifTitle,
                message: notifMessage,
                relatedId: ann.id,
                read: false,
                metadata: {
                  type: 'ANNOUNCEMENT_SLOT_TAKEN',
                  announcementId: ann.id,
                  reservationId: reservation.id,
                },
              });
            }

            // Notify remaining team players
            if (ann.team?.players) {
              for (const player of ann.team.players) {
                const playerId = (player as any).id;
                if (!playerId || notifiedPlayerIds.has(playerId as string))
                  continue;
                notifiedPlayerIds.add(playerId as string);
                await this.notificationsService.create({
                  userId: playerId,
                  type: 'SYSTEM',
                  title: notifTitle,
                  message: notifMessage,
                  relatedId: ann.id,
                  read: false,
                  metadata: {
                    type: 'ANNOUNCEMENT_SLOT_TAKEN',
                    announcementId: ann.id,
                    reservationId: reservation.id,
                  },
                });
              }
            }

            this.logger.log(
              `Sent ANNOUNCEMENT_SLOT_TAKEN notifications to ${notifiedPlayerIds.size} user(s) for announcement ${ann.id}.`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          'Failed to cancel conflicting match announcements:',
          error,
        );
      }

      return reservation;
    });
  }

  async revokeConfirmation(id: string) {
    this.logger.log(`Revoking confirmation for reservation: ${id}`);

    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, {
        where: { id },
        relations: [
          'pitch',
          'pitch.business',
          'team',
          'team.captain',
          'team.players',
          'opponentTeam',
          'opponentTeam.players',
        ],
      });

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      if (reservation.status !== ReservationStatus.APPROVED) {
        throw new Error('Sadece onaylanmış maçların onayı kaldırılabilir.');
      }

      // If it's a manual fill (no team), simply delete it and return
      if (!reservation.team) {
        const approvalTime = new Date(reservation.slotTime);
        const windowStart = new Date(approvalTime.getTime() - 15 * 60000);
        const windowEnd = new Date(approvalTime.getTime() + 15 * 60000);

        // Restore REJECTED reservations to PENDING
        const rejectedReservations = await manager.find(Reservation, {
          where: {
            pitchId: reservation.pitchId,
            slotTime: Between(windowStart, windowEnd),
            status: ReservationStatus.REJECTED,
          },
          relations: ['team', 'team.captain', 'team.players'],
        });

        for (const rej of rejectedReservations) {
          rej.status = ReservationStatus.PENDING;
          await manager.save(rej);

          if (rej.matchAnnouncementId) {
            try {
              await this.sendSystemMessage(
                manager,
                rej.matchAnnouncementId,
                rej.team,
                `{{CHECK}} İşletme saati tekrar boşa çevirdi!\n\nTalebiniz yeniden 'Onay Bekliyor' durumuna alındı. Yerinizi ayırtmak (onaylatmak) için saha ile iletişime geçebilirsiniz.`,
                { type: 'MANUAL_FILL_REVOKED', reservationId: rej.id },
              );
            } catch (e) {
              this.logger.error(
                'Failed to send system message for restored reservation',
                e,
              );
            }
          }

          // Notifications to players
          try {
            const playersToNotify: any[] = [];
            if (rej.team?.players) playersToNotify.push(...rej.team.players);

            for (const player of playersToNotify) {
              await this.notificationsService.create({
                userId: player.id,
                type: 'SYSTEM',
                title: '✅ Saat Yeniden Boşaldı!',
                message: `İşletme saati tekrar boşa çevirdi. Yerinizi ayırtmak için saha ile iletişime geçin.`,
                relatedId: rej.id,
                read: false,
                metadata: {
                  type: 'MANUAL_FILL_REVOKED',
                  reservationId: rej.id,
                },
              });
            }
          } catch (e) {
            this.logger.error(
              'Failed to send notifications for restored reservation',
              e,
            );
          }
        }

        await manager.remove(reservation);
        return {
          success: true,
          message:
            'Manuel blokaj kaldırıldı ve önceki istekler aktifleştirildi.',
        };
      }

      // 1. Change status back to PENDING (Business Initiative)
      reservation.status = ReservationStatus.PENDING;
      reservation.cancelRequested = false;
      reservation.cancelRequestedByTeamId = null as unknown as string;
      await manager.save(reservation);

      // Clear related CANCEL_REQUEST notifications
      await manager.update(
        Notification,
        { type: 'CANCEL_REQUEST', relatedId: reservation.id },
        { read: true },
      );

      // 2. Notify the team
      if (reservation.matchAnnouncementId) {
        await this.sendSystemMessage(
          manager,
          reservation.matchAnnouncementId,
          reservation.team,
          `İşletme onayı kaldırdı. Rezervasyonunuz tekrar onay bekliyor durumuna döndü. {{REVOKE}}\nDiğer takımlarla birlikte değerlendirileceksiniz.`,
          { type: 'MATCH_REVOKED_TO_PENDING', reservationId: reservation.id },
        );

        try {
          const playersToNotify: any[] = [];
          if (reservation.team?.players)
            playersToNotify.push(...reservation.team.players);
          if (reservation.opponentTeam?.players)
            playersToNotify.push(...reservation.opponentTeam.players);

          for (const player of playersToNotify) {
            await this.notificationsService.create({
              userId: player.id,
              type: 'SYSTEM',
              title: '⚠️ İşletme Onayı Kaldırdı',
              message: `Kesinleşen maçınızın onayı işletme tarafından kaldırıldı. Rezervasyon tekrar 'Onay Bekliyor' durumuna döndü.`,
              relatedId: reservation.id,
              read: false,
              metadata: {
                type: 'MATCH_REVOKED_TO_PENDING',
                reservationId: reservation.id,
              },
            });
          }
        } catch (error) {
          this.logger.error(
            'Failed to send player revoke notifications:',
            error,
          );
        }
      }

      // 3. Find and restore conflicting REJECTED reservations
      const revocationTime = new Date(reservation.slotTime);
      const windowStart = new Date(revocationTime.getTime() - 15 * 60000); // -15 mins
      const windowEnd = new Date(revocationTime.getTime() + 15 * 60000); // +15 mins

      const conflictingRejected = await manager.find(Reservation, {
        where: {
          pitchId: reservation.pitchId,
          status: ReservationStatus.REJECTED,
          slotTime: Between(windowStart, windowEnd),
        },
        relations: ['team', 'team.captain'],
      });

      if (conflictingRejected.length > 0) {
        this.logger.log(
          `Restoring ${conflictingRejected.length} rejected reservations to PENDING.`,
        );
        for (const conflict of conflictingRejected) {
          if (conflict.id !== id) {
            conflict.status = ReservationStatus.PENDING;
            await manager.save(conflict);

            // Notify restored teams
            if (conflict.matchAnnouncementId) {
              await this.sendSystemMessage(
                manager,
                conflict.matchAnnouncementId,
                conflict.team,
                `Müjde! {{PARTY}}\nİşletme önceki onayı kaldırdı. Rezervasyonunuz tekrar aktif hale geldi ve onay bekliyor.\nŞansınız devam ediyor!`,
                {
                  type: 'MATCH_RESTORED_TO_PENDING',
                  reservationId: conflict.id,
                },
              );

              try {
                const playersToNotify: any[] = [];
                if (conflict.team?.players)
                  playersToNotify.push(...conflict.team.players);

                for (const player of playersToNotify) {
                  await this.notificationsService.create({
                    userId: player.id,
                    type: 'SYSTEM',
                    title: '🌟 Şansın Devam Ediyor!',
                    message: `İşletme diğer takımın onayını kaldırdı. Reddedilen rezervasyonunuz tekrar "Onay Bekliyor" olarak güncellendi.`,
                    relatedId: conflict.id,
                    read: false,
                    metadata: {
                      type: 'MATCH_RESTORED_TO_PENDING',
                      reservationId: conflict.id,
                    },
                  });
                }
              } catch (error) {
                this.logger.error(
                  'Failed to send player restore notifications:',
                  error,
                );
              }
            }
          }
        }
      }

      return reservation;
    });
  }

  async sendBusinessNote(reservationId: string, note: string) {
    this.logger.log(`Sending business note for reservation: ${reservationId}`);

    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
      relations: [
        'team',
        'team.captain',
        'team.players',
        'opponentTeam',
        'opponentTeam.players',
        'pitch',
        'pitch.business',
      ],
    });

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (!reservation.matchAnnouncementId) {
      throw new Error('This reservation is not linked to a match/chat.');
    }

    const businessName = reservation.pitch?.business?.name || 'İşletme';
    const messageContent = `{{COMMENT}} ${businessName} Mesajı:\n${note}`;

    await this.sendSystemMessage(
      this.dataSource.manager, // Use main manager since not in a transaction
      reservation.matchAnnouncementId,
      reservation.team,
      messageContent,
      { type: 'BUSINESS_NOTE', reservationId: reservation.id },
    );

    try {
      const playersToNotify: any[] = [];
      if (reservation.team?.players)
        playersToNotify.push(...reservation.team.players);
      if (reservation.opponentTeam?.players)
        playersToNotify.push(...reservation.opponentTeam.players);

      for (const player of playersToNotify) {
        await this.notificationsService.create({
          userId: player.id,
          type: 'SYSTEM',
          title: `💬 İşletmeden Mesaj: ${businessName}`,
          message: note,
          relatedId: reservation.id,
          read: false,
          metadata: { type: 'BUSINESS_NOTE', reservationId: reservation.id },
        });
      }
    } catch (error) {
      this.logger.error(
        'Failed to send player business note notifications:',
        error,
      );
    }

    return { success: true };
  }

  // Helper to send system message with robust sender fallback and metadata
  private async sendSystemMessage(
    manager: any,
    matchId: string,
    _team: any,
    content: string,
    metadata?: any,
  ) {
    try {
      // Find channel by relatedMatchId and type MATCH_GROUP
      const channel = await manager.findOne(ChatChannel, {
        where: { relatedMatchId: matchId, type: 'MATCH_GROUP' },
      });

      if (channel) {
        // Sistem mesajının gerçek bir göndereni yok (senderId: null) — bu
        // sayede chatService.sendMessage() hiçbir katılımcının okunmadı
        // durumunu (lastReadAt) sıfırlamaz; eskiden burada "sahte gönderen"
        // olarak takım kaptanı kullanılıyordu, bu da kaptanın o kanaldaki
        // okunmadı sayacının her sistem mesajında silinmesine yol açıyordu.
        await this.chatService.sendMessage(
          channel.id as string,
          null,
          content,
          true, // isSystemMessage
          metadata, // Pass metadata
        );
        this.logger.log(`System message sent to channel ${channel.id}`);
      } else {
        this.logger.warn(
          `⚠️ Cannot send system message: Channel not found for matchId ${matchId}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to send system message:', error);
    }
  }

  async findByTeam(teamId: string) {
    return this.reservationRepository.find({
      where: { team: { id: teamId } },
      relations: ['pitch', 'pitch.business', 'team', 'opponentTeam'],
      order: { slotTime: 'ASC' },
    });
  }

  async findUpcomingByTeam(teamId: string) {
    const now = new Date();
    return this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.pitch', 'pitch')
      .leftJoinAndSelect('pitch.business', 'business')
      .leftJoinAndSelect('reservation.team', 'team')
      .leftJoinAndSelect('reservation.opponentTeam', 'opponentTeam')
      .where('reservation.status = :status', {
        status: ReservationStatus.APPROVED,
      })
      .andWhere('reservation.slotTime >= :now', { now })
      .andWhere(
        '(reservation.teamId = :teamId OR reservation.opponentTeamId = :teamId)',
        { teamId },
      )
      .orderBy('reservation.slotTime', 'ASC')
      .getMany();
  }

  /**
   * F4: Bir maç iptal edildiğinde maç grubundaki joker oyuncuları (iki takımdan da
   * olmayan aktif katılımcılar) maç grubundan düşür, kendilerine bildirim gönder ve
   * ilgili JOKER_NEGOTIATION kanallarını temizle. Çağıran transaction (manager)
   * içinde çalışır; hata olsa bile iptali bloklamaz (best-effort).
   */
  private async cleanupJokersOnMatchCancel(
    manager: EntityManager,
    matchAnnouncementId: string,
    validTeamIds: (string | null | undefined)[],
    jokerMessage: string,
    reservationId: string,
  ): Promise<void> {
    try {
      const teamIds = validTeamIds.filter(Boolean) as string[];

      const matchChannel = await manager.findOne(ChatChannel, {
        where: { relatedMatchId: matchAnnouncementId, type: 'MATCH_GROUP' },
      });
      if (matchChannel) {
        const participants = await manager.find(ChatParticipant, {
          where: { channelId: matchChannel.id, deletedAt: IsNull() },
          relations: ['user'],
        });
        // Joker = takımı maçtaki iki takımdan biri OLMAYAN katılımcı
        const jokers = participants.filter(
          (p) => !teamIds.includes(p.user?.teamId ?? ''),
        );
        for (const jp of jokers) {
          await manager.update(
            ChatParticipant,
            { id: jp.id },
            { deletedAt: new Date() },
          );
          try {
            await this.notificationsService.create({
              userId: jp.userId,
              type: 'SYSTEM',
              title: 'Maç İptal Edildi',
              message: jokerMessage,
              relatedId: reservationId,
              read: false,
              metadata: { type: 'JOKER_MATCH_CANCELLED', reservationId },
            });
          } catch (e) {
            this.logger.error('Joker iptal bildirimi gönderilemedi:', e);
          }
        }
      }

      // İlgili JOKER_NEGOTIATION kanal(lar)ını da kapat
      const negotiationChannels = await manager.find(ChatChannel, {
        where: {
          relatedMatchId: matchAnnouncementId,
          type: 'JOKER_NEGOTIATION',
        },
      });
      for (const nc of negotiationChannels) {
        await manager.update(
          ChatParticipant,
          { channelId: nc.id, deletedAt: IsNull() },
          { deletedAt: new Date() },
        );
      }
    } catch (e) {
      this.logger.error('İptal sonrası joker temizliği başarısız:', e);
    }
  }

  async cancel(id: string, teamId: string) {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, {
        where: { id, team: { id: teamId } },
        relations: [
          'team',
          'team.captain',
          'team.players',
          'opponentTeam',
          'opponentTeam.players',
          'pitch',
          'pitch.business',
          'matchAnnouncement',
        ],
      });

      if (!reservation) {
        throw new Error('Reservation not found or unauthorized');
      }

      // Allow cancelling APPROVED as well now (Captain cancellation)
      if (
        reservation.status !== ReservationStatus.PENDING &&
        reservation.status !== ReservationStatus.REJECTED &&
        reservation.status !== ReservationStatus.APPROVED
      ) {
        throw new Error('Bu rezervasyon iptal edilemez.');
      }

      reservation.status = ReservationStatus.CANCELLED;
      await manager.save(reservation);

      // Notify chat if it was an approved match and update announcement status
      if (reservation.matchAnnouncement) {
        await manager.update(
          MatchAnnouncement,
          reservation.matchAnnouncement.id,
          { status: 'CANCELLED' },
        );

        const slotTime = new Date(reservation.slotTime);
        const dateStr = slotTime.toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          weekday: 'long',
        });
        const timeStr = slotTime.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const endTimeStr = new Date(
          slotTime.getTime() + 60 * 60 * 1000,
        ).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const businessName = reservation.pitch?.business?.name || 'İşletme';
        const pitchName = reservation.pitch?.name || 'Saha';

        await this.sendSystemMessage(
          manager,
          reservation.matchAnnouncement.id,
          reservation.team,
          `Takım kaptanı maçı iptal etti. {{CANCEL}}\n\n` +
            `{{STADIUM}} ${businessName}\n` +
            `{{PIN}} ${pitchName}\n` +
            `{{CALENDAR}} ${dateStr}\n` +
            `{{CLOCK}} ${timeStr} - ${endTimeStr}`,
          { type: 'MATCH_CANCELLED_BY_CAPTAIN', reservationId: reservation.id },
        );

        try {
          const playersToNotify: any[] = [];
          if (reservation.team?.players)
            playersToNotify.push(...reservation.team.players);
          if (reservation.opponentTeam?.players)
            playersToNotify.push(...reservation.opponentTeam.players);

          for (const player of playersToNotify) {
            await this.notificationsService.create({
              userId: player.id,
              type: 'SYSTEM',
              title: 'Maç İptal Edildi',
              message: `${businessName} - ${pitchName}\n${dateStr} ${timeStr}\n\nTakım kaptanı maçı iptal etti.`,
              relatedId: reservation.id,
              read: false,
              metadata: {
                type: 'MATCH_CANCELLED_BY_CAPTAIN',
                reservationId: reservation.id,
              },
            });
          }
        } catch (error) {
          this.logger.error(
            'Failed to send player cancellation notifications:',
            error,
          );
        }

        // F4: maç grubundaki jokerleri düşür + bilgilendir + negotiation kanallarını temizle
        await this.cleanupJokersOnMatchCancel(
          manager,
          reservation.matchAnnouncement.id,
          [reservation.team?.id, reservation.opponentTeam?.id],
          `${businessName} - ${pitchName}\n${dateStr} ${timeStr}\n\nDavet edildiğiniz maç iptal edildi.`,
          reservation.id,
        );
      }

      return reservation;
    });
  }
  async requestCancel(id: string, teamId: string, userId: string) {
    const reservation = await this.reservationRepository.findOne({
      where: { id, team: { id: teamId } },
      relations: ['team', 'pitch', 'pitch.business'],
    });

    if (!reservation) {
      throw new Error('Reservation not found or unauthorized');
    }

    if (reservation.status !== ReservationStatus.APPROVED) {
      throw new Error(
        'Sadece onaylanmış maçlar için iptal isteği gönderilebilir.',
      );
    }

    if (reservation.cancelRequested) {
      throw new Error('Zaten bir iptal isteği gönderilmiş.');
    }

    // Update reservation
    reservation.cancelRequested = true;
    reservation.cancelRequestedByTeamId = teamId;
    await this.reservationRepository.save(reservation);

    // Notify chat
    if (reservation.matchAnnouncementId) {
      const slotTime = new Date(reservation.slotTime);
      const dateStr = slotTime.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long',
      });
      const timeStr = slotTime.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const endTimeStr = new Date(
        slotTime.getTime() + 60 * 60 * 1000,
      ).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const businessName = reservation.pitch?.business?.name || 'İşletme';
      const pitchName = reservation.pitch?.name || 'Saha';

      // Fetch user name
      const requestingUser = await this.userRepository.findOne({
        where: { id: userId },
      });
      const userName = requestingUser?.full_name || 'Bir kullanıcı';

      await this.sendSystemMessage(
        this.dataSource.manager,
        reservation.matchAnnouncementId,
        reservation.team,
        `${userName} maç iptal etme isteği gönderdi. Hızlandırmak için işletmeyle iletişime geçebilirsiniz.\n\n` +
          `{{STADIUM}} ${businessName}\n` +
          `{{PIN}} ${pitchName}\n` +
          `{{CALENDAR}} ${dateStr}\n` +
          `{{CLOCK}} ${timeStr} - ${endTimeStr}`,
        { type: 'CANCEL_REQUEST_SENT', reservationId: reservation.id },
      );
    }

    // Notify Business Owner
    try {
      if (reservation.pitch?.business) {
        const owner = await this.businessOwnerRepository.findOne({
          where: { business: { id: reservation.pitch.business.id } },
        });

        if (owner) {
          const slotTime = new Date(reservation.slotTime);
          const dateStr = slotTime.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
          });
          const timeStr = slotTime.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          });

          await this.notificationsService.create({
            userId: owner.id,
            type: 'CANCEL_REQUEST',
            title: 'Talebe Dikkat: Maç İptal İsteği!',
            message: `${reservation.pitch.name} için ${dateStr} saat ${timeStr} dilimindeki maç takımı tarafından iptal edilmek isteniyor.`,
            relatedId: reservation.id,
            read: false,
            metadata: {
              reservationId: reservation.id,
              pitchName: reservation.pitch.name,
              date: dateStr,
              time: timeStr,
              role: 'BUSINESS_OWNER',
            },
          });
        }
      }
    } catch (error) {
      this.logger.error(
        'Failed to send business owner cancel request notification',
        error,
      );
    }

    return reservation;
  }

  async undoCancelRequest(id: string, teamId: string, userId: string) {
    const reservation = await this.reservationRepository.findOne({
      where: { id, team: { id: teamId } },
      relations: ['team', 'pitch', 'pitch.business'],
    });

    if (!reservation) {
      throw new Error('Reservation not found or unauthorized');
    }

    if (!reservation.cancelRequested) {
      throw new Error('İptal isteği bulunmuyor.');
    }

    // Revert cancelRequested
    reservation.cancelRequested = false;
    reservation.cancelRequestedByTeamId = null as unknown as string;
    await this.reservationRepository.save(reservation);

    // Clear related CANCEL_REQUEST notifications
    await this.dataSource.manager.update(
      Notification,
      { type: 'CANCEL_REQUEST', relatedId: reservation.id },
      { read: true },
    );

    // Fetch user name
    const requestingUser = await this.userRepository.findOne({
      where: { id: userId },
    });
    const userName = requestingUser?.full_name || 'Bir kullanıcı';

    // Notify chat
    if (reservation.matchAnnouncementId) {
      const slotTime = new Date(reservation.slotTime);
      const dateStr = slotTime.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long',
      });
      const timeStr = slotTime.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const endTimeStr = new Date(
        slotTime.getTime() + 60 * 60 * 1000,
      ).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const businessName = reservation.pitch?.business?.name || 'İşletme';
      const pitchName = reservation.pitch?.name || 'Saha';

      await this.sendSystemMessage(
        this.dataSource.manager,
        reservation.matchAnnouncementId,
        reservation.team,
        `${userName} iptal isteğini geri aldı. Maçınız planlandığı gibi devam edecektir. \n\n` +
          `{{STADIUM}} ${businessName}\n` +
          `{{PIN}} ${pitchName}\n` +
          `{{CALENDAR}} ${dateStr}\n` +
          `{{CLOCK}} ${timeStr} - ${endTimeStr}`,
        { type: 'UNDO_CANCEL_REQUEST', reservationId: reservation.id },
      );
    }

    // Notify Business Owner
    try {
      if (reservation.pitch?.business) {
        const owner = await this.businessOwnerRepository.findOne({
          where: { business: { id: reservation.pitch.business.id } },
        });

        if (owner) {
          const slotTime = new Date(reservation.slotTime);
          const dateStr = slotTime.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
          });
          const timeStr = slotTime.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          });

          await this.notificationsService.create({
            userId: owner.id,
            type: 'CANCEL_REQUEST_UNDONE',
            title: 'İptal İsteği Geri Alındı',
            message: `${reservation.pitch.name} için ${dateStr} saat ${timeStr} dilimindeki maçın iptal isteği takım tarafından geri çekildi. Maç devam ediyor.`,
            relatedId: reservation.id,
            read: false,
            metadata: {
              reservationId: reservation.id,
              pitchName: reservation.pitch.name,
              date: dateStr,
              time: timeStr,
              role: 'BUSINESS_OWNER',
            },
          });
        }
      }
    } catch (error) {
      this.logger.error(
        'Failed to send business owner cancel request undone notification',
        error,
      );
    }

    return reservation;
  }

  async acceptCancelRequest(id: string) {
    this.logger.log(`Accepting cancel request for reservation: ${id}`);

    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, {
        where: { id, cancelRequested: true },
        relations: [
          'team',
          'team.players',
          'opponentTeam',
          'opponentTeam.players',
          'pitch',
          'pitch.business',
          'matchAnnouncement',
        ],
      });

      if (!reservation) {
        throw new Error('Reservation not found or no active cancel request.');
      }

      reservation.status = ReservationStatus.CANCELLED;
      reservation.cancelRequested = false;
      await manager.save(reservation);

      // Clear related CANCEL_REQUEST notifications
      await manager.update(
        Notification,
        { type: 'CANCEL_REQUEST', relatedId: reservation.id },
        { read: true },
      );

      // Notify chat and update Announcement status
      if (reservation.matchAnnouncement) {
        await manager.update(
          MatchAnnouncement,
          reservation.matchAnnouncement.id,
          { status: 'CANCELLED' },
        );

        const slotTime = new Date(reservation.slotTime);
        const dateStr = slotTime.toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          weekday: 'long',
        });
        const timeStr = slotTime.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const endTimeStr = new Date(
          slotTime.getTime() + 60 * 60 * 1000,
        ).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const businessName = reservation.pitch?.business?.name || 'İşletme';
        const pitchName = reservation.pitch?.name || 'Saha';

        await this.sendSystemMessage(
          manager,
          reservation.matchAnnouncement.id,
          reservation.team,
          `İşletme iptal isteğini onayladı. Maç iptal edildi. {{CANCEL}}\n\n` +
            `{{STADIUM}} ${businessName}\n` +
            `{{PIN}} ${pitchName}\n` +
            `{{CALENDAR}} ${dateStr}\n` +
            `{{CLOCK}} ${timeStr} - ${endTimeStr}`,
          {
            type: 'MATCH_CANCELLED_BY_BUSINESS_APPROVAL',
            reservationId: reservation.id,
          },
        );

        try {
          const playersToNotify: any[] = [];
          if (reservation.team?.players)
            playersToNotify.push(...reservation.team.players);
          if (reservation.opponentTeam?.players)
            playersToNotify.push(...reservation.opponentTeam.players);

          for (const player of playersToNotify) {
            await this.notificationsService.create({
              userId: player.id,
              type: 'SYSTEM',
              title: 'Maç İptal Edildi',
              message: `${businessName} - ${pitchName}\n${dateStr} ${timeStr}\n\nİşletme iptal isteğini onayladı.`,
              relatedId: reservation.id,
              read: false,
              metadata: {
                type: 'MATCH_CANCELLED_BY_BUSINESS_APPROVAL',
                reservationId: reservation.id,
              },
            });
          }
        } catch (error) {
          this.logger.error(
            'Failed to send player cancellation notifications:',
            error,
          );
        }

        // F4: maç grubundaki jokerleri düşür + bilgilendir + negotiation kanallarını temizle
        await this.cleanupJokersOnMatchCancel(
          manager,
          reservation.matchAnnouncement.id,
          [reservation.team?.id, reservation.opponentTeam?.id],
          `${businessName} - ${pitchName}\n${dateStr} ${timeStr}\n\nDavet edildiğiniz maç iptal edildi.`,
          reservation.id,
        );
      }

      return reservation;
    });
  }

  async rejectCancelRequest(id: string) {
    this.logger.log(`Rejecting cancel request for reservation: ${id}`);

    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, {
        where: { id, cancelRequested: true },
        relations: ['team', 'pitch', 'pitch.business'],
      });

      if (!reservation) {
        throw new Error('Reservation not found or no active cancel request.');
      }

      reservation.cancelRequested = false;
      await manager.save(reservation);

      // Clear related CANCEL_REQUEST notifications
      await manager.update(
        Notification,
        { type: 'CANCEL_REQUEST', relatedId: reservation.id },
        { read: true },
      );

      // Notify chat
      if (reservation.matchAnnouncementId) {
        const slotTime = new Date(reservation.slotTime);
        const dateStr = slotTime.toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          weekday: 'long',
        });
        const timeStr = slotTime.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const endTimeStr = new Date(
          slotTime.getTime() + 60 * 60 * 1000,
        ).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const businessName = reservation.pitch?.business?.name || 'İşletme';
        const pitchName = reservation.pitch?.name || 'Saha';

        await this.sendSystemMessage(
          manager,
          reservation.matchAnnouncementId,
          reservation.team,
          `İşletme iptal talebini reddetti. İşletme ile iletişime geçmenizi öneririz.\n\n` +
            `{{STADIUM}} ${businessName}\n` +
            `{{PIN}} ${pitchName}\n` +
            `{{CALENDAR}} ${dateStr}\n` +
            `{{CLOCK}} ${timeStr} - ${endTimeStr}`,
          { type: 'CANCEL_REQUEST_REJECTED', reservationId: reservation.id },
        );
      }

      return reservation;
    });
  }

  async rejectByBusiness(reservationId: string) {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, {
        where: { id: reservationId },
        relations: ['team', 'team.captain'],
      });

      if (!reservation) throw new NotFoundException('Rezervasyon bulunamadı');
      if (reservation.status !== ReservationStatus.PENDING) {
        throw new BadRequestException(
          'Sadece bekleyen rezervasyonlar reddedilebilir',
        );
      }

      reservation.status = ReservationStatus.REJECTED;
      await manager.save(reservation);

      if (reservation.matchAnnouncementId) {
        await this.sendSystemMessage(
          manager,
          reservation.matchAnnouncementId,
          reservation.team,
          'İşletme maç isteğinizi reddetti. Bir sorun olduğunu düşünüyorsanız işletme ile iletişime geçin.',
          { type: 'MATCH_REJECTED', reservationId: reservation.id },
        );
      }

      return reservation;
    });
  }

  async findByPitchAndDateRange(pitchId: string, date: string) {
    // date format: YYYY-MM-DD (İstanbul takvim günü)
    const startOfDay = istanbulDateTimeToUtc(date, '00:00');
    const endOfDay = istanbulDateTimeToUtc(addIstanbulDays(date, 1), '00:00');

    return this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.pitch', 'pitch')
      .leftJoinAndSelect('reservation.team', 'team')
      .leftJoinAndSelect('reservation.opponentTeam', 'opponentTeam')
      .where('reservation.pitchId = :pitchId', { pitchId })
      .andWhere('reservation.slotTime >= :start', { start: startOfDay })
      .andWhere('reservation.slotTime < :end', { end: endOfDay })
      .orderBy('reservation.slotTime', 'ASC')
      .getMany();
  }

  async proposeTime(id: string, userId: string, newSlotTime: Date) {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: [
        'team',
        'team.captain',
        'opponentTeam',
        'opponentTeam.captain',
      ],
    });

    if (!reservation) throw new Error('Reservation not found');

    // Verify User is Captain of one of the teams
    const isTeamCaptain =
      (reservation.team?.captain as any)?.id === userId ||
      reservation.team?.captainId === userId;
    const isOpponentCaptain =
      (reservation.opponentTeam?.captain as any)?.id === userId ||
      reservation.opponentTeam?.captainId === userId;

    if (!isTeamCaptain && !isOpponentCaptain) {
      throw new Error('Only captains can propose a time change.');
    }

    reservation.proposedTime = newSlotTime;
    reservation.proposedByUserId = userId;
    await this.reservationRepository.save(reservation);

    // Send System Message
    if (reservation.matchAnnouncementId) {
      const dateStr = new Date(newSlotTime).toLocaleString('tr-TR');
      const proposerName = isTeamCaptain
        ? reservation.team.name
        : reservation.opponentTeam.name;

      await this.sendSystemMessage(
        this.dataSource.manager,
        reservation.matchAnnouncementId,
        reservation.team, // Context team
        `{{PROPOSAL}} YENİ SAAT TEKLİFİ\n\n${proposerName} kaptanı yeni bir saat önerdi:\n{{CALENDAR}} ${dateStr}\n\nKabul etmek için aşağıdaki butona tıklayın.`,
        {
          type: 'PROPOSAL_ACTION',
          reservationId: reservation.id,
          proposedTime: newSlotTime,
        },
      );

      try {
        // Notify the other team's captain
        const targetCaptainId = isTeamCaptain
          ? reservation.opponentTeam?.captainId ||
            (reservation.opponentTeam?.captain as any)?.id
          : reservation.team?.captainId ||
            (reservation.team?.captain as any)?.id;

        if (targetCaptainId) {
          await this.notificationsService.create({
            userId: targetCaptainId,
            type: 'SYSTEM',
            title: '🕒 Yeni Saat Teklifi',
            message: `${proposerName} kaptanı yeni bir saat önerdi: ${dateStr}`,
            relatedId: reservation.id,
            read: false,
            metadata: {
              type: 'PROPOSAL_ACTION',
              reservationId: reservation.id,
              proposedTime: newSlotTime,
            },
          });
        }
      } catch (error) {
        this.logger.error('Failed to send proposal notification:', error);
      }
    }

    return reservation;
  }

  async acceptProposal(id: string, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, {
        where: { id },
        relations: [
          'team',
          'team.captain',
          'opponentTeam',
          'opponentTeam.captain',
        ],
      });

      if (!reservation) throw new Error('Reservation not found');
      if (!reservation.proposedTime) throw new Error('No time proposed.');

      // Verify User is the OTHER captain
      const proposerId = reservation.proposedByUserId;

      const isTeamCaptain =
        (reservation.team?.captain as any)?.id === userId ||
        reservation.team?.captainId === userId;
      const isOpponentCaptain =
        (reservation.opponentTeam?.captain as any)?.id === userId ||
        reservation.opponentTeam?.captainId === userId;

      if (!isTeamCaptain && !isOpponentCaptain)
        throw new Error('Not authorized.');
      if (userId === proposerId)
        throw new Error('You cannot accept your own proposal.');

      // CHECK AVAILABILITY of proposed time
      const approvalTime = new Date(reservation.proposedTime);
      const windowStart = new Date(approvalTime.getTime() - 15 * 60000);
      const windowEnd = new Date(approvalTime.getTime() + 15 * 60000);

      const existingApproved = await manager.findOne(Reservation, {
        where: {
          pitchId: reservation.pitchId,
          status: ReservationStatus.APPROVED,
          slotTime: Between(windowStart, windowEnd),
        },
      });

      if (existingApproved) {
        throw new Error(
          'Önerilen saat maalesef dolu. Lütfen başka bir saat deneyin.',
        );
      }

      // Apply Change
      reservation.slotTime = reservation.proposedTime;
      reservation.status = ReservationStatus.PENDING; // Back to pending for Business consideration
      reservation.proposedTime = null as any; // Clear proposal
      await manager.save(reservation);

      // Notify
      if (reservation.matchAnnouncementId) {
        const dateStr = approvalTime.toLocaleString('tr-TR');
        await this.sendSystemMessage(
          manager,
          reservation.matchAnnouncementId,
          reservation.team,
          `{{HANDSHAKE}} ANLAŞMA SAĞLANDI!\n\nMaç saati ${dateStr} olarak güncellendi.\nİşletme onayı bekleniyor...`,
          { type: 'INFO', reservationId: reservation.id },
        );
      }

      return reservation;
    });
  }

  // Bir takımın belirtilen ilan başlangıç saatiyle çakışan onaylanmış (APPROVED) maçı var mı?
  // Çakışma: |existingSlotTime - announcementStart| < 60 dakika
  async hasConflictingApprovedMatch(
    teamId: string,
    announcementStart: Date,
  ): Promise<Reservation | null> {
    const windowMs = 59 * 60 * 1000; // 59 dk — tam bitişik saatler çakışmaz
    const windowStart = new Date(announcementStart.getTime() - windowMs);
    const windowEnd = new Date(announcementStart.getTime() + windowMs);
    return this.reservationRepository.findOne({
      where: [
        {
          teamId,
          status: ReservationStatus.APPROVED,
          slotTime: Between(windowStart, windowEnd),
        },
        {
          opponentTeamId: teamId,
          status: ReservationStatus.APPROVED,
          slotTime: Between(windowStart, windowEnd),
        },
      ],
    });
  }
}
