import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Reservation, ReservationStatus } from '../entities/reservation.entity';
import { TimeSlot } from '../../pitches/entities/time-slot.entity';
import {
  addIstanbulDays,
  istanbulDateTimeToUtc,
  istanbulDisplayParts,
} from '../../common/turkey-time.util';

// Müsaitlik ızgarasında gösterilen abone takım özeti (kişisel veri içermez).
export interface SubscriberTeamSummary {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

type SubscriberEnrichedReservation = Reservation & {
  subscriberTeam?: SubscriberTeamSummary;
  subscriberOpponentTeam?: SubscriberTeamSummary | null;
};

interface SubscriberClosureRow {
  id: string;
  teamId: string | null;
  teamName: string;
  teamLogoUrl: string | null;
  teamPrimaryColor: string | null;
  teamSecondaryColor: string | null;
  oppId: string | null;
  oppName: string;
  oppLogoUrl: string | null;
  oppPrimaryColor: string | null;
  oppSecondaryColor: string | null;
}

// Saf okuma sorguları (mutasyon/transaction yok).
// Bağımlılıklar: reservationRepository + timeSlotRepository (upcoming endTime eşlemesi).
@Injectable()
export class ReservationQueryService {
  constructor(
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    @InjectRepository(TimeSlot)
    private timeSlotRepository: Repository<TimeSlot>,
  ) {}

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

  async findByTeam(teamId: string) {
    return this.reservationRepository.find({
      where: { team: { id: teamId } },
      relations: ['pitch', 'pitch.business', 'team', 'opponentTeam'],
      order: { slotTime: 'ASC' },
    });
  }

  async findUpcomingByTeam(teamId: string) {
    const now = new Date();
    const rows = await this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoin('reservation.pitch', 'pitch')
      .leftJoin('pitch.business', 'business')
      .leftJoin('reservation.team', 'team')
      .leftJoin('reservation.opponentTeam', 'opponentTeam')
      .select([
        'reservation.id',
        'reservation.slotTime',
        'reservation.status',
        'pitch.id',
        'pitch.name',
        'business.id',
        'business.name',
        'business.latitude',
        'business.longitude',
        'business.address',
        'business.district',
        'team.id',
        'team.name',
        'team.logoUrl',
        'team.primaryColor',
        'team.secondaryColor',
        'team.level',
        'opponentTeam.id',
        'opponentTeam.name',
        'opponentTeam.logoUrl',
        'opponentTeam.primaryColor',
        'opponentTeam.secondaryColor',
        'opponentTeam.level',
      ])
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

    // Bitiş saati: sahanın TÜM slot şablonunu join'lemek yerine (eski hali —
    // saha başına 7-19 satır payload) yalnız maç saatine denk düşen slot bulunur.
    // +1 saat VARSAYILAMAZ: canlı veride 2 saatlik (12:00→14:00) ve gece aşan
    // (23:00→00:00) slotlar var. Saat eşlemesi İstanbul TZ'de yapılır (§29 —
    // çıplak toLocale* yasak). Geriye uyumluluk: eski client
    // pitch.timeSlots.find(...) kullanır → eşleşen slot 1 elemanlı dizi olarak
    // bırakılır; yeni client üst-düzey endTime alanını okur.
    const pitchIds = [
      ...new Set(rows.map((r) => r.pitch?.id).filter(Boolean)),
    ] as string[];
    const slots = pitchIds.length
      ? await this.timeSlotRepository.find({
          where: { pitchId: In(pitchIds) },
        })
      : [];
    const slotsByPitch = new Map<string, TimeSlot[]>();
    for (const s of slots) {
      const list = slotsByPitch.get(s.pitchId) ?? [];
      list.push(s);
      slotsByPitch.set(s.pitchId, list);
    }

    return rows.map((r) => {
      const startHHmm = istanbulDisplayParts(r.slotTime).time;
      const matched =
        (r.pitch?.id ? slotsByPitch.get(r.pitch.id) : undefined)?.find(
          (s) => s.startTime === startHHmm,
        ) ?? null;
      if (r.pitch) r.pitch.timeSlots = matched ? [matched] : [];
      return { ...r, endTime: matched?.endTime ?? null };
    });
  }

  async findByPitchAndDateRange(pitchId: string, date: string) {
    // date format: YYYY-MM-DD (İstanbul takvim günü)
    const startOfDay = istanbulDateTimeToUtc(date, '00:00');
    const endOfDay = istanbulDateTimeToUtc(addIstanbulDays(date, 1), '00:00');

    const reservations = await this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.pitch', 'pitch')
      .leftJoinAndSelect('reservation.team', 'team')
      .leftJoinAndSelect('reservation.opponentTeam', 'opponentTeam')
      .where('reservation.pitchId = :pitchId', { pitchId })
      .andWhere('reservation.slotTime >= :start', { start: startOfDay })
      .andWhere('reservation.slotTime < :end', { end: endOfDay })
      .orderBy('reservation.slotTime', 'ASC')
      .getMany();

    await this.attachSubscriberTeams(reservations);
    return reservations;
  }

  // Sabit kapatma bloklarına (teamsiz DIRECT rezervasyon) atanmış abone takımı
  // EKLEMELİ olarak iliştirir: subscriberTeam / subscriberOpponentTeam.
  //
  // Bilinçli olarak reservation.team'e YAZILMAZ — eski client'lar team dolu
  // görürse bunu normal bir dolu maç sanar ve "İşletme Tarafından Kapalı"
  // ekranını kaybederdi (§85 eski-client uyumu). Yeni alanları eski client
  // yok sayar, davranışı birebir korunur.
  //
  // Kaptan/telefon gibi kişisel veri BURADA VERİLMEZ — bu uç giriş yapmış
  // herkese açık (müsaitlik ızgarası); yalnız takım kimliği + görsel kimlik.
  private async attachSubscriberTeams(
    reservations: SubscriberEnrichedReservation[],
  ): Promise<void> {
    const closureIds = Array.from(
      new Set(
        reservations
          .map((r) => r.recurringClosureId)
          .filter((id): id is string => !!id),
      ),
    );
    if (!closureIds.length) return;

    const rows: SubscriberClosureRow[] =
      await this.reservationRepository.manager.query(
        `
          SELECT rc.id,
                 t.id AS "teamId", t.name AS "teamName", t.logo_url AS "teamLogoUrl",
                 t.primary_color AS "teamPrimaryColor", t.secondary_color AS "teamSecondaryColor",
                 o.id AS "oppId", o.name AS "oppName", o.logo_url AS "oppLogoUrl",
                 o.primary_color AS "oppPrimaryColor", o.secondary_color AS "oppSecondaryColor"
          FROM recurring_closures rc
          LEFT JOIN team t ON t.id = rc."teamId"
          LEFT JOIN team o ON o.id = rc."opponentTeamId"
          WHERE rc.id = ANY($1) AND rc."teamId" IS NOT NULL
        `,
        [closureIds],
      );
    if (!rows.length) return;

    const byClosure = new Map<string, SubscriberClosureRow>();
    for (const row of rows) byClosure.set(row.id, row);

    for (const reservation of reservations) {
      const row = reservation.recurringClosureId
        ? byClosure.get(reservation.recurringClosureId)
        : undefined;
      if (!row?.teamId) continue;
      reservation.subscriberTeam = {
        id: row.teamId,
        name: row.teamName,
        logoUrl: row.teamLogoUrl,
        primaryColor: row.teamPrimaryColor,
        secondaryColor: row.teamSecondaryColor,
      };
      reservation.subscriberOpponentTeam = row.oppId
        ? {
            id: row.oppId,
            name: row.oppName,
            logoUrl: row.oppLogoUrl,
            primaryColor: row.oppPrimaryColor,
            secondaryColor: row.oppSecondaryColor,
          }
        : null;
    }
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
