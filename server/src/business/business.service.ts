import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Business } from './entities/business.entity';
import { SubscriptionService } from '../subscription/subscription.service';

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
    private subscriptionService: SubscriptionService,
  ) {}

  private mapWithOwnerPhone(b: Business & { distanceKm?: number }): any {
    return {
      ...b,
      ownerPhone: b.owner?.phone ?? null,
    };
  }

  async create(createBusinessDto: any) {
    const business = this.businessRepository.create(
      createBusinessDto as DeepPartial<Business>,
    );
    return await this.businessRepository.save(business);
  }

  async findAll(geoFilter?: GeoFilter): Promise<any[]> {
    if (!geoFilter) {
      const businesses = await this.businessRepository
        .createQueryBuilder('business')
        .leftJoinAndSelect(
          'business.pitches',
          'pitches',
          'pitches."approvalStatus" = :pApproval AND pitches."deletedAt" IS NULL',
          { pApproval: 'approved' },
        )
        .leftJoinAndSelect('pitches.timeSlots', 'timeSlots')
        .leftJoinAndSelect('business.owner', 'owner')
        .innerJoin(
          'Subscription',
          'subscription',
          'subscription.ownerId = owner.id',
        )
        .where('business.status = :status', { status: 'active' })
        .andWhere('business.deletedAt IS NULL')
        .andWhere('subscription.status IN (:...subStatuses)', {
          subStatuses: ['active', 'trial'],
        })
        .getMany();
      return businesses
        .filter((b) => (b.pitches?.length ?? 0) > 0)
        .map((b) => {
          if (b.pitches) {
            b.pitches.sort(
              (p1, p2) =>
                new Date(p1.createdAt).getTime() -
                new Date(p2.createdAt).getTime(),
            );
          }
          return this.mapWithOwnerPhone(b);
        });
    }

    const { lat, lng, radius } = geoFilter;
    console.log(
      `🌍 Business geo filter: lat=${lat}, lng=${lng}, radius=${radius}km`,
    );

    const distanceExpr = `(6371 * acos(GREATEST(-1.0, LEAST(1.0,
            cos(radians(:lat)) * cos(radians(business.latitude)) * cos(radians(business.longitude) - radians(:lng))
            + sin(radians(:lat)) * sin(radians(business.latitude))
        ))))`;

    const raw = await this.businessRepository
      .createQueryBuilder('business')
      .select('business.id', 'id')
      .addSelect(distanceExpr, 'distance_km')
      .innerJoin('business.owner', 'owner')
      .innerJoin(
        'Subscription',
        'subscription',
        'subscription.ownerId = owner.id',
      )
      .where('business.latitude IS NOT NULL')
      .andWhere('business.longitude IS NOT NULL')
      .andWhere('business.status = :status', { status: 'active' })
      .andWhere('business.deletedAt IS NULL')
      .andWhere('subscription.status IN (:...subStatuses)', {
        subStatuses: ['active', 'trial'],
      })
      .andWhere(`${distanceExpr} <= :radius`)
      .setParameters({ lat, lng, radius })
      .orderBy('distance_km', 'ASC')
      .getRawMany();

    if (raw.length === 0) {
      console.log(`🏟️ No businesses within ${radius}km`);
      return [];
    }

    const ids = raw.map((r) => r.id);
    const distanceMap = new Map<string, number>(
      raw.map((r) => [r.id, parseFloat(Number(r.distance_km).toFixed(1))]),
    );

    const businesses = await this.businessRepository
      .createQueryBuilder('business')
      .leftJoinAndSelect(
        'business.pitches',
        'pitches',
        'pitches."approvalStatus" = :pApproval AND pitches."deletedAt" IS NULL',
        { pApproval: 'approved' },
      )
      .leftJoinAndSelect('pitches.timeSlots', 'timeSlots')
      .leftJoinAndSelect('business.owner', 'owner')
      .innerJoin(
        'Subscription',
        'subscription',
        'subscription.ownerId = owner.id',
      )
      .where('business.id IN (:...ids)', { ids })
      .andWhere('subscription.status IN (:...subStatuses)', {
        subStatuses: ['active', 'trial'],
      })
      .getMany();

    const result = businesses
      .filter((b) => (b.pitches?.length ?? 0) > 0)
      .map((b) => {
        if (b.pitches) {
          b.pitches.sort(
            (p1, p2) =>
              new Date(p1.createdAt).getTime() -
              new Date(p2.createdAt).getTime(),
          );
        }
        return {
          ...this.mapWithOwnerPhone(b),
          distanceKm: distanceMap.get(b.id) ?? 0,
        };
      })
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

    console.log(`🏟️ Found ${result.length} businesses within ${radius}km`);
    return result;
  }

  async findOne(id: string) {
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: ['pitches', 'pitches.timeSlots', 'owner'],
    });
    if (!business || business.deletedAt) {
      throw new NotFoundException(`Business with ID ${id} not found`);
    }
    const subscription = await this.subscriptionService.findByOwner(
      business.owner.id,
    );
    if (!subscription || !['active', 'trial'].includes(subscription.status)) {
      throw new ForbiddenException('Bu işletmenin aboneliği aktif değil.');
    }
    business.pitches = (business.pitches ?? []).filter(
      (p) => p.approvalStatus === 'approved' && !p.deletedAt,
    );
    business.pitches.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    return this.mapWithOwnerPhone(business);
  }

  async update(id: string, updateDto: any) {
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: ['owner'],
    });
    if (!business)
      throw new NotFoundException(`Business with ID ${id} not found`);
    Object.assign(business, updateDto);
    return await this.businessRepository.save(business);
  }
}
