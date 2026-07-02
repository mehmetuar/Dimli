import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule'; // Import Cron
import { MatchAnnouncement } from './match-announcement.entity';
import { User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ReservationsService } from '../reservations/reservations.service';
import {
  Reservation,
  ReservationStatus,
} from '../reservations/entities/reservation.entity';
import { ChatService } from '../chat/chat.service';
import { Pitch } from '../pitches/entities/pitch.entity';
import {
  istanbulDateTimeToUtc,
  isPitchClosedOnDate,
  nowInIstanbul,
} from '../common/turkey-time.util';

@Injectable()
export class MatchAnnouncementsService {
  constructor(
    @InjectRepository(MatchAnnouncement)
    private matchAnnouncementsRepository: Repository<MatchAnnouncement>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    private notificationsService: NotificationsService,
    private reservationsService: ReservationsService,
    private chatService: ChatService,
  ) {}

  async create(
    data: Partial<MatchAnnouncement>,
    userId: string,
  ): Promise<MatchAnnouncement & { channelId: string | null }> {
    // Ensure user belongs to a team
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['team'],
    });

    console.log('🔍 Creating announcement - User ID:', userId);
    console.log('👤 User found:', { id: user?.id, username: user?.username });
    console.log('🏆 User team:', {
      id: user?.team?.id,
      name: user?.team?.name,
    });

    if (!user || !user.team) {
      throw new BadRequestException(
        'Maç ilanı oluşturmak için bir takımda olmalısınız.',
      );
    }

    // Saha onaylı ve aktif olmalı
    const pitchForCheck =
      await this.matchAnnouncementsRepository.manager.findOne(Pitch, {
        where: { id: data.pitchId },
      });
    if (
      !pitchForCheck ||
      pitchForCheck.approvalStatus !== 'approved' ||
      !pitchForCheck.isActive
    ) {
      throw new HttpException(
        'Bu saha şu anda ilana açık değil.',
        HttpStatus.FORBIDDEN,
      );
    }

    console.log('✅ Using teamId:', user.team.id);

    // Check for duplicate announcement (same team, pitch, time, date)
    const existingAnnouncement =
      await this.matchAnnouncementsRepository.findOne({
        where: {
          teamId: user.team.id,
          pitchId: data.pitchId,
          time: data.time,
          date: data.date,
          status: 'PENDING',
        },
      });

    if (existingAnnouncement) {
      throw new HttpException(
        'Bu saat için zaten aktif bir ilanınız var',
        HttpStatus.CONFLICT,
      );
    }

    // rakip_araniyor: max 8 PENDING ilan (CONFIRMED/kesinlesti maçlar limite dahil değil)
    if (!data.matchType || data.matchType === 'rakip_araniyor') {
      const rakipCount = await this.matchAnnouncementsRepository.count({
        where: {
          teamId: user.team.id,
          matchType: 'rakip_araniyor',
          status: 'PENDING',
        },
      });
      if (rakipCount >= 8) {
        throw new HttpException(
          'Aynı anda en fazla 8 aktif "Rakip Aranıyor" ilanı oluşturabilirsiniz. Mevcut ilanlarınızdan birini iptal ederek yeni ilan açabilirsiniz.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // kendi_aramizda (onay_bekliyor): max 10 PENDING
    if (data.matchType === 'kendi_aramizda') {
      const kendiCount = await this.matchAnnouncementsRepository.count({
        where: {
          teamId: user.team.id,
          matchType: 'kendi_aramizda',
          status: 'PENDING',
        },
      });
      if (kendiCount >= 10) {
        throw new HttpException(
          'Aynı anda en fazla 10 onay bekleyen "Kendi Aramızda" maçınız olabilir. Bir maç onaylandıktan veya iptal edildikten sonra yeni ilan oluşturabilirsiniz.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    // Kesinleşmiş (CONFIRMED) maçlar herhangi bir limite dahil değildir.

    // Validate date and time - 🆕 IMPROVED: Reject past times strictly
    if (!data.date || !data.time) {
      throw new HttpException(
        'Tarih ve saat gereklidir',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Saha o tarihte (haftalık sürekli kapatma veya genel pasiflik nedeniyle)
    // kapalıysa ilan oluşturulamaz — PitchSchedule.tsx'teki müşteri tarafı
    // kontrolün sunucu tarafı eşdeğeri.
    if (isPitchClosedOnDate(pitchForCheck, data.date)) {
      throw new HttpException(
        `Bu saha ${data.date} tarihinde kapalı, ilan oluşturamazsınız.`,
        HttpStatus.FORBIDDEN,
      );
    }

    const now = new Date();

    // data.date/data.time, kullanıcının uygulamada seçtiği İstanbul yerel
    // saatini taşır — process.env.TZ'den bağımsız, sabit +3 ofsetle doğru
    // mutlak ana çevriliyor (bkz. common/turkey-time.util.ts).
    const slotDateTime = istanbulDateTimeToUtc(data.date, data.time);

    // 🆕 Strictly check if the slot time is in the past
    if (slotDateTime < now) {
      throw new HttpException(
        'Geçmiş bir saat için ilan oluşturamazsınız. Lütfen gelecek bir tarih ve saat seçin.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 🆕 Check maximum date - 30 days in the future
    const maxAllowedDate = new Date(now);
    maxAllowedDate.setDate(maxAllowedDate.getDate() + 30);

    if (slotDateTime > maxAllowedDate) {
      throw new HttpException(
        'En fazla 30 gün ilerisi için ilan oluşturabilirsiniz.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Kesinleşmiş maç saati çakışma kontrolü
    const conflictingMatch =
      await this.reservationsService.hasConflictingApprovedMatch(
        user.team.id,
        slotDateTime,
      );
    if (conflictingMatch) {
      throw new HttpException(
        'Bu saatte zaten kesinleşmiş bir maçınız var. Çakışan saatler için ilan oluşturamazsınız.',
        HttpStatus.CONFLICT,
      );
    }

    // Slot kapalı/dolu mu? (sabit/manuel kapatma veya başka takımca onaylı maç) —
    // ilan kaydedilmeden ÖNCE kontrol et; kendi_aramizda rezervasyonu try/catch ile
    // yutulduğundan, asıl engel burada olmalı (kullanıcı net hatayı burada görür).
    await this.reservationsService.assertSlotAvailable(
      data.pitchId as string,
      slotDateTime,
    );

    // Optional: Also ensure a minimum buffer (e.g., at least 15 minutes from now)
    // const minAllowedTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 min buffer
    // if (announcementDate < minAllowedTime) {
    //     throw new HttpException(
    //         'İlan en az 15 dakika sonrası için oluşturulmalıdır',
    //         HttpStatus.BAD_REQUEST
    //     );
    // }

    const announcement = this.matchAnnouncementsRepository.create({
      ...data,
      teamId: user.team.id,
      status: 'PENDING',
    });

    const saved = await this.matchAnnouncementsRepository.save(announcement);
    console.log('💾 Saved announcement:', {
      id: saved.id,
      teamId: saved.teamId,
      matchType: saved.matchType,
    });

    let channelId: string | null = null;

    if (saved.matchType === 'kendi_aramizda') {
      console.log(
        '⚽ Kendi aramızda match detected. Creating chat and pending reservation...',
      );
      try {
        // For "Kendi Aramızda" matches, all team members should be in the chat
        const players = await this.usersRepository.find({
          where: { teamId: user.team.id },
        });

        const participants = players && players.length > 0 ? players : [user];

        // Create single-team chat
        const channel = await this.chatService.createChannel(
          'MATCH_GROUP',
          `${user.team.name} (Kendi Aramızda)`,
          participants, // Add all team members
          saved.id,
        );

        channelId = channel.id;

        // Load pitch with business and timeSlots for detailed message
        const pitchData =
          await this.matchAnnouncementsRepository.manager.findOne(Pitch, {
            where: { id: saved.pitchId },
            relations: ['business', 'timeSlots'],
          });

        const businessName = pitchData?.business?.name || 'İşletme';
        const pitchName = pitchData?.name || 'Saha';

        // Format date with day name — slotDateTime artık doğru mutlak an
        // tutuyor, görüntülemede de açıkça İstanbul saatine çevrilmeli
        // (process saat dilimi UTC, örtük yerel saat artık İstanbul değil).
        const dayName = slotDateTime.toLocaleDateString('tr-TR', {
          weekday: 'long',
          timeZone: 'Europe/Istanbul',
        });
        const formattedDate = slotDateTime.toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'Europe/Istanbul',
        });

        // Calculate end time from pitch time slots or default +1 hour
        let endTimeStr = '';
        const timeSlots = pitchData?.timeSlots;
        if (timeSlots && timeSlots.length > 0) {
          const matchingSlot = timeSlots.find(
            (slot) => slot.startTime === data.time,
          );
          if (matchingSlot) {
            endTimeStr = matchingSlot.endTime;
          }
        }
        if (!endTimeStr) {
          const endTime = new Date(slotDateTime.getTime() + 60 * 60 * 1000);
          endTimeStr = endTime.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Istanbul',
          });
        }

        await this.chatService.sendMessage(
          channel.id,
          null,
          `Saha isteği gönderildi! {{CLIPBOARD}}\n\n` +
            `{{STADIUM}} ${businessName}\n` +
            `{{PIN}} ${pitchName}\n` +
            `{{CALENDAR}} ${formattedDate} ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}\n` +
            `{{CLOCK}} ${data.time} - ${endTimeStr}\n\n` +
            `İşletme onayladığında sahanız kesinleşecektir.\nOnay durumunu buradan takip edebilirsiniz.\n\nLütfen işletmeyi arayıp sahanızı kesinleştiriniz.\nYerinizi kapabilirler.`,
          true,
        );

        // Create pending reservation
        await this.reservationsService.create({
          pitchId: saved.pitchId,
          teamId: user.team.id,
          slotTime: slotDateTime,
          type: 'MATCH',
          matchAnnouncementId: saved.id,
        });
        console.log(
          '✅ Pending reservation created successfully for Kendi Aramızda match.',
        );
      } catch (error) {
        console.error(
          '❌ Failed to create auto-reservation or chat for Kendi Aramızda:',
          error,
        );
      }
    }

    return { ...saved, channelId };
  }

  async findAll(filters: {
    date?: string;
    pitchId?: string;
    offset?: number;
    limit?: number;
    geoFilter: { lat: number; lng: number; radius: number };
  }): Promise<(MatchAnnouncement & { distanceKm?: number })[]> {
    // Clean up expired announcements first
    await this.deleteExpired();

    const { lat, lng, radius } = filters.geoFilter;
    const PAGE = Math.min(filters?.limit ?? 50, 100);
    const off = filters?.offset ?? 0;
    console.log(
      `🌍 Geo filter: lat=${lat}, lng=${lng}, radius=${radius}km offset=${off}`,
    );

    // Raw SQL with Haversine formula — joins through pitch → business
    const raw: any[] = await this.matchAnnouncementsRepository.query(
      `SELECT
                    ma.*,
                    (6371 * acos(
                        cos(radians($1)) * cos(radians(b.latitude))
                        * cos(radians(b.longitude) - radians($2))
                        + sin(radians($1)) * sin(radians(b.latitude))
                    )) AS distance_km
                 FROM match_announcements ma
                 JOIN pitches p      ON ma.pitch_id    = p.id
                 JOIN businesses b   ON p.business_id  = b.id
                 WHERE ma.status  = 'PENDING'
                   AND p."approvalStatus" = 'approved'
                   AND p."isActive" = true
                   AND b.latitude  IS NOT NULL
                   AND b.longitude IS NOT NULL
                   AND (
                     6371 * acos(
                         cos(radians($1)) * cos(radians(b.latitude))
                         * cos(radians(b.longitude) - radians($2))
                         + sin(radians($1)) * sin(radians(b.latitude))
                     )
                   ) <= $3
                 ORDER BY distance_km ASC
                 LIMIT $4 OFFSET $5`,
      [lat, lng, radius, PAGE, off],
    );

    if (raw.length === 0) {
      console.log(`📢 No announcements within ${radius}km`);
      return [];
    }

    // Fetch the full entity rows (with relations) for matched ids
    const ids = raw.map((r) => r.id);
    const distanceMap = new Map<string, number>(
      raw.map((r) => [r.id, parseFloat(Number(r.distance_km).toFixed(1))]),
    );

    const announcements = await this.matchAnnouncementsRepository
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.team', 'team')
      .leftJoinAndSelect('team.captain', 'captain')
      .leftJoinAndSelect('team.players', 'players')
      .where('announcement.id IN (:...ids)', { ids })
      .andWhere('announcement.status = :status', { status: 'PENDING' })
      .getMany();

    // Attach distanceKm and re-sort by distance
    const result = announcements
      .map((a) => ({ ...a, distanceKm: distanceMap.get(a.id) ?? 0 }))
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

    console.log(`📢 Found ${result.length} announcements within ${radius}km`);
    return result;
  }

  // Run every hour to check for expired announcements
  // Using EVERY_MINUTE for testing purposes if needed, but EVERY_HOUR is safer for production unless real-time is critical.
  @Cron(CronExpression.EVERY_HOUR, { name: 'cleanup_expired_announcements' })
  async handleCron() {
    console.log('⏰ Running cleanup cron job...');

    // İstanbul yerel takvim günü/saati — process.env.TZ'den bağımsız, sabit
    // +3 ofsetle hesaplanır (bkz. common/turkey-time.util.ts).
    const {
      dateStr: todayStr,
      hours: currentHour,
      minutes: currentMinute,
    } = nowInIstanbul();

    // 1. Find all PENDING announcements
    const announcements = await this.matchAnnouncementsRepository.find({
      where: { status: 'PENDING' },
      relations: ['team', 'team.captain'], // Need captain to notify
    });

    for (const announcement of announcements) {
      let isExpired = false;

      // Check if date is in the past
      if (announcement.date < todayStr) {
        isExpired = true;
      }
      // Check if date is today but time has passed (minute-accurate)
      else if (announcement.date === todayStr) {
        const [announcementHour, announcementMin = 0] = (
          announcement.time || '00:00'
        )
          .split(':')
          .map(Number);
        const announcementTotalMin = announcementHour * 60 + announcementMin;
        const currentTotalMin = currentHour * 60 + currentMinute;
        if (announcementTotalMin < currentTotalMin) {
          isExpired = true;
        }
      }

      if (isExpired) {
        console.log(
          `🗑️ Expired announcement found: ${announcement.id} (Date: ${announcement.date}, Time: ${announcement.time})`,
        );

        // Notify Captain
        if (announcement.team?.captain) {
          try {
            // Cast captain to any to avoid type issues if captainId vs object not perfectly typed in entity
            const captainId =
              (announcement.team.captain as any).id ||
              announcement.team.captain;

            await this.notificationsService.create({
              userId: captainId,
              type: 'SYSTEM',
              read: false,
              message:
                'Maç ilanınızın tarihi geçti. Yeni bir maç oluşturmaya ne dersiniz?',
              metadata: {
                type: 'ANNOUNCEMENT_EXPIRED',
                announcementId: announcement.id,
              },
            });
            console.log(`🔔 Notification sent to captain: ${captainId}`);
          } catch (err) {
            console.error('❌ Failed to send notification', err);
          }
        }

        // Mark Expired instead of Delete
        announcement.status = 'EXPIRED';
        await this.matchAnnouncementsRepository.save(announcement);
        console.log('✅ Announcement marked as EXPIRED.');

        // Bağlı reservation hâlâ PENDING'de kalmasın — saha takvimi sonsuza
        // kadar "Onay Bekliyor" göstermesin diye onu da süresi geçmiş yap.
        await this.reservationRepository.update(
          {
            matchAnnouncementId: announcement.id,
            status: ReservationStatus.PENDING,
          },
          { status: ReservationStatus.EXPIRED },
        );
      }
    }
  }

  private async deleteExpired(): Promise<void> {
    const { dateStr: todayStr, hours, minutes } = nowInIstanbul();
    const currentTimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    // Geçmiş günlerin ilanlarını expire et
    await this.matchAnnouncementsRepository
      .createQueryBuilder()
      .update(MatchAnnouncement)
      .set({ status: 'EXPIRED' })
      .where('date < :today', { today: todayStr })
      .andWhere('status = :status', { status: 'PENDING' })
      .execute();

    // Bugünün geçmiş saatli ilanlarını expire et (HH:MM string karşılaştırması doğru çalışır)
    await this.matchAnnouncementsRepository
      .createQueryBuilder()
      .update(MatchAnnouncement)
      .set({ status: 'EXPIRED' })
      .where('date = :today', { today: todayStr })
      .andWhere('time < :currentTime', { currentTime: currentTimeStr })
      .andWhere('status = :status', { status: 'PENDING' })
      .execute();
  }

  async findByPitch(pitchId: string): Promise<MatchAnnouncement[]> {
    // Kart yalnız takım özetini (logo/ad/level/fairPlay) gösterir; TAM oyuncu kadrosu
    // burada YÜKLENMEZ — takım-detay modalı açılınca GET /teams/:id ile lazy çekilir.
    // (team + captain tekil satır; players[] koleksiyonu satır çarpımı + payload şişmesi yapıyordu.)
    const announcements = await this.matchAnnouncementsRepository
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.team', 'team')
      .leftJoinAndSelect('team.captain', 'captain')
      .where('announcement.pitchId = :pitchId', { pitchId })
      .andWhere('announcement.status = :status', { status: 'PENDING' })
      .orderBy('announcement.date', 'ASC')
      .addOrderBy('announcement.time', 'ASC')
      .getMany();

    console.log(
      `📍 Found ${announcements.length} announcements for pitch ${pitchId}`,
    );

    return announcements;
  }

  async delete(id: string, userId: string): Promise<void> {
    const announcement = await this.matchAnnouncementsRepository.findOne({
      where: { id },
      relations: ['team'],
    });

    if (!announcement) {
      throw new HttpException('İlan bulunamadı', HttpStatus.NOT_FOUND);
    }

    // Verify ownership (user must be in the team that created the announcement)
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['team'],
    });

    if (!user?.team || user.team.id !== announcement.teamId) {
      throw new HttpException(
        'Bu ilanı silme yetkiniz yok',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.matchAnnouncementsRepository.remove(announcement);
  }
}
