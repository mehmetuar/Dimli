import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Reservation, ReservationStatus } from '../entities/reservation.entity';
import {
  addIstanbulDays,
  istanbulDateTimeToUtc,
} from '../../common/turkey-time.util';

// Saf okuma sorguları (mutasyon/transaction yok). reservationRepository dışında bağımlılığı yok.
@Injectable()
export class ReservationQueryService {
  constructor(
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
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
    return this.reservationRepository
      .createQueryBuilder('reservation')
      .leftJoin('reservation.pitch', 'pitch')
      .leftJoin('pitch.business', 'business')
      .leftJoin('pitch.timeSlots', 'timeSlots')
      .leftJoin('reservation.team', 'team')
      .leftJoin('reservation.opponentTeam', 'opponentTeam')
      .select([
        'reservation.id',
        'reservation.slotTime',
        'reservation.status',
        'pitch.id',
        'pitch.name',
        'timeSlots.startTime',
        'timeSlots.endTime',
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
