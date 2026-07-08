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
  Not,
  Equal,
  In,
  IsNull,
  MoreThanOrEqual,
} from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Reservation, ReservationStatus } from '../entities/reservation.entity';
import { Notification } from '../../notifications/notification.entity';
import { ChatChannel } from '../../chat/chat-channel.entity';
import { ChatParticipant } from '../../chat/chat-participant.entity';
import { MatchAnnouncement } from '../../match-announcements/match-announcement.entity';
import { Team } from '../../teams/team.entity';
import { Pitch } from '../../pitches/entities/pitch.entity';
import { BusinessOwner } from '../../business-owner/entities/business-owner.entity';
import { User } from '../../users/user.entity';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { NotificationsService } from '../../notifications/notifications.service';
import { assertNoteWithinLimit } from '../../common/text-limit.util';
import { SubscriptionService } from '../../subscription/subscription.service';
import { ReservationSupportService } from './reservation-support.service';
import {
  isPitchClosedOnDate,
  istanbulDateTimeToUtc,
  istanbulDisplayParts,
  toIstanbulParts,
} from '../../common/turkey-time.util';

// Takım → RESERVATION_REQUEST bildirim metadata projeksiyonu.
// notifications.service.ts findByOwner self-heal'i ile AYNI şekli üretir —
// alan eklenirse/değişirse iki dosya birlikte güncellenmeli.
const toTeamMeta = (t: Team | null) =>
  t
    ? {
        id: t.id,
        name: t.name,
        logo: t.logoUrl ?? null,
        level: t.level ?? null,
        fairPlay: t.fairPlayScore ?? null,
        ratingCount: t.fairPlayRatingCount ?? 0,
      }
    : null;

// Rezervasyon yaşam döngüsü: oluşturma, onay, iptal akışları, saat müsaitlik guard'ı ve
// maç hatırlatma cron'u. Transaction'lar (approve/cancel/…) bu servis içinde korunur.
// sendSystemMessage / cleanupJokersOnMatchCancel için ReservationSupportService kullanılır.
@Injectable()
export class ReservationLifecycleService {
  private readonly logger = new Logger(ReservationLifecycleService.name);

  constructor(
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    @InjectRepository(Pitch)
    private pitchRepository: Repository<Pitch>,
    @InjectRepository(BusinessOwner)
    private businessOwnerRepository: Repository<BusinessOwner>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationsService: NotificationsService,
    private subscriptionService: SubscriptionService,
    private dataSource: DataSource,
    private support: ReservationSupportService,
  ) {}

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
      const playersToNotify: User[] = [];

      // Add Team A players
      if (reservation.team?.players) {
        playersToNotify.push(...reservation.team.players);
      }

      // Add Team B players
      if (reservation.opponentTeam?.players) {
        playersToNotify.push(...reservation.opponentTeam.players);
      }

      // İstanbul saatiyle formatla — process TZ=UTC, timeZone'suz toLocale* 3 saat geri basar.
      const timeStr = istanbulDisplayParts(new Date(reservation.slotTime)).time;
      const pitchName = reservation.pitch?.name || 'Saha';
      const businessName = reservation.pitch?.business?.name || 'İşletme';

      // Send notifications
      for (const player of playersToNotify) {
        await this.notificationsService.create({
          userId: player.id,
          type: 'MATCH_REMINDER',
          title: 'Maçın Başlamasına 2 Saat Kaldı!',
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

  async create(createReservationDto: CreateReservationDto) {
    const pitch = await this.pitchRepository.findOne({
      where: { id: createReservationDto.pitchId },
      relations: ['business', 'business.owner', 'timeSlots'],
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
          const slotTime = new Date(savedReservation.slotTime);
          // Tüm görüntüleme parçaları İstanbul saatiyle (istanbulDisplayParts) —
          // timeZone'suz toLocale* process TZ'sine (UTC) göre 3 saat geri basar.
          const slotParts = istanbulDisplayParts(slotTime);
          const dateStr = slotParts.displayDate; // '4 Temmuz'
          const timeStr = slotParts.time; // 'HH:mm' İstanbul

          // Uygulama içi bildirim kartı/detayını zenginleştir: istek gönderen takım +
          // (varsa) maç tipi + gün adı + saat aralığı. Push (title/message) DEĞİŞMEZ.
          const dayName = slotParts.dayName;
          const startTime = timeStr;
          let endTime = '';
          const slots = pitch.timeSlots;
          if (slots?.length) {
            const matchingSlot = slots.find((s) => s.startTime === startTime);
            if (matchingSlot) endTime = matchingSlot.endTime;
          }
          if (!endTime) {
            endTime = istanbulDisplayParts(
              new Date(slotTime.getTime() + 60 * 60 * 1000),
            ).time;
          }
          const slotDateIso = slotParts.dateStr; // 'YYYY-MM-DD'

          const team = savedReservation.teamId
            ? await this.reservationRepository.manager
                .getRepository(Team)
                .findOne({ where: { id: savedReservation.teamId } })
            : null;
          // Rakipli maç (rakip_araniyor kabulü): opponentTeamId create'ten önce
          // set edilir (challenges.service) — iki takım da bildirimde gösterilir.
          const opponentTeam = savedReservation.opponentTeamId
            ? await this.reservationRepository.manager
                .getRepository(Team)
                .findOne({ where: { id: savedReservation.opponentTeamId } })
            : null;
          let matchType: string | null = null;
          if (savedReservation.matchAnnouncementId) {
            const ann = await this.reservationRepository.manager
              .getRepository(MatchAnnouncement)
              .findOne({ where: { id: savedReservation.matchAnnouncementId } });
            matchType = ann?.matchType ?? null;
          }

          await this.notificationsService.create({
            userId: owner.id,
            type: 'RESERVATION_REQUEST',
            title: 'Yeni Rezervasyon İsteği!',
            message: `${pitch.name} için ${dateStr} saat ${timeStr} dilimine yeni bir istek var.`,
            relatedId: savedReservation.id,
            read: false,
            metadata: {
              // --- mevcut alanlar (geriye dönük uyumluluk) ---
              reservationId: savedReservation.id,
              pitchName: pitch.name,
              date: dateStr,
              time: timeStr,
              role: 'BUSINESS_OWNER',
              // --- zenginleştirme alanları ---
              metaV: 3, // zenginleştirme sürümü — self-heal guard'ı (bkz. findByOwner)
              pitchId: pitch.id, // "Rezervasyon İsteğine Git" slot auto-open için
              slotDateIso, // 'YYYY-MM-DD' — dashboard tarih formatı
              slotTimeIso: slotTime.toISOString(),
              dayName,
              startTime,
              endTime,
              matchType, // 'kendi_aramizda' | 'rakip_araniyor' | null (DIRECT)
              reservationType: savedReservation.type,
              team: toTeamMeta(team),
              opponentTeam: toTeamMeta(opponentTeam),
            },
          });
          this.logger.log(
            `Notification sent to business owner ${owner.id} for reservation ${savedReservation.id}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to send business owner notification', error);
    }

    return savedReservation;
  }

  async approve(id: string, businessNote?: string) {
    this.logger.log(`Approval process started for reservation: ${id}`);
    // İşletme notu: en fazla 100 karakter (client atlansa bile korunur)
    assertNoteWithinLimit(businessNote, 100, 'İşletme notu');

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
        throw new NotFoundException('Rezervasyon bulunamadı.');
      }

      // 1.1 Allow Re-approval of REJECTED reservations if slot is free
      if (
        reservation.status !== ReservationStatus.PENDING &&
        reservation.status !== ReservationStatus.REJECTED
      ) {
        throw new BadRequestException(
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
          throw new ConflictException(
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

        // Format Date with Day Name — İstanbul saatiyle (timeZone'suz toLocale*
        // process TZ=UTC yüzünden 3 saat geri basar + time_slots eşleşmesi tutmaz).
        const approvalParts = istanbulDisplayParts(approvalTime);
        const dayName = approvalParts.dayName;
        const dateStr = approvalParts.displayDateWithYear;
        const startTimeStr = approvalParts.time;

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
          endTimeStr = istanbulDisplayParts(
            new Date(approvalTime.getTime() + 60 * 60 * 1000),
          ).time;
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

        await this.support.sendSystemMessage(
          manager,
          reservation.matchAnnouncementId,
          reservation.team,
          messageContent,
          { type: 'MATCH_APPROVED', reservationId: reservation.id },
          true, // skipPush: MATCH_APPROVED bildirimi ("Maçınız Kesinleşti!") zaten push atıyor
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
        // İstanbul saatiyle formatla (istanbulDisplayParts) — bkz. yukarıdaki not.
        const notifParts = istanbulDisplayParts(approvalTime);
        const notifDayName = notifParts.dayName;
        const notifDateStr = notifParts.displayDateWithYear;
        const notifTimeStr = notifParts.time;

        const playersToNotify: User[] = [];
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
            title: 'Maçınız Kesinleşti!',
            message: `${businessName} - ${pitchName}\n${notifDateStr} ${notifDayName.charAt(0).toUpperCase() + notifDayName.slice(1)} | ${notifTimeStr}\n\nTakımım sayfasından yaklaşan maçlarınızı görüntüleyebilirsiniz. İyi oyunlar!`,
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

          // İstanbul saatiyle formatla (istanbulDisplayParts) — bkz. yukarıdaki not.
          const conflictTimeStr = istanbulDisplayParts(approvalTime).time;
          const conflictEndTimeStr = istanbulDisplayParts(
            new Date(approvalTime.getTime() + 60 * 60000),
          ).time;

          conflict.status = ReservationStatus.CANCELLED;
          await manager.save(conflict);

          if (conflict.matchAnnouncementId) {
            await this.support.sendSystemMessage(
              manager,
              conflict.matchAnnouncementId,
              conflict.teamId === reservation.teamId
                ? conflict.team
                : conflict.opponentTeam,
              `Maç İptal Edildi - Saat Çakışması\n\nFarklı bir sahadaki maçınız onaylandı, maç saatleri çakışıyor.\n{{CLOCK}} Onaylanan maç: ${conflictTimeStr} - ${conflictEndTimeStr}\n\nBu rezervasyon iptal edildi.`,
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
              conflictingPlayerIds.add(p.id),
            );
          for (const playerId of conflictingPlayerIds) {
            await this.notificationsService.create({
              userId: playerId,
              type: 'SYSTEM',
              title: 'Maç İptal - Saat Çakışması',
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
            innocentTeam.players.forEach((p) => innocentPlayerIds.add(p.id));
          for (const playerId of innocentPlayerIds) {
            await this.notificationsService.create({
              userId: playerId,
              type: 'SYSTEM',
              title: 'Maç İptal - Saat Çakışması',
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
          const captainId = ann.team?.captain?.id || ann.team?.captainId;
          if (captainId) {
            annNotifiedIds.add(captainId);
            await this.notificationsService.create({
              userId: captainId,
              type: 'SYSTEM',
              title: 'İlan Kaldırıldı - Saat Çakışması',
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
              const pId = player.id;
              if (!pId || annNotifiedIds.has(pId)) continue;
              annNotifiedIds.add(pId);
              await this.notificationsService.create({
                userId: pId,
                type: 'SYSTEM',
                title: 'İlan Kaldırıldı - Saat Çakışması',
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
              await this.support.sendSystemMessage(
                manager,
                other.matchAnnouncementId,
                other.team,
                `İşletme farklı bir kullanıcıyı kesinleştirdi. {{SAD}}\nBu saat için maç fırsatınızı kaçırdınız.\nFarklı saatlere göz atmaya ne dersiniz?\n\nEğer bir sorun olduğunu düşünüyorsanız lütfen işletme ile iletişime geçin.`,
                { type: 'MATCH_REJECTED_PASSIVE', reservationId: other.id },
              );

              try {
                const playersToNotify: User[] = [];
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
          const notifTitle = 'İlan Saat Dolduğu İçin Kaldırıldı';
          const notifMessage = `${businessName}, bu saat için farklı bir maçı kesinleştirdi. ${approvedDateStr} - ${approvedTimeStr} saatindeki rakip arama ilanınız kaldırıldı.`;

          for (const ann of conflictingAnnouncements) {
            ann.status = 'CANCELLED';
            await manager.save(ann);
            this.logger.log(
              `MatchAnnouncement ${ann.id} set to CANCELLED due to slot being taken.`,
            );

            const notifiedPlayerIds = new Set<string>();

            // Notify captain first
            const captainId = ann.team?.captain?.id || ann.team?.captainId;
            if (captainId) {
              notifiedPlayerIds.add(captainId);
              await this.notificationsService.create({
                userId: captainId,
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
                const playerId = player.id;
                if (!playerId || notifiedPlayerIds.has(playerId)) continue;
                notifiedPlayerIds.add(playerId);
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

  /**
   * İşletme kapanınca (owner hesap silme) veya bir saha kaldırılınca (plan küçültme
   * saha-seçimi dahil) o saha(lar)a bağlı GELECEKTEKİ bekleyen kayıtları iptal eder
   * ve ilgili takımları bilgilendirir:
   *  - PENDING rezervasyonlar ("onay bekliyor") → CANCELLED + MATCH_GROUP sistem mesajı
   *    + joker temizliği + oyuncu bildirimi.
   *  - PENDING ilanlar ("rakip aranıyor" / rezervasyonsuz kendi_aramizda) → CANCELLED
   *    + kaptan/oyuncu bildirimi.
   * Kesinleşmiş (APPROVED) maçlar silmeyi zaten engellediği için buraya düşmez; geçmiş
   * kayıtlara dokunulmaz (cron onları EXPIRED yapıyor). Çağıranın transaction `manager`'ı
   * içinde çalışır — durum geçişleri manager ile, bildirimler approve() emsalindeki gibi
   * best-effort (kendi transaction'ını açmaz).
   */
  async cancelPendingForPitches(
    pitchIds: string[],
    ctx: {
      scope: 'BUSINESS_CLOSED' | 'PITCH_REMOVED';
      businessName: string;
      pitchNameById?: Map<string, string>;
    },
    manager: EntityManager,
  ): Promise<void> {
    if (!pitchIds || pitchIds.length === 0) return;
    const { scope, businessName } = ctx;
    const now = new Date();

    // "{İşletme} kapandığı için" veya "{İşletme} - {Saha} kaldırıldığı için" öneki.
    const reasonPrefix = (pitchId: string, pitchFallback?: string | null) => {
      if (scope === 'BUSINESS_CLOSED') return `${businessName} kapandığı için`;
      const pitchName =
        ctx.pitchNameById?.get(pitchId) || pitchFallback || 'Saha';
      return `${businessName} - ${pitchName} kaldırıldığı için`;
    };

    // ── 1) Bekleyen rezervasyonlar ("onay bekliyor") ──
    const pendingReservations = await manager.find(Reservation, {
      where: {
        pitchId: In(pitchIds),
        status: ReservationStatus.PENDING,
        slotTime: MoreThanOrEqual(now),
      },
      relations: [
        'pitch',
        'team',
        'team.players',
        'opponentTeam',
        'opponentTeam.players',
      ],
    });

    const handledAnnouncementIds = new Set<string>();

    for (const res of pendingReservations) {
      if (res.matchAnnouncementId)
        handledAnnouncementIds.add(res.matchAnnouncementId);

      const parts = istanbulDisplayParts(new Date(res.slotTime));
      const whenStr = `${parts.displayDateWithYear} ${parts.dayName} ${parts.time}`;
      const message = `${reasonPrefix(res.pitchId, res.pitch?.name)} ${whenStr} saatindeki onay bekleyen saha talebiniz iptal edildi. Yakındaki diğer sahalara göz atabilirsiniz.`;

      // MATCH_GROUP sohbetine sistem mesajı + joker temizliği (varsa). Ayrı push
      // bildirimi gittiğinden skipPush=true (çift push olmasın).
      if (res.matchAnnouncementId) {
        await this.support.sendSystemMessage(
          manager,
          res.matchAnnouncementId,
          res.team,
          message,
          { type: scope, reservationId: res.id },
          true,
        );
        await this.support.cleanupJokersOnMatchCancel(
          manager,
          res.matchAnnouncementId,
          [res.teamId, res.opponentTeamId],
          `${reasonPrefix(res.pitchId, res.pitch?.name)} katıldığınız maç iptal edildi.`,
          res.id,
        );
      }

      // İlgili takım(lar)ın oyuncularına (dedup) bildirim.
      const seen = new Set<string>();
      const players: User[] = [
        ...(res.team?.players ?? []),
        ...(res.opponentTeam?.players ?? []),
      ];
      for (const player of players) {
        if (!player?.id || seen.has(player.id)) continue;
        seen.add(player.id);
        await this.notificationsService.create({
          userId: player.id,
          type: 'SYSTEM',
          title: 'Saha Talebiniz İptal Edildi',
          message,
          relatedId: res.id,
          read: false,
          metadata: { type: scope, reservationId: res.id },
        });
      }
    }

    if (pendingReservations.length > 0) {
      await manager.update(
        Reservation,
        { id: In(pendingReservations.map((r) => r.id)) },
        { status: ReservationStatus.CANCELLED },
      );
    }

    // ── 2) Bekleyen ilanlar (rakip_araniyor + rezervasyonsuz kendi_aramizda) ──
    const pendingAnnouncements = await manager.find(MatchAnnouncement, {
      where: { pitchId: In(pitchIds), status: 'PENDING' },
      relations: ['team', 'team.captain', 'team.players'],
    });

    // Yalnız gelecekteki ilanlar (İstanbul date+time >= şimdi). Geçmiş ilanlar cron
    // ile zaten EXPIRED oluyor; onlara dokunma.
    const nowParts = istanbulDisplayParts(now);
    const futureAnnouncements = pendingAnnouncements.filter(
      (a) =>
        a.date > nowParts.dateStr ||
        (a.date === nowParts.dateStr && a.time >= nowParts.time),
    );

    for (const ann of futureAnnouncements) {
      // kendi_aramizda ilanının rezervasyonu 1. adımda ele alındıysa tekrar bildirim
      // gönderme — durum geçişi aşağıdaki toplu update ile yine yapılır.
      if (handledAnnouncementIds.has(ann.id)) continue;

      const parts = istanbulDisplayParts(
        istanbulDateTimeToUtc(ann.date, ann.time),
      );
      const whenStr = `${parts.displayDateWithYear} ${parts.dayName} ${parts.time}`;
      const isRakip = !ann.matchType || ann.matchType === 'rakip_araniyor';
      const title = isRakip ? 'İlan Kaldırıldı' : 'Maç Talebiniz İptal Edildi';
      const kind = isRakip
        ? `'Rakip Aranıyor' ilanınız kaldırıldı`
        : `onay bekleyen maç talebiniz iptal edildi`;
      const message = `${reasonPrefix(ann.pitchId)} ${whenStr} saatindeki ${kind}. Yakındaki diğer sahalara göz atabilirsiniz.`;

      const recipients = new Set<string>();
      const captainId = ann.team?.captain?.id || ann.team?.captainId;
      if (captainId) recipients.add(captainId);
      for (const p of ann.team?.players ?? []) if (p?.id) recipients.add(p.id);

      for (const userId of recipients) {
        await this.notificationsService.create({
          userId,
          type: 'SYSTEM',
          title,
          message,
          relatedId: ann.id,
          read: false,
          metadata: { type: scope, announcementId: ann.id },
        });
      }
    }

    if (futureAnnouncements.length > 0) {
      await manager.update(
        MatchAnnouncement,
        { id: In(futureAnnouncements.map((a) => a.id)) },
        { status: 'CANCELLED' },
      );
    }
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
        throw new NotFoundException('Rezervasyon bulunamadı.');
      }

      if (reservation.status !== ReservationStatus.APPROVED) {
        throw new BadRequestException(
          'Sadece onaylanmış maçların onayı kaldırılabilir.',
        );
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
              await this.support.sendSystemMessage(
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
            const playersToNotify: User[] = [];
            if (rej.team?.players) playersToNotify.push(...rej.team.players);

            for (const player of playersToNotify) {
              await this.notificationsService.create({
                userId: player.id,
                type: 'SYSTEM',
                title: 'Saat Yeniden Boşaldı!',
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
        await this.support.sendSystemMessage(
          manager,
          reservation.matchAnnouncementId,
          reservation.team,
          `İşletme onayı kaldırdı. Rezervasyonunuz tekrar onay bekliyor durumuna döndü. {{REVOKE}}\nDiğer takımlarla birlikte değerlendirileceksiniz.`,
          { type: 'MATCH_REVOKED_TO_PENDING', reservationId: reservation.id },
        );

        try {
          const playersToNotify: User[] = [];
          if (reservation.team?.players)
            playersToNotify.push(...reservation.team.players);
          if (reservation.opponentTeam?.players)
            playersToNotify.push(...reservation.opponentTeam.players);

          for (const player of playersToNotify) {
            await this.notificationsService.create({
              userId: player.id,
              type: 'SYSTEM',
              title: 'İşletme Onayı Kaldırdı',
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
              await this.support.sendSystemMessage(
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
                const playersToNotify: User[] = [];
                if (conflict.team?.players)
                  playersToNotify.push(...conflict.team.players);

                for (const player of playersToNotify) {
                  await this.notificationsService.create({
                    userId: player.id,
                    type: 'SYSTEM',
                    title: 'Şansın Devam Ediyor!',
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
    // İşletme notu: en fazla 100 karakter (client atlansa bile korunur)
    assertNoteWithinLimit(note, 100, 'İşletme notu');

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
      throw new NotFoundException('Rezervasyon bulunamadı.');
    }

    if (!reservation.matchAnnouncementId) {
      throw new BadRequestException(
        'Bu rezervasyon bir maça/sohbete bağlı değil.',
      );
    }

    const businessName = reservation.pitch?.business?.name || 'İşletme';
    const messageContent = `{{COMMENT}} ${businessName} Mesajı:\n${note}`;

    await this.support.sendSystemMessage(
      this.dataSource.manager, // Use main manager since not in a transaction
      reservation.matchAnnouncementId,
      reservation.team,
      messageContent,
      { type: 'BUSINESS_NOTE', reservationId: reservation.id },
      true, // skipPush: aşağıdaki BUSINESS_NOTE bildirimi zaten push atıyor → çift push olmasın
    );

    try {
      const playersToNotify: User[] = [];
      if (reservation.team?.players)
        playersToNotify.push(...reservation.team.players);
      if (reservation.opponentTeam?.players)
        playersToNotify.push(...reservation.opponentTeam.players);

      for (const player of playersToNotify) {
        await this.notificationsService.create({
          userId: player.id,
          type: 'SYSTEM',
          title: `İşletmeden Mesaj: ${businessName}`,
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
        throw new ForbiddenException(
          'Rezervasyon bulunamadı veya yetkiniz yok.',
        );
      }

      // Allow cancelling APPROVED as well now (Captain cancellation)
      if (
        reservation.status !== ReservationStatus.PENDING &&
        reservation.status !== ReservationStatus.REJECTED &&
        reservation.status !== ReservationStatus.APPROVED
      ) {
        throw new BadRequestException('Bu rezervasyon iptal edilemez.');
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
        // İstanbul saatiyle formatla (istanbulDisplayParts) — timeZone'suz
        // toLocale* process TZ=UTC yüzünden 3 saat geri basar.
        const slotParts = istanbulDisplayParts(slotTime);
        const dateStr = `${slotParts.displayDateWithYear} ${slotParts.dayName}`;
        const timeStr = slotParts.time;
        const endTimeStr = istanbulDisplayParts(
          new Date(slotTime.getTime() + 60 * 60 * 1000),
        ).time;
        const businessName = reservation.pitch?.business?.name || 'İşletme';
        const pitchName = reservation.pitch?.name || 'Saha';

        await this.support.sendSystemMessage(
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
          const playersToNotify: User[] = [];
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
        await this.support.cleanupJokersOnMatchCancel(
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
      throw new ForbiddenException('Rezervasyon bulunamadı veya yetkiniz yok.');
    }

    if (reservation.status !== ReservationStatus.APPROVED) {
      throw new BadRequestException(
        'Sadece onaylanmış maçlar için iptal isteği gönderilebilir.',
      );
    }

    if (reservation.cancelRequested) {
      throw new ConflictException('Zaten bir iptal isteği gönderilmiş.');
    }

    // Update reservation
    reservation.cancelRequested = true;
    reservation.cancelRequestedByTeamId = teamId;
    await this.reservationRepository.save(reservation);

    // Notify chat
    if (reservation.matchAnnouncementId) {
      const slotTime = new Date(reservation.slotTime);
      // İstanbul saatiyle formatla (istanbulDisplayParts) — timeZone'suz
      // toLocale* process TZ=UTC yüzünden 3 saat geri basar.
      const slotParts = istanbulDisplayParts(slotTime);
      const dateStr = `${slotParts.displayDateWithYear} ${slotParts.dayName}`;
      const timeStr = slotParts.time;
      const endTimeStr = istanbulDisplayParts(
        new Date(slotTime.getTime() + 60 * 60 * 1000),
      ).time;
      const businessName = reservation.pitch?.business?.name || 'İşletme';
      const pitchName = reservation.pitch?.name || 'Saha';

      // Fetch user name
      const requestingUser = await this.userRepository.findOne({
        where: { id: userId },
      });
      const userName = requestingUser?.full_name || 'Bir kullanıcı';

      await this.support.sendSystemMessage(
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
          // İstanbul saatiyle formatla (istanbulDisplayParts) — timeZone'suz
          // toLocale* process TZ=UTC yüzünden 3 saat geri basar.
          const slotParts = istanbulDisplayParts(slotTime);
          const dateStr = slotParts.displayDate;
          const timeStr = slotParts.time;

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
      throw new ForbiddenException('Rezervasyon bulunamadı veya yetkiniz yok.');
    }

    if (!reservation.cancelRequested) {
      throw new NotFoundException('İptal isteği bulunmuyor.');
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
      // İstanbul saatiyle formatla (istanbulDisplayParts) — timeZone'suz
      // toLocale* process TZ=UTC yüzünden 3 saat geri basar.
      const slotParts = istanbulDisplayParts(slotTime);
      const dateStr = `${slotParts.displayDateWithYear} ${slotParts.dayName}`;
      const timeStr = slotParts.time;
      const endTimeStr = istanbulDisplayParts(
        new Date(slotTime.getTime() + 60 * 60 * 1000),
      ).time;
      const businessName = reservation.pitch?.business?.name || 'İşletme';
      const pitchName = reservation.pitch?.name || 'Saha';

      await this.support.sendSystemMessage(
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
          // İstanbul saatiyle formatla (istanbulDisplayParts) — timeZone'suz
          // toLocale* process TZ=UTC yüzünden 3 saat geri basar.
          const slotParts = istanbulDisplayParts(slotTime);
          const dateStr = slotParts.displayDate;
          const timeStr = slotParts.time;

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
        throw new BadRequestException(
          'Rezervasyon bulunamadı veya aktif iptal talebi yok.',
        );
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
        // İstanbul saatiyle formatla (istanbulDisplayParts) — timeZone'suz
        // toLocale* process TZ=UTC yüzünden 3 saat geri basar.
        const slotParts = istanbulDisplayParts(slotTime);
        const dateStr = `${slotParts.displayDateWithYear} ${slotParts.dayName}`;
        const timeStr = slotParts.time;
        const endTimeStr = istanbulDisplayParts(
          new Date(slotTime.getTime() + 60 * 60 * 1000),
        ).time;
        const businessName = reservation.pitch?.business?.name || 'İşletme';
        const pitchName = reservation.pitch?.name || 'Saha';

        await this.support.sendSystemMessage(
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
          const playersToNotify: User[] = [];
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
        await this.support.cleanupJokersOnMatchCancel(
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
        throw new BadRequestException(
          'Rezervasyon bulunamadı veya aktif iptal talebi yok.',
        );
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
        // İstanbul saatiyle formatla (istanbulDisplayParts) — timeZone'suz
        // toLocale* process TZ=UTC yüzünden 3 saat geri basar.
        const slotParts = istanbulDisplayParts(slotTime);
        const dateStr = `${slotParts.displayDateWithYear} ${slotParts.dayName}`;
        const timeStr = slotParts.time;
        const endTimeStr = istanbulDisplayParts(
          new Date(slotTime.getTime() + 60 * 60 * 1000),
        ).time;
        const businessName = reservation.pitch?.business?.name || 'İşletme';
        const pitchName = reservation.pitch?.name || 'Saha';

        await this.support.sendSystemMessage(
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
        await this.support.sendSystemMessage(
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
}
