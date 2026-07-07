import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule'; // Import Cron
import { MatchAnnouncement } from './match-announcement.entity';
import { User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { assertNoteWithinLimit } from '../common/text-limit.util';
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
import { computeBoundingBox } from '../common/geo.util';

export type MarketplaceSort =
  | 'distance'
  | 'date_desc'
  | 'date_asc'
  | 'price_asc'
  | 'price_desc'
  | 'fair_play';

// Liste yanıtına eklemeli olarak gömülen hafif saha/işletme özeti — kartın
// ihtiyacı bu kadar; istemcinin ayrıca sınırsız GET /businesses çekmesini
// gereksiz kılar. Eski istemciler bilinmeyen alanı yok sayar.
export interface AnnouncementPitchSummary {
  id: string;
  name: string;
  pricePerHour: number | null;
  imageUrl: string | null;
  endTime: string | null;
  business: {
    id: string;
    name: string;
    district: string | null;
    city: string | null;
  };
}

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
    // İlan notu: en fazla 50 karakter (client atlansa bile korunur)
    assertNoteWithinLimit(data.description, 50, 'İlan notu');
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
    sort?: MarketplaceSort;
    paged?: boolean;
    geoFilter: { lat: number; lng: number; radius: number };
  }): Promise<any[] | { items: any[]; total: number; hasMore: boolean }> {
    const { lat, lng, radius } = filters.geoFilter;
    const PAGE = Math.min(filters?.limit ?? 50, 100);
    const off = filters?.offset ?? 0;
    const sort = filters?.sort ?? 'distance';
    const date = filters?.date ?? null;
    console.log(
      `🌍 Geo filter: lat=${lat}, lng=${lng}, radius=${radius}km offset=${off} sort=${sort}${date ? ` date=${date}` : ''}`,
    );

    // Aday sorgusu: bounding-box ön-filtresi (indeksli aralık) → kesin Haversine.
    // LIMIT'siz — aday küme yarıçapla sınırlı olduğundan sıralama/dilimleme
    // in-memory yapılır (BusinessService.findNearbyPaged ile aynı desen); böylece
    // fiyat/fair-play sıralamaları tüm aday küme üzerinde doğru çalışır.
    // kendi_aramizda + tarih filtreleri SQL'de: istemci filtrelemesi sayfa
    // bütünlüğünü (hasMore) bozuyordu. İşletme aktif/abonelik koşulları
    // Sahalar listesiyle parite için eklendi — askıdaki işletmenin ilanı
    // istemcide zaten kırık kart olarak kalıyordu.
    // Süresi geçenler SQL'de dışlanır ($9/$10) — eski inline deleteExpired
    // (okuma yolunda UPDATE) kaldırıldı; PENDING→EXPIRED geçişi cron'da (handleCron).
    const { dateStr: todayStr, hours, minutes } = nowInIstanbul();
    const nowTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const box = computeBoundingBox(lat, lng, radius);
    const haversine = `(6371 * acos(GREATEST(-1.0, LEAST(1.0,
                        cos(radians($1)) * cos(radians(b.latitude))
                        * cos(radians(b.longitude) - radians($2))
                        + sin(radians($1)) * sin(radians(b.latitude))))))`;
    const raw: any[] = await this.matchAnnouncementsRepository.query(
      `SELECT
                    ma.id,
                    ma.date,
                    ma.time,
                    ma.pitch_id        AS pitch_id,
                    p.name             AS pitch_name,
                    p."pricePerHour"   AS price_per_hour,
                    p."imageUrl"       AS pitch_image_url,
                    (SELECT ts."endTime" FROM time_slots ts
                      WHERE ts."pitchId" = p.id AND ts."startTime" = ma.time
                      LIMIT 1)         AS end_time,
                    b.id               AS business_id,
                    b.name             AS business_name,
                    b.district         AS business_district,
                    b.city             AS business_city,
                    t.fair_play_score  AS fair_play,
                    ${haversine} AS distance_km
                 FROM match_announcements ma
                 JOIN pitches p        ON ma.pitch_id     = p.id
                 JOIN businesses b     ON p.business_id   = b.id
                 JOIN team t           ON ma.team_id      = t.id
                 JOIN business_owner o ON o."businessId"  = b.id
                 JOIN subscriptions s  ON s."ownerId"     = o.id
                 WHERE ma.status  = 'PENDING'
                   AND ma.match_type <> 'kendi_aramizda'
                   AND ($4::text IS NULL OR ma.date = $4)
                   AND p."approvalStatus" = 'approved'
                   AND p."isActive" = true
                   AND b.status = 'active'
                   AND b."deletedAt" IS NULL
                   AND s.status IN ('active', 'trial')
                   AND b.latitude  IS NOT NULL
                   AND b.longitude IS NOT NULL
                   AND b.latitude  BETWEEN $5 AND $6
                   AND b.longitude BETWEEN $7 AND $8
                   AND (ma.date > $9 OR (ma.date = $9 AND ma.time >= $10))
                   AND ${haversine} <= $3`,
      [
        lat,
        lng,
        radius,
        date,
        box.minLat,
        box.maxLat,
        box.minLng,
        box.maxLng,
        todayStr,
        nowTime,
      ],
    );

    if (raw.length === 0) {
      console.log(`📢 No announcements within ${radius}km`);
      return filters?.paged ? { items: [], total: 0, hasMore: false } : [];
    }

    // In-memory sıralama (findNearbyPaged deseni). Eşit değerlerde STABİL
    // ikincil anahtar (id): sayfalar arası öğe kayması/duplikasyonu olmasın
    // (fiyat tekrarı + fair-play default 5.0 → eşitlik sık).
    const price = (r: any) => Number(r.price_per_hour ?? 0);
    const primary = (a: any, b: any) => {
      switch (sort) {
        case 'date_asc':
          return (a.date + a.time).localeCompare(b.date + b.time);
        case 'date_desc':
          return (b.date + b.time).localeCompare(a.date + a.time);
        case 'price_asc':
          return price(a) - price(b);
        case 'price_desc':
          return price(b) - price(a);
        case 'fair_play':
          return Number(b.fair_play ?? 0) - Number(a.fair_play ?? 0);
        case 'distance':
        default:
          return Number(a.distance_km) - Number(b.distance_km);
      }
    };
    const sorted = raw.sort(
      (a, b) => primary(a, b) || String(a.id).localeCompare(String(b.id)),
    );
    const total = sorted.length;
    const pageRows = sorted.slice(off, off + PAGE);
    const pageIds = pageRows.map((r) => r.id);
    const rowById = new Map<string, any>(pageRows.map((r) => [r.id, r]));

    if (pageIds.length === 0) {
      return filters?.paged
        ? { items: [], total, hasMore: off + PAGE < total }
        : [];
    }

    // Kırpılmış hydrate: team SKALER satırı yeter (kart: isim/logo/seviye/
    // fair-play/renkler). captain+players join'leri kaldırıldı — liste yanıtını
    // şişiriyordu ve istemci hiç okumuyor (findByPitch'teki emsalle aynı).
    const announcements = await this.matchAnnouncementsRepository
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.team', 'team')
      .where('announcement.id IN (:...ids)', { ids: pageIds })
      .andWhere('announcement.status = :status', { status: 'PENDING' })
      .getMany();

    // İlan başına bekleyen meydan okuma sayısı — yalnız sayfa id'leri üzerinde.
    const challengeCounts: { id: string; cnt: number }[] =
      await this.matchAnnouncementsRepository.query(
        `SELECT "toMatchId" AS id, COUNT(*)::int AS cnt
           FROM challenges
          WHERE "toMatchId" = ANY($1) AND status = 'PENDING'
          GROUP BY "toMatchId"`,
        [pageIds],
      );
    const challengeCountMap = new Map(
      challengeCounts.map((c) => [c.id, c.cnt]),
    );

    // IN sorgusu sırasız döner — sıralamayı pageIds'in sırası belirler (eski
    // koddaki mesafe re-sort'u fiyat/tarih sıralamalarını bozardı).
    const orderIndex = new Map(pageIds.map((id, i) => [id, i]));
    const items = announcements
      .map((a) => {
        const row = rowById.get(a.id);
        const summary: AnnouncementPitchSummary | null = row
          ? {
              id: row.pitch_id,
              name: row.pitch_name,
              pricePerHour:
                row.price_per_hour != null ? Number(row.price_per_hour) : null,
              imageUrl: row.pitch_image_url ?? null,
              endTime: row.end_time ?? null,
              business: {
                id: row.business_id,
                name: row.business_name,
                district: row.business_district,
                city: row.business_city,
              },
            }
          : null;
        return {
          ...a,
          distanceKm: row ? parseFloat(Number(row.distance_km).toFixed(1)) : 0,
          pendingChallengeCount: challengeCountMap.get(a.id) ?? 0,
          pitchSummary: summary,
        };
      })
      .sort(
        (a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0),
      );

    console.log(
      `📢 Found ${total} announcements within ${radius}km (sayfa ${off}-${off + pageRows.length}, sort=${sort})`,
    );
    return filters?.paged
      ? { items, total, hasMore: off + PAGE < total }
      : items;
  }

  // Run every hour to check for expired announcements
  // Using EVERY_MINUTE for testing purposes if needed, but EVERY_HOUR is safer for production unless real-time is critical.
  @Cron(CronExpression.EVERY_HOUR, { name: 'cleanup_expired_announcements' })
  async handleCron() {
    console.log('⏰ Running cleanup cron job...');

    // İstanbul yerel takvim günü/saati — process.env.TZ'den bağımsız, sabit
    // +3 ofsetle hesaplanır (bkz. common/turkey-time.util.ts).
    const { dateStr: todayStr, hours, minutes } = nowInIstanbul();
    const nowTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    // Süresi geçenler SQL'de filtrelenir — tüm PENDING'leri relation'larla
    // yüklemek yerine yalnız işlem görecek satırlar gelir. Okuma yolları
    // (findAll/findByPitch) süresi geçenleri zaten WHERE ile dışladığından
    // buradaki geçiş yalnız bildirim + durum hijyeni içindir.
    const expired = await this.matchAnnouncementsRepository
      .createQueryBuilder('ma')
      .leftJoinAndSelect('ma.team', 'team')
      .leftJoinAndSelect('team.captain', 'captain')
      .where('ma.status = :status', { status: 'PENDING' })
      .andWhere('(ma.date < :today OR (ma.date = :today AND ma.time < :now))', {
        today: todayStr,
        now: nowTime,
      })
      .getMany();

    for (const announcement of expired) {
      console.log(
        `🗑️ Expired announcement found: ${announcement.id} (Date: ${announcement.date}, Time: ${announcement.time})`,
      );

      // Notify Captain
      if (announcement.team?.captain) {
        try {
          // Cast captain to any to avoid type issues if captainId vs object not perfectly typed in entity
          const captainId =
            (announcement.team.captain as any).id || announcement.team.captain;

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
    }

    if (expired.length > 0) {
      const ids = expired.map((a) => a.id);
      // Durum geçişleri toplu (§26 In() deseni) — ilan başına save/update yok.
      await this.matchAnnouncementsRepository.update(
        { id: In(ids) },
        { status: 'EXPIRED' },
      );
      // Bağlı reservation hâlâ PENDING'de kalmasın — saha takvimi sonsuza
      // kadar "Onay Bekliyor" göstermesin diye onu da süresi geçmiş yap.
      await this.reservationRepository.update(
        { matchAnnouncementId: In(ids), status: ReservationStatus.PENDING },
        { status: ReservationStatus.EXPIRED },
      );
      console.log(`✅ ${ids.length} announcement(s) marked as EXPIRED (batch).`);
    }

    // İstek/davet "ölü artıkları"nı temizle (geçmiş maçlar) — birikmeyi önler.
    await this.cleanupStaleRequests();
  }

  // Geçmiş (İstanbul date+time < now) maçlara ait, hiç işlem görmemiş istek/davet
  // artıklarını hard-delete eder. Güvenli: challenges.id/notifications'a bağlı FK YOK;
  // ACCEPTED challenge'a DOKUNULMAZ (oynanmış maç → veri reservation'da korunur);
  // puanlama/geçmiş maç reservation'dan beslenir (challenge okumaz). Bkz. plan raporu.
  private async cleanupStaleRequests(): Promise<void> {
    const { dateStr: todayStr, hours, minutes } = nowInIstanbul();
    const nowTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const em = this.matchAnnouncementsRepository.manager;
    const past = `(ma.date < $1 OR (ma.date = $1 AND ma.time < $2))`;
    const params = [todayStr, nowTime];

    try {
      // 1. Geçmiş maça giden PENDING/REJECTED challenge'ların CHALLENGE bildirimini sil
      await em.query(
        `DELETE FROM notifications n
           WHERE n.type = 'CHALLENGE'
             AND n."relatedId" IN (
               SELECT c.id::text FROM challenges c
               JOIN match_announcements ma ON ma.id = c."toMatchId"
               WHERE c.status IN ('PENDING','REJECTED') AND ${past})`,
        params,
      );
      // 2. Challenge'ları sil (yalnız PENDING/REJECTED; ACCEPTED korunur)
      await em.query(
        `DELETE FROM challenges c
           USING match_announcements ma
           WHERE ma.id = c."toMatchId"
             AND c.status IN ('PENDING','REJECTED') AND ${past}`,
        params,
      );
      // 3. Geçmiş maça ait bekleyen JOKER_INVITE bildirimlerini sil
      await em.query(
        `DELETE FROM notifications n
           USING match_announcements ma
           WHERE ma.id::text = n."relatedId"
             AND n.type = 'JOKER_INVITE' AND ${past}`,
        params,
      );
    } catch (err) {
      console.error('❌ cleanupStaleRequests başarısız:', err);
    }
  }

  async findByPitch(pitchId: string): Promise<MatchAnnouncement[]> {
    // Kart yalnız takım özetini (logo/ad/level/fairPlay) gösterir; TAM oyuncu kadrosu
    // burada YÜKLENMEZ — takım-detay modalı açılınca GET /teams/:id ile lazy çekilir.
    // (team + captain tekil satır; players[] koleksiyonu satır çarpımı + payload şişmesi yapıyordu.)
    // Süresi geçenler WHERE ile dışlanır (findAll paritesi) — cron geçişine bağımlı değil.
    const { dateStr: today, hours, minutes } = nowInIstanbul();
    const now = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const announcements = await this.matchAnnouncementsRepository
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.team', 'team')
      .leftJoinAndSelect('team.captain', 'captain')
      .where('announcement.pitchId = :pitchId', { pitchId })
      .andWhere('announcement.status = :status', { status: 'PENDING' })
      .andWhere(
        '(announcement.date > :today OR (announcement.date = :today AND announcement.time >= :now))',
        { today, now },
      )
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

    // Bu ilana bağlı sohbet kanalları (maç grubu + joker müzakere) — ilan silinmeden
    // ÖNCE temizlenir ki Operasyon Merkezi'nde öksüz "durumsuz maç" sohbeti kalmasın.
    // chat_channels.relatedMatchId = ilan id'si (varchar); cascade participants+messages siler.
    await this.matchAnnouncementsRepository.manager.query(
      `DELETE FROM "chat_channels"
         WHERE type IN ('MATCH_GROUP','JOKER_NEGOTIATION') AND "relatedMatchId" = $1`,
      [id],
    );

    await this.matchAnnouncementsRepository.remove(announcement);
  }
}
