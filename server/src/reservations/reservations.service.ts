import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Reservation, ReservationStatus } from './entities/reservation.entity';

@Injectable()
export class ReservationsService {
    constructor(
        @InjectRepository(Reservation)
        private reservationRepository: Repository<Reservation>,
    ) { }

    async create(createReservationDto: any) {
        const reservation = this.reservationRepository.create(createReservationDto);
        return this.reservationRepository.save(reservation);
    }

    async findAll() {
        return this.reservationRepository.find();
    }

    // Find all reservations for a specific pitch on a specific date (range)
    async findByPitchAndDate(pitchId: string, start: Date, end: Date) {
        return this.reservationRepository.createQueryBuilder('reservation')
            .leftJoinAndSelect('reservation.pitch', 'pitch')
            .leftJoinAndSelect('reservation.team', 'team')
            .leftJoinAndSelect('team.captain', 'teamCaptain')
            .leftJoinAndSelect('reservation.opponentTeam', 'opponentTeam')
            .leftJoinAndSelect('opponentTeam.captain', 'opponentCaptain')
            .where('reservation.pitchId = :pitchId', { pitchId })
            .andWhere('reservation.slotTime >= :start', { start })
            .andWhere('reservation.slotTime <= :end', { end })
            .orderBy('reservation.slotTime', 'ASC')
            .getMany();
    }

    async findPendingBySlot(pitchId: string, slotTime: Date) {
        return this.reservationRepository.find({
            where: {
                pitch: { id: pitchId },
                slotTime: slotTime,
                status: ReservationStatus.PENDING
            },
            relations: ['team']
        });
    }

    async approve(id: string) {
        // 1. Approve this reservation
        const reservation = await this.reservationRepository.findOne({
            where: { id },
            relations: ['pitch'] // Keep for now in case needed
        });

        if (!reservation) {
            throw new Error('Reservation not found');
        }

        reservation.status = ReservationStatus.APPROVED;
        await this.reservationRepository.save(reservation);

        // 2. Reject others for the same slot (use pitchId directly)
        const others = await this.reservationRepository.find({
            where: {
                pitchId: reservation.pitchId, // Use explicit column
                slotTime: reservation.slotTime,
                status: ReservationStatus.PENDING
            }
        });

        for (const other of others) {
            if (other.id !== id) { // Don't reject the one we just approved
                other.status = ReservationStatus.REJECTED;
                await this.reservationRepository.save(other);
                // TODO: Send notification
            }
        }

        return reservation;
    }

    async findByTeam(teamId: string) {
        return this.reservationRepository.find({
            where: { team: { id: teamId } },
            relations: ['pitch', 'pitch.business', 'team', 'opponentTeam'],
            order: { slotTime: 'ASC' }
        });
    }

    async cancel(id: string, teamId: string) {
        const reservation = await this.reservationRepository.findOne({
            where: { id, team: { id: teamId } },
            relations: ['team']
        });

        if (!reservation) {
            throw new Error('Reservation not found or unauthorized');
        }

        if (reservation.status !== ReservationStatus.PENDING) {
            throw new Error('Only pending reservations can be cancelled');
        }

        reservation.status = ReservationStatus.CANCELLED;
        await this.reservationRepository.save(reservation);
        return reservation;
    }

    async findByPitchAndDateRange(pitchId: string, date: string) {
        // date format: YYYY-MM-DD
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return this.reservationRepository.createQueryBuilder('reservation')
            .leftJoinAndSelect('reservation.pitch', 'pitch')
            .leftJoinAndSelect('reservation.team', 'team')
            .leftJoinAndSelect('reservation.opponentTeam', 'opponentTeam')
            .where('reservation.pitchId = :pitchId', { pitchId })
            .andWhere('reservation.slotTime >= :start', { start: startOfDay })
            .andWhere('reservation.slotTime <= :end', { end: endOfDay })
            .orderBy('reservation.slotTime', 'ASC')
            .getMany();
    }
}
