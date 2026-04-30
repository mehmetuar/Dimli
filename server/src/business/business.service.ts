import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from './entities/business.entity';

interface GeoFilter {
    lat: number;
    lng: number;
    radius: number;
}

@Injectable()
export class BusinessService {
    constructor(
        @InjectRepository(Business)
        private businessRepository: Repository<Business>,
    ) { }

    private mapWithOwnerPhone(b: Business & { distanceKm?: number }): any {
        const { owner, ...rest } = b as any;
        return { ...rest, ownerPhone: owner?.phone ?? null };
    }

    async create(createBusinessDto: any) {
        const business = this.businessRepository.create(createBusinessDto);
        return await this.businessRepository.save(business);
    }

    async findAll(geoFilter?: GeoFilter): Promise<any[]> {
        if (!geoFilter) {
            const businesses = await this.businessRepository.find({
                where: { status: 'active' },
                relations: ['pitches', 'pitches.timeSlots', 'owner'],
            });
            return businesses.map(b => this.mapWithOwnerPhone(b));
        }

        const { lat, lng, radius } = geoFilter;
        console.log(`🌍 Business geo filter: lat=${lat}, lng=${lng}, radius=${radius}km`);

        const raw: any[] = await this.businessRepository.query(
            `SELECT id,
                (6371 * acos(
                    cos(radians($1)) * cos(radians(latitude))
                    * cos(radians(longitude) - radians($2))
                    + sin(radians($1)) * sin(radians(latitude))
                )) AS distance_km
             FROM businesses
             WHERE latitude IS NOT NULL
               AND longitude IS NOT NULL
               AND status = 'active'
               AND (
                   6371 * acos(
                       cos(radians($1)) * cos(radians(latitude))
                       * cos(radians(longitude) - radians($2))
                       + sin(radians($1)) * sin(radians(latitude))
                   )
               ) <= $3
             ORDER BY distance_km ASC`,
            [lat, lng, radius],
        );

        if (raw.length === 0) {
            console.log(`🏟️ No businesses within ${radius}km`);
            return [];
        }

        const ids = raw.map(r => r.id);
        const distanceMap = new Map<string, number>(
            raw.map(r => [r.id, parseFloat(Number(r.distance_km).toFixed(1))]),
        );

        const businesses = await this.businessRepository
            .createQueryBuilder('business')
            .leftJoinAndSelect('business.pitches', 'pitches')
            .leftJoinAndSelect('pitches.timeSlots', 'timeSlots')
            .leftJoinAndSelect('business.owner', 'owner')
            .where('business.id IN (:...ids)', { ids })
            .getMany();

        const result = businesses
            .map(b => ({ ...this.mapWithOwnerPhone(b), distanceKm: distanceMap.get(b.id) ?? 0 }))
            .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

        console.log(`🏟️ Found ${result.length} businesses within ${radius}km`);
        return result;
    }

    async findOne(id: string) {
        const business = await this.businessRepository.findOne({
            where: { id },
            relations: ['pitches', 'pitches.timeSlots', 'owner'],
        });
        if (!business) {
            throw new NotFoundException(`Business with ID ${id} not found`);
        }
        return this.mapWithOwnerPhone(business);
    }

    async update(id: string, updateDto: any) {
        const business = await this.businessRepository.findOne({ where: { id }, relations: ['owner'] });
        if (!business) throw new NotFoundException(`Business with ID ${id} not found`);
        Object.assign(business, updateDto);
        return await this.businessRepository.save(business);
    }
}
