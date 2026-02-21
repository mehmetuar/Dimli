import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pitch } from './entities/pitch.entity';
import { TimeSlot } from './entities/time-slot.entity';

@Injectable()
export class PitchesService {
    constructor(
        @InjectRepository(Pitch)
        private pitchesRepository: Repository<Pitch>,
        @InjectRepository(TimeSlot)
        private timeSlotRepository: Repository<TimeSlot>,
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
        return pitch;
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
        return this.timeSlotRepository.find({
            where: { pitchId, isActive: true },
            order: { startTime: 'ASC' }
        });
    }
}

