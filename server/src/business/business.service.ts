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
import { computeBoundingBox } from '../common/geo.util';

interface GeoFilter {
  lat: number;
  lng: number;
  radius: number;
}

// mapWithOwnerPhone çıktısı: owner nesnesi yanıttan çıkarılır, yalnız ownerPhone
// düz alan olarak kalır; geo yollarında distanceKm eklenir.
export type BusinessWithOwnerPhone = Omit<Business, 'owner'> & {
  ownerPhone: string | null;
  distanceKm?: number;
};

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    private subscriptionService: SubscriptionService,
  ) {}

  private mapWithOwnerPhone(
    b: Business & { distanceKm?: number },
  ): BusinessWithOwnerPhone {
    // GÜVENLİK: /businesses (findAll/:id) public/guard'sız. Gömülü `owner` TAM
    // BusinessOwner (parola hash'i + email + telefon + pushToken) sızdırıyordu →
    // owner nesnesi yanıttan ÇIKARILIR, yalnız gereken ownerPhone düz alan olarak yayılır.
    const { owner: _owner, ...safe } = b;
    return {
      ...safe,
      ownerPhone: b.owner?.phone ?? null,
    };
  }

  async findAll(params: {
    geoFilter?: GeoFilter;
    ids?: string[];
  }): Promise<BusinessWithOwnerPhone[]> {
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
  //    sonra kesin Haversine ile filtrele + mesafeye göre sırala.
  //    withSortKeys=true (yalnız findNearbyPaged): sıralama/filtre anahtarları
  //    (name/rating/ratingCount/ilk-pitch fiyatı) skaler eklenir ve ≥1 approved
  //    pitch koşulu SQL'e iner — böylece sayfalama hydrate'siz yapılabilir.
  //    Bayrak false iken SQL birebir eski hali (legacy findAll yolu etkilenmez). ──
  private async geoCandidates(
    geoFilter: GeoFilter,
    withSortKeys = false,
  ): Promise<
    {
      id: string;
      distance: number;
      name?: string;
      rating?: number;
      ratingCount?: number;
      firstPitchPrice?: number;
    }[]
  > {
    const { lat, lng, radius } = geoFilter;
    console.log(
      `🌍 Business geo filter: lat=${lat}, lng=${lng}, radius=${radius}km`,
    );
    const box = computeBoundingBox(lat, lng, radius);
    const distanceExpr = `(6371 * acos(GREATEST(-1.0, LEAST(1.0,
            cos(radians(:lat)) * cos(radians(business.latitude)) * cos(radians(business.longitude) - radians(:lng))
            + sin(radians(:lat)) * sin(radians(business.latitude))
        ))))`;

    const qb = this.businessRepository
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
      .orderBy('distance_km', 'ASC');

    if (withSortKeys) {
      qb.addSelect('business.name', 'name')
        .addSelect('business.rating', 'rating')
        .addSelect('business.ratingCount', 'rating_count')
        // Mevcut price sıralamasının karşılığı: EN ESKİ (createdAt ASC) approved +
        // silinmemiş pitch'in fiyatı (hydrate'li akış b.pitches[0].pricePerHour okurdu).
        .addSelect(
          `(SELECT p."pricePerHour" FROM pitches p
             WHERE p.business_id = business.id
               AND p."approvalStatus" = 'approved'
               AND p."deletedAt" IS NULL
             ORDER BY p.created_at ASC, p.id ASC
             LIMIT 1)`,
          'first_pitch_price',
        )
        // pitches.length > 0 filtresinin skaler karşılığı.
        .andWhere(
          `EXISTS (SELECT 1 FROM pitches pe
             WHERE pe.business_id = business.id
               AND pe."approvalStatus" = 'approved'
               AND pe."deletedAt" IS NULL)`,
        );
    }

    const raw = await qb.getRawMany();

    return raw.map((r) => ({
      id: r.id,
      distance: parseFloat(Number(r.distance_km).toFixed(1)),
      ...(withSortKeys
        ? {
            name: r.name ?? '',
            rating: Number(r.rating ?? 0),
            ratingCount: Number(r.rating_count ?? 0),
            firstPitchPrice:
              r.first_pitch_price != null ? Number(r.first_pitch_price) : 0,
          }
        : {}),
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

  // ── Konum-önce + sayfalı — müşteri Sahalar listesi.
  //    Skaler anahtar → sırala/dilimle → YALNIZ sayfayı hydrate → sayfa sırasına
  //    geri diz: aday kümenin tamamı (metropolde 200-500 işletme × 30-40 slot)
  //    değil, yalnız istenen sayfa (≤limit işletme) pitches+timeSlots join'i görür. ──
  async findNearbyPaged(params: {
    geoFilter: GeoFilter;
    limit: number;
    offset: number;
    sort: 'distance' | 'price_asc' | 'price_desc' | 'rating' | 'rating_count';
    q?: string;
  }): Promise<{
    items: BusinessWithOwnerPhone[];
    total: number;
    hasMore: boolean;
  }> {
    const { geoFilter, limit, offset, sort, q } = params;
    // withSortKeys: ≥1 approved pitch koşulu SQL'de; name/rating/fiyat skaler gelir.
    const candidates = await this.geoCandidates(geoFilter, true);
    if (candidates.length === 0) return { items: [], total: 0, hasMore: false };

    // İşletme adıyla arama filtresi — sıralama/dilimlemeden ÖNCE uygulanır ki
    // total/hasMore filtreli sayıyı yansıtsın (sayfalama doğru kalsın). Aday küme
    // yarıçapla sınırlı olduğundan in-memory filtre yeterli (DB index gerekmez).
    // Türkçe-duyarlı küçük harf: "İstanbul"/"istanbul", "Iğdır"/"ığdır" doğru eşleşsin.
    const filtered = q
      ? candidates.filter((c) =>
          (c.name ?? '')
            .toLocaleLowerCase('tr')
            .includes(q.toLocaleLowerCase('tr')),
        )
      : candidates;

    const primary = (a: (typeof candidates)[0], b: (typeof candidates)[0]) => {
      switch (sort) {
        case 'price_asc':
          return (a.firstPitchPrice ?? 0) - (b.firstPitchPrice ?? 0);
        case 'price_desc':
          return (b.firstPitchPrice ?? 0) - (a.firstPitchPrice ?? 0);
        case 'rating':
          return (b.rating ?? 0) - (a.rating ?? 0);
        case 'rating_count':
          return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
        case 'distance':
        default:
          return (a.distance ?? 0) - (b.distance ?? 0);
      }
    };
    // Eşit değerlerde STABİL ikincil anahtar (id): sayfalar arası öğe kayması/duplikasyonu
    // olmasın (§27 kuralı — distanceKm 0.1'e yuvarlı + rating varsayılan 5.0 → eşitlik sık).
    const sorted = filtered.sort(
      (a, b) => primary(a, b) || String(a.id).localeCompare(String(b.id)),
    );

    const total = sorted.length;
    const pageRows = sorted.slice(offset, offset + limit);
    const pageIds = pageRows.map((r) => r.id);
    if (pageIds.length === 0) {
      return { items: [], total, hasMore: offset + limit < total };
    }

    const distanceMap = new Map<string, number>(
      pageRows.map((c) => [c.id, c.distance]),
    );
    // timeSlots dahil — slot grid'i (booking çekirdeği) istemcide senkron kalsın;
    // ama yalnız SAYFA id'leri hydrate edilir (eskiden tüm aday küme ediliyordu).
    const businesses = await this.fetchBusinessesByIds(pageIds, true);

    const mapped = businesses
      // Güvenlik: iki sorgu arasında pitch silinme/approval yarışı olursa boş
      // işletme kartı sızmasın (skaler EXISTS koşulu anlık görüntüydü).
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

    // fetchBusinessesByIds (IN) sırası deterministik değil — sayfa sırasına geri diz.
    const orderIndex = new Map(pageIds.map((id, i) => [id, i]));
    mapped.sort(
      (a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0),
    );

    console.log(
      `🏟️ Paged nearby: ${total} aday, sayfa=${offset}-${offset + limit} hydrate=${pageIds.length} (sort=${sort}${q ? `, q="${q}"` : ''})`,
    );
    return { items: mapped, total, hasMore: offset + limit < total };
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
