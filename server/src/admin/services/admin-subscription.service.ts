import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessOwner } from '../../business-owner/entities/business-owner.entity';
import { Subscription } from '../../subscription/entities/subscription.entity';
import { AdminStatsCacheService } from './admin-stats-cache.service';
import { PITCH_COUNT_TO_PLAN } from './admin.util';

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
   * Aboneliği olmayan tüm aktif işletmeler için otomatik trial aboneliği oluşturur.
   * Saha sayısına göre doğru planı belirler. Idempotent (tekrar çalıştırılabilir).
   * Production'da ödeme entegrasyonu öncesi kayıtlı işletmeleri düzeltmek için kullanılır.
   */
  async seedMissingSubscriptions(): Promise<{
    created: number;
    updated: number;
    skipped: number;
    details: any[];
  }> {
    const owners = await this.businessOwnerRepository.find({
      relations: ['business', 'business.pitches'],
    });

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 90);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const details: any[] = [];

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
          status: 'trial' as any,
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
