import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from './entities/business.entity';
import { UpdateBusinessDto } from './dto/update-business.dto';
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

  async findAll(params: {
    geoFilter?: GeoFilter;
    ids?: string[];
  }): Promise<any[]> {
    const { geoFilter, ids: requestedIds } = params;

    if (requestedIds) {
      if (requestedIds.length === 0) return [];
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
        .where('business.id IN (:...ids)', { ids: requestedIds })
        .andWhere('business.status = :status', { status: 'active' })
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

    if (!geoFilter) {
      throw new Error('findAll requires either geoFilter or ids');
    }

    // Legacy (sayfasız) yol — mevcut tüketiciler (MyTeam, Favoriler, CreateMatchModal)
    // tam listeyi timeSlots dahil bekliyor; davranış korunur, yalnız bounding-box
    // ön-filtresi eklendi (aynı sonuç, tam Haversine taraması yok).
    const candidates = await this.geoCandidates(geoFilter);
    if (candidates.length === 0) {
      console.log(`🏟️ No businesses within ${geoFilter.radius}km`);
      return [];
    }
    const distanceMap = new Map<string, number>(
      candidates.map((c) => [c.id, c.distance]),
    );
    const businesses = await this.fetchBusinessesByIds(
      candidates.map((c) => c.id),
      true, // withTimeSlots — legacy davranış
    );

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

    console.log(
      `🏟️ Found ${result.length} businesses within ${geoFilter.radius}km`,
    );
    return result;
  }

  // ── Geo aday listesi: bounding-box (indeksli lat/lng aralığı) ile daralt,
  //    sonra kesin Haversine ile filtrele + mesafeye göre sırala. ──
  private computeBoundingBox(lat: number, lng: number, radiusKm: number) {
    // %10 güvenlik payı: kutu, yarıçap çemberini kesin kapsasın (kesin filtre yine
    // Haversine ile yapılır) — sınırdaki hiçbir işletme yanlışlıkla elenmesin.
    const margin = 1.1;
    const latDelta = (radiusKm * margin) / 111.32; // ~km/derece (enlem)
    const cosLat = Math.cos((lat * Math.PI) / 180);
    const lngDelta = (radiusKm * margin) / (111.32 * Math.max(0.01, Math.abs(cosLat)));
    return {
      minLat: lat - latDelta,
      maxLat: lat + latDelta,
      minLng: lng - lngDelta,
      maxLng: lng + lngDelta,
    };
  }

  private async geoCandidates(
    geoFilter: GeoFilter,
  ): Promise<{ id: string; distance: number }[]> {
    const { lat, lng, radius } = geoFilter;
    console.log(
      `🌍 Business geo filter: lat=${lat}, lng=${lng}, radius=${radius}km`,
    );
    const box = this.computeBoundingBox(lat, lng, radius);
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
      // Bounding-box ön-filtresi: tam trig taramasından önce indeksli aralık.
      .andWhere('business.latitude BETWEEN :minLat AND :maxLat', {
        minLat: box.minLat,
        maxLat: box.maxLat,
      })
      .andWhere('business.longitude BETWEEN :minLng AND :maxLng', {
        minLng: box.minLng,
        maxLng: box.maxLng,
      })
      .andWhere('business.status = :status', { status: 'active' })
      .andWhere('business.deletedAt IS NULL')
      .andWhere('subscription.status IN (:...subStatuses)', {
        subStatuses: ['active', 'trial'],
      })
      .andWhere(`${distanceExpr} <= :radius`)
      .setParameters({ lat, lng, radius })
      .orderBy('distance_km', 'ASC')
      .getRawMany();

    return raw.map((r) => ({
      id: r.id,
      distance: parseFloat(Number(r.distance_km).toFixed(1)),
    }));
  }

  private async fetchBusinessesByIds(
    ids: string[],
    withTimeSlots: boolean,
  ): Promise<Business[]> {
    const qb = this.businessRepository
      .createQueryBuilder('business')
      .leftJoinAndSelect(
        'business.pitches',
        'pitches',
        'pitches."approvalStatus" = :pApproval AND pitches."deletedAt" IS NULL',
        { pApproval: 'approved' },
      );
    // withTimeSlots=false ise timeSlots JOIN'i atlanır (ileride hafif liste gerekirse);
    // şu an her iki yol da true geçiyor (slot grid senkron kalsın).
    if (withTimeSlots) {
      qb.leftJoinAndSelect('pitches.timeSlots', 'timeSlots');
    }
    return qb
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
  }

  // ── Konum-önce + sayfalı + hafif (timeSlots YOK) — müşteri Sahalar listesi.
  //    Aday küme yarıçapla sınırlı (~50-60) olduğundan sıralama/dilimleme in-memory. ──
  async findNearbyPaged(params: {
    geoFilter: GeoFilter;
    limit: number;
    offset: number;
    sort: 'distance' | 'price_asc' | 'price_desc' | 'rating' | 'rating_count';
    q?: string;
  }): Promise<{ items: any[]; total: number; hasMore: boolean }> {
    const { geoFilter, limit, offset, sort, q } = params;
    const candidates = await this.geoCandidates(geoFilter);
    if (candidates.length === 0) return { items: [], total: 0, hasMore: false };

    const distanceMap = new Map<string, number>(
      candidates.map((c) => [c.id, c.distance]),
    );
    // timeSlots dahil — slot grid'i (booking çekirdeği) istemcide senkron kalsın; asıl
    // ölçek kazanımı sayfalama (limit/offset) + bounding-box'tan geliyor.
    const businesses = await this.fetchBusinessesByIds(
      candidates.map((c) => c.id),
      true,
    );

    const mapped = businesses
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
      });

    // İşletme adıyla arama filtresi — sıralama/dilimlemeden ÖNCE uygulanır ki
    // total/hasMore filtreli sayıyı yansıtsın (sayfalama doğru kalsın). Aday küme
    // yarıçapla sınırlı olduğundan in-memory filtre yeterli (DB index gerekmez).
    // Türkçe-duyarlı küçük harf: "İstanbul"/"istanbul", "Iğdır"/"ığdır" doğru eşleşsin.
    const filtered = q
      ? mapped.filter((b) =>
          (b.name ?? '')
            .toLocaleLowerCase('tr')
            .includes(q.toLocaleLowerCase('tr')),
        )
      : mapped;

    const price = (b: any) => b.pitches?.[0]?.pricePerHour ?? 0;
    const primary = (a: any, b: any) => {
      switch (sort) {
        case 'price_asc':
          return price(a) - price(b);
        case 'price_desc':
          return price(b) - price(a);
        case 'rating':
          return (b.rating ?? 0) - (a.rating ?? 0);
        case 'rating_count':
          return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
        case 'distance':
        default:
          return (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
      }
    };
    // Eşit değerlerde STABİL ikincil anahtar (id): sayfalar arası öğe kayması/duplikasyonu
    // olmasın. fetchBusinessesByIds (IN) sırası deterministik değil → tek başına primary yetmez;
    // özellikle distanceKm 0.1'e yuvarlı ve rating varsayılan 5.0 olduğundan eşitlik sık.
    const sorted = filtered.sort(
      (a, b) => primary(a, b) || String(a.id).localeCompare(String(b.id)),
    );

    const total = sorted.length;
    const items = sorted.slice(offset, offset + limit);
    console.log(
      `🏟️ Paged nearby: ${total} aday, sayfa=${offset}-${offset + limit} (sort=${sort}${q ? `, q="${q}"` : ''})`,
    );
    return { items, total, hasMore: offset + limit < total };
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

  async update(id: string, updateDto: UpdateBusinessDto, ownerId: string) {
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: ['owner'],
    });
    if (!business)
      throw new NotFoundException(`Business with ID ${id} not found`);
    if (business.owner?.id !== ownerId)
      throw new ForbiddenException('Bu işletmeyi düzenleme yetkiniz yok.');
    // Yalnız izin verilen alanlar yazılır (status/deletedAt gibi hassas alanlar
    // DTO whitelist'i sayesinde zaten istekten ayıklanmış olur; burada da açıkça
    // yalnız bilinen alanlar atanarak savunma-derinliği sağlanır).
    if (updateDto.name !== undefined) business.name = updateDto.name;
    if (updateDto.address !== undefined) business.address = updateDto.address;
    if (updateDto.city !== undefined) business.city = updateDto.city;
    if (updateDto.district !== undefined)
      business.district = updateDto.district;
    if (updateDto.latitude !== undefined)
      business.latitude = updateDto.latitude;
    if (updateDto.longitude !== undefined)
      business.longitude = updateDto.longitude;
    return await this.businessRepository.save(business);
  }
}
