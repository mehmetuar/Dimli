import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessOwner } from '../../business-owner/entities/business-owner.entity';
import { PromoCode } from '../../promo-codes/entities/promo-code.entity';
import {
  Subscription,
  SubscriptionStatus,
} from '../../subscription/entities/subscription.entity';
import { AdminStatsCacheService } from './admin-stats-cache.service';
import { PITCH_COUNT_TO_PLAN, PLAN_LABELS } from './admin.util';

export interface SeedSubscriptionDetail {
  email: string;
  business: string;
  action: 'created' | 'updated' | 'skipped';
  plan: string;
}

// Abonelikler sınıflandırma sayfası satırı (GET /admin/subscriptions).
export interface AdminSubscriptionListItem {
  subscriptionId: string;
  status: string;
  planType: string;
  planLabel: string;
  pricePerMonth: number;
  trialEndsAt: string | null;
  expiresAt: string | null;
  complimentaryUntil: string | null;
  graceUntil: string | null;
  promoCode: string | null;
  createdAt: string;
  businessId: string | null;
  businessName: string | null;
  businessStatus: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
}

@Injectable()
export class AdminSubscriptionService {
  constructor(
    @InjectRepository(BusinessOwner)
    private businessOwnerRepository: Repository<BusinessOwner>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    private readonly statsCache: AdminStatsCacheService,
  ) {}

  /**
   * Abonelik sınıflandırma listesi (admin Abonelikler sayfası).
   * subscriptions → owner (::text cast: ownerId varchar / owner.id uuid,
   * promo-codes.service emsali) → business + promo kodu. Sayfalı + statü
   * filtresi + işletme adı / owner adı-email araması.
   */
  async listSubscriptions(opts: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{
    items: AdminSubscriptionListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(opts.limit) || 20));

    const buildQb = () => {
      const qb = this.subscriptionRepository
        .createQueryBuilder('s')
        .leftJoin(BusinessOwner, 'o', 'o.id::text = s.ownerId')
        .leftJoin('o.business', 'b')
        .leftJoin(PromoCode, 'pc', 'pc.id::text = s.promoCodeId');
      const status = (opts.status ?? '').trim();
      if (
        status &&
        (Object.values(SubscriptionStatus) as string[]).includes(status)
      ) {
        qb.andWhere('s.status = :status', { status });
      }
      const search = (opts.search ?? '').trim();
      if (search) {
        qb.andWhere(
          '(b.name ILIKE :q OR o.fullName ILIKE :q OR o.email ILIKE :q)',
          { q: `%${search}%` },
        );
      }
      return qb;
    };

    // OneToOne join'ler satır çoğaltmaz → getCount root üzerinden güvenli.
    const total = await buildQb().getCount();

    const rows: Array<Record<string, unknown>> = await buildQb()
      .select('s.id', 'subscriptionId')
      .addSelect('s.status', 'status')
      .addSelect('s.planType', 'planType')
      .addSelect('s.pricePerMonth', 'pricePerMonth')
      .addSelect('s.trialEndsAt', 'trialEndsAt')
      .addSelect('s.expiresAt', 'expiresAt')
      .addSelect('s.complimentaryUntil', 'complimentaryUntil')
      .addSelect('s.graceUntil', 'graceUntil')
      .addSelect('s.createdAt', 'createdAt')
      .addSelect('pc.code', 'promoCode')
      .addSelect('b.id', 'businessId')
      .addSelect('b.name', 'businessName')
      .addSelect('b.status', 'businessStatus')
      .addSelect('o.fullName', 'ownerName')
      .addSelect('o.email', 'ownerEmail')
      .orderBy('s.created_at', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    const items: AdminSubscriptionListItem[] = rows.map((r) => {
      const planType = String(r.planType ?? '');
      return {
        subscriptionId: String(r.subscriptionId),
        status: String(r.status),
        planType,
        planLabel: PLAN_LABELS[planType] ?? planType,
        pricePerMonth: Number(r.pricePerMonth ?? 0),
        trialEndsAt: (r.trialEndsAt as string | null) ?? null,
        expiresAt: (r.expiresAt as string | null) ?? null,
        complimentaryUntil: (r.complimentaryUntil as string | null) ?? null,
        graceUntil: (r.graceUntil as string | null) ?? null,
        promoCode: (r.promoCode as string | null) ?? null,
        createdAt: String(r.createdAt),
        businessId: (r.businessId as string | null) ?? null,
        businessName: (r.businessName as string | null) ?? null,
        businessStatus: (r.businessStatus as string | null) ?? null,
        ownerName: (r.ownerName as string | null) ?? null,
        ownerEmail: (r.ownerEmail as string | null) ?? null,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Aboneliği olmayan tüm aktif işletmeler için otomatik trial aboneliği oluşturur.
   * Saha sayısına göre doğru planı belirler. Idempotent (tekrar çalıştırılabilir).
   * Production'da ödeme entegrasyonu öncesi kayıtlı işletmeleri düzeltmek için kullanılır.
   */
  async seedMissingSubscriptions(): Promise<{
    created: number;
    updated: number;
    skipped: number;
    details: SeedSubscriptionDetail[];
  }> {
    const owners = await this.businessOwnerRepository.find({
      relations: ['business', 'business.pitches'],
    });

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 90);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const details: SeedSubscriptionDetail[] = [];

    for (const owner of owners) {
      const business = owner.business;
      if (!business) {
        skipped++;
        continue;
      }

      const pitchCount = business.pitches?.length ?? 0;
      const planKey = Math.min(pitchCount, 4); // 5+ → enterprise
      const plan =
        pitchCount >= 5
          ? { planType: '5plus_pitch', pitchCount: 5, pricePerMonth: 5399.99 }
          : PITCH_COUNT_TO_PLAN[planKey];

      const existing = await this.subscriptionRepository.findOne({
        where: { ownerId: owner.id },
      });

      if (existing) {
        // Plan tipi saha sayısıyla uyuşmuyorsa güncelle
        const needsUpdate =
          existing.planType !== plan.planType ||
          existing.pitchCount !== plan.pitchCount;
        if (needsUpdate) {
          existing.planType = plan.planType;
          existing.pitchCount = plan.pitchCount;
          existing.pricePerMonth = plan.pricePerMonth;
          await this.subscriptionRepository.save(existing);
          updated++;
          details.push({
            email: owner.email,
            business: business.name,
            action: 'updated',
            plan: plan.planType,
          });
        } else {
          skipped++;
          details.push({
            email: owner.email,
            business: business.name,
            action: 'skipped',
            plan: plan.planType,
          });
        }
      } else {
        const subscription = this.subscriptionRepository.create({
          ownerId: owner.id,
          planType: plan.planType,
          pitchCount: plan.pitchCount,
          pricePerMonth: plan.pricePerMonth,
          status: SubscriptionStatus.TRIAL,
          trialEndsAt,
        });
        await this.subscriptionRepository.save(subscription);
        created++;
        details.push({
          email: owner.email,
          business: business.name,
          action: 'created',
          plan: plan.planType,
        });
      }
    }

    this.statsCache.bust('statistics');
    return { created, updated, skipped, details };
  }
}
