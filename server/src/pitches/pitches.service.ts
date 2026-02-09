import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pitch } from './entities/pitch.entity';

@Injectable()
export class PitchesService {
    constructor(
        @InjectRepository(Pitch)
        private pitchesRepository: Repository<Pitch>,
    ) { }

    async create(createPitchDto: any) {
        const pitch = this.pitchesRepository.create(createPitchDto);
        return await this.pitchesRepository.save(pitch);
    }

    async findAll() {
        return await this.pitchesRepository.find({ relations: ['business'] });
    }

    async findOne(id: string) {
        const pitch = await this.pitchesRepository.findOne({
            where: { id },
            relations: ['business']
        });
        if (!pitch) {
            throw new NotFoundException(`Pitch with ID ${id} not found`);
        }
        return pitch;
    }

    async findByBusiness(businessId: string) {
        return await this.pitchesRepository.find({
            where: { businessId },
            order: { name: 'ASC' }
        });
    }

    async update(id: string, updateData: any) {
        return await this.pitchesRepository.update(id, updateData);
    }
}
