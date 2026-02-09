import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from './entities/business.entity';

@Injectable()
export class BusinessService {
    constructor(
        @InjectRepository(Business)
        private businessRepository: Repository<Business>,
    ) { }

    async create(createBusinessDto: any) {
        const business = this.businessRepository.create(createBusinessDto);
        return await this.businessRepository.save(business);
    }

    async findAll() {
        return await this.businessRepository.find({ relations: ['pitches'] });
    }

    async findOne(id: string) {
        const business = await this.businessRepository.findOne({
            where: { id },
            relations: ['pitches']
        });
        if (!business) {
            throw new NotFoundException(`Business with ID ${id} not found`);
        }
        return business;
    }
}
