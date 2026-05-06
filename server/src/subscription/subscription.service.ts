import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';

export const SUBSCRIPTION_PLANS: Record<string, { pitchCount: number; pricePerMonth: number; label: string }> = {
    '1_pitch': { pitchCount: 1, pricePerMonth: 1709.99, label: 'Starter' },
    '2_pitch': { pitchCount: 2, pricePerMonth: 2999.99, label: 'Basic' },
    '3_pitch': { pitchCount: 3, pricePerMonth: 3849.99, label: 'Pro' },
    '4_pitch': { pitchCount: 4, pricePerMonth: 4649.99, label: 'Business' },
    '5plus_pitch': { pitchCount: 5, pricePerMonth: 5399.99, label: 'Enterprise' },
};

@Injectable()
export class SubscriptionService {
    constructor(
        @InjectRepository(Subscription)
        private subscriptionRepository: Repository<Subscription>,
    ) { }

    getPlans() {
        return Object.entries(SUBSCRIPTION_PLANS).map(([key, value]) => ({
            planType: key,
            ...value,
        }));
    }

    async createTrialSubscription(
        ownerId: string,
        planType: string,
        revenuecatCustomerId?: string,
    ): Promise<Subscription> {
        const plan = SUBSCRIPTION_PLANS[planType];
        if (!plan) throw new NotFoundException('Geçersiz plan tipi.');

        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 90); // 3 ay = 90 gün

        const subscription = this.subscriptionRepository.create({
            ownerId,
            planType,
            pitchCount: plan.pitchCount,
            pricePerMonth: plan.pricePerMonth,
            status: SubscriptionStatus.TRIAL,
            trialEndsAt,
            ...(revenuecatCustomerId && { revenuecatCustomerId }),
        });

        return this.subscriptionRepository.save(subscription);
    }

    async findByOwner(ownerId: string): Promise<Subscription | null> {
        return this.subscriptionRepository.findOne({ where: { ownerId } });
    }

    async updateRevenueCatInfo(ownerId: string, customerId: string, entitlementId: string): Promise<void> {
        const subscription = await this.findByOwner(ownerId);
        if (!subscription) throw new NotFoundException('Abonelik bulunamadı.');

        subscription.revenuecatCustomerId = customerId;
        subscription.revenuecatEntitlementId = entitlementId;
        subscription.status = SubscriptionStatus.ACTIVE;
        await this.subscriptionRepository.save(subscription);
    }

    async confirmPurchase(
        ownerId: string,
        planType: string,
        rcCustomerId: string,
    ): Promise<Subscription> {
        const plan = SUBSCRIPTION_PLANS[planType];
        if (!plan) throw new NotFoundException('Geçersiz plan tipi.');

        let subscription = await this.findByOwner(ownerId);
        if (!subscription) {
            // Henüz abonelik yoksa oluştur
            subscription = this.subscriptionRepository.create({ ownerId });
        }

        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 90);

        subscription.planType = planType;
        subscription.pitchCount = plan.pitchCount;
        subscription.pricePerMonth = plan.pricePerMonth;
        subscription.revenuecatCustomerId = rcCustomerId;
        subscription.status = SubscriptionStatus.ACTIVE;
        if (!subscription.trialEndsAt) subscription.trialEndsAt = trialEndsAt;

        return this.subscriptionRepository.save(subscription);
    }

    async handleWebhook(event: any): Promise<void> {
        const { type, app_user_id } = event;

        // Önce revenuecatCustomerId ile ara (anonim ID veya önceki logIn ID'si)
        // Bulamazsa ownerId ile dene — logIn(ownerId) çağrısı sonrası app_user_id = ownerId olur
        let subscription = await this.subscriptionRepository.findOne({
            where: { revenuecatCustomerId: app_user_id },
        });

        if (!subscription) {
            subscription = await this.subscriptionRepository.findOne({
                where: { ownerId: app_user_id },
            });
        }

        if (!subscription) return;

        switch (type) {
            case 'INITIAL_PURCHASE':
            case 'RENEWAL':
                // Her zaman güncel RC customer ID'yi kaydet
                subscription.revenuecatCustomerId = app_user_id;
                subscription.status = SubscriptionStatus.ACTIVE;
                if (event.expiration_at_ms) {
                    subscription.expiresAt = new Date(event.expiration_at_ms);
                }
                break;
            case 'CANCELLATION':
                subscription.status = SubscriptionStatus.CANCELLED;
                break;
            case 'EXPIRATION':
                subscription.status = SubscriptionStatus.EXPIRED;
                break;
        }

        await this.subscriptionRepository.save(subscription);
    }
}
