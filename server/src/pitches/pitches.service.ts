import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Pitch } from './entities/pitch.entity';
import { TimeSlot } from './entities/time-slot.entity';
import { Reservation, ReservationStatus } from '../reservations/entities/reservation.entity';
import { PitchChangeRequest } from './entities/pitch-change-request.entity';

@Injectable()
export class PitchesService {
    constructor(
        @InjectRepository(Pitch)
        private pitchesRepository: Repository<Pitch>,
        @InjectRepository(TimeSlot)
        private timeSlotRepository: Repository<TimeSlot>,
        @InjectRepository(Reservation)
        private reservationRepository: Repository<Reservation>,
        @InjectRepository(PitchChangeRequest)
        private changeRequestRepository: Repository<PitchChangeRequest>,
    ) { }

    async create(createPitchDto: any) {
        const { timeSlots, ...pitchData } = createPitchDto;
        const pitch = this.pitchesRepository.create(pitchData);
        const result = await this.pitchesRepository.save(pitch);
        const savedPitch = Array.isArray(result) ? result[0] : result;

        // If timeSlots provided during creation, save them
        if (timeSlots && Array.isArray(timeSlots) && timeSlots.length > 0) {
            const slotEntities = timeSlots.map((slot: any) =>
                this.timeSlotRepository.create({
                    pitchId: savedPitch.id,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isActive: true,
                })
            );
            await this.timeSlotRepository.save(slotEntities);
        }

        return this.findOne(savedPitch.id);
    }

    async findAll() {
        return await this.pitchesRepository.find({ relations: ['business', 'timeSlots'] });
    }

    async findOne(id: string) {
        const pitch = await this.pitchesRepository.findOne({
            where: { id },
            relations: ['business', 'timeSlots']
        });
        if (!pitch) {
            throw new NotFoundException(`Pitch with ID ${id} not found`);
        }

        const pendingRequests = await this.changeRequestRepository.find({
            where: { pitchId: id, status: 'pending' },
            order: { createdAt: 'DESC' },
        });

        return { ...pitch, pendingChangeRequests: pendingRequests };
    }

    async findByBusiness(businessId: string) {
        return await this.pitchesRepository.find({
            where: { businessId },
            relations: ['timeSlots'],
            order: { name: 'ASC' }
        });
    }

    async update(id: string, updateData: any) {
        return await this.pitchesRepository.update(id, updateData);
    }

    async remove(id: string) {
        return await this.pitchesRepository.delete(id);
    }

    // ===== STATUS TOGGLE =====

    async toggleStatus(pitchId: string) {
        const pitch = await this.findOne(pitchId);

        // Only check for conflicts when trying to deactivate
        if (pitch.isActive) {
            const conflicts = await this.reservationRepository.find({
                where: {
                    pitchId,
                    status: ReservationStatus.APPROVED,
                    slotTime: MoreThan(new Date()),
                },
                relations: ['team'],
                order: { slotTime: 'ASC' },
            });

            if (conflicts.length > 0) {
                throw new ConflictException({
                    message: 'Kesinleşmiş maçlar var',
                    conflicts: conflicts.map(c => ({
                        id: c.id,
                        slotTime: c.slotTime,
                        teamName: c.team?.name || 'Bilinmiyor',
                    })),
                });
            }
        }

        await this.pitchesRepository.update(pitchId, { isActive: !pitch.isActive });
        return this.findOne(pitchId);
    }

    // ===== CLOSED DAYS =====

    async updateClosedDays(pitchId: string, closedDays: string[]) {
        await this.findOne(pitchId); // verify exists
        await this.pitchesRepository.update(pitchId, { closedDays });
        return this.findOne(pitchId);
    }

    // ===== TIME SLOT MANAGEMENT =====

    async setTimeSlots(pitchId: string, slots: { startTime: string; endTime: string }[]) {
        // Verify pitch exists
        await this.findOne(pitchId);

        // Delete existing slots for this pitch
        await this.timeSlotRepository.delete({ pitchId });

        // Create new slots
        if (slots && slots.length > 0) {
            const slotEntities = slots.map((slot) =>
                this.timeSlotRepository.create({
                    pitchId,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isActive: true,
                })
            );
            await this.timeSlotRepository.save(slotEntities);
        }

        return this.getTimeSlots(pitchId);
    }

    async getTimeSlots(pitchId: string) {
        const slots = await this.timeSlotRepository.find({
            where: { pitchId, isActive: true },
        });

        const sortMinutes = (time: string): number => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + (m || 0);
        };

        return slots.sort((a, b) => sortMinutes(a.startTime) - sortMinutes(b.startTime));
    }
}
