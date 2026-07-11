import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Not, Repository } from 'typeorm';
import {
  Subscription,
  SubscriptionStatus,
} from './entities/subscription.entity';
import { Pitch } from '../pitches/entities/pitch.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { Notification } from '../notifications/notification.entity';
import type { RevenueCatWebhookPayload } from './dto/revenuecat-webhook';

export const SUBSCRIPTION_PLANS: Record<
  string,
  { pitchCount: number; pricePerMonth: number; label: string }
> = {
  '1_pitch': { pitchCount: 1, pricePerMonth: 1709.99, label: 'Starter' },
  '2_pitch': { pitchCount: 2, pricePerMonth: 2999.99, label: 'Basic' },
  '3_pitch': { pitchCount: 3, pricePerMonth: 3849.99, label: 'Pro' },
  '4_pitch': { pitchCount: 4, pricePerMonth: 4649.99, label: 'Business' },
  '5plus_pitch': { pitchCount: 5, pricePerMonth: 5399.99, label: 'Enterprise' },
};

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    // Yalnız entity repo'ları — SubscriptionModule yaprak kalmalı (Notifications/
    // Pitches modül importu ReservationsModule üzerinden döngü yaratır, agent.md).
    @InjectRepository(Pitch)
    private pitchRepository: Repository<Pitch>,
    @InjectRepository(BusinessOwner)
    private businessOwnerRepository: Repository<BusinessOwner>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

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

  private applyPendingPlanIfDue(subscription: Subscription): boolean {
    if (!subscription.pendingPlanType || !subscription.pendingPlanEffectiveAt)
      return false;
    if (new Date() < subscription.pendingPlanEffectiveAt) return false;

    const pendingPlan = SUBSCRIPTION_PLANS[subscription.pendingPlanType];
    if (pendingPlan) {
      subscription.planType = subscription.pendingPlanType;
      subscription.pitchCount = pendingPlan.pitchCount;
      subscription.pricePerMonth = pendingPlan.pricePerMonth;
    }
    subscription.pendingPlanType = null;
    subscription.pendingPlanEffectiveAt = null;
    return true;
  }

  async findByOwner(ownerId: string): Promise<Subscription | null> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { ownerId },
    });
    if (!subscription) return null;
    if (this.applyPendingPlanIfDue(subscription)) {
      await this.subscriptionRepository.save(subscription);
    }
    return subscription;
  }

  async updateRevenueCatInfo(
    ownerId: string,
    customerId: string,
    entitlementId: string,
  ): Promise<void> {
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

    subscription.revenuecatCustomerId = rcCustomerId;

    // Deneme sürümünde yükseltme: plan/saha limiti/ücret anında uygulanır,
    // deneme rozeti ve bitiş tarihi değişmeden kalır.
    if (
      subscription.status === SubscriptionStatus.TRIAL &&
      subscription.trialEndsAt
    ) {
      subscription.planType = planType;
      subscription.pitchCount = plan.pitchCount;
      subscription.pricePerMonth = plan.pricePerMonth;
      subscription.pendingPlanType = null;
      subscription.pendingPlanEffectiveAt = null;
      const saved = await this.subscriptionRepository.save(subscription);
      await this.clearScheduledPitchDeletions(ownerId);
      return saved;
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 90);

    subscription.planType = planType;
    subscription.pitchCount = plan.pitchCount;
    subscription.pricePerMonth = plan.pricePerMonth;
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.pendingPlanType = null;
    subscription.pendingPlanEffectiveAt = null;
    if (!subscription.trialEndsAt) subscription.trialEndsAt = trialEndsAt;

    const saved = await this.subscriptionRepository.save(subscription);
    await this.clearScheduledPitchDeletions(ownerId);
    return saved;
  }

  /**
   * Plan anında değişince (confirm-purchase = yükseltme/yeniden satın alma)
   * bekleyen düşürme iptal olur → silinmesi planlanmış sahalar geri aktif
   * edilir ve owner bilgilendirilir. Koşullu UPDATE, silme cron'uyla yarışta
   * atomiktir (cron sildiyse deletedAt IS NULL no-op yapar). Best-effort —
   * satın alma kaydını asla bloklamaz. Webhook RENEWAL yolu bunu ÇAĞIRMAZ
   * (orada pending plan uygulanır, planlama iptal edilmez).
   */
  private async clearScheduledPitchDeletions(ownerId: string): Promise<void> {
    try {
      const owner = await this.businessOwnerRepository.findOne({
        where: { id: ownerId },
        relations: ['business'],
      });
      const businessId = owner?.business?.id;
      if (!businessId) return;

      const scheduled = await this.pitchRepository.find({
        where: {
          businessId,
          scheduledDeletionAt: Not(IsNull()),
          deletedAt: IsNull(),
        },
      });
      if (scheduled.length === 0) return;

      await this.pitchRepository.update(
        {
          businessId,
          scheduledDeletionAt: Not(IsNull()),
          deletedAt: IsNull(),
        },
        {
          scheduledDeletionAt: null,
          deletionReminderSentAt: null,
          isActive: true,
        },
      );

      // Modül döngüsü nedeniyle NotificationsService yerine doğrudan repo —
      // websocket/push atlanır; olay zaten kullanıcının kendi işlemi, yeni
      // client başarı toast'ı gösterir, zil listesi sonraki fetch'te dolar.
      for (const pitch of scheduled) {
        await this.notificationRepository.save(
          this.notificationRepository.create({
            userId: ownerId,
            type: 'PITCH_DELETION_CANCELLED',
            title: 'Saha Silme İptal Edildi',
            message: `Planınız güncellendiği için ${pitch.name} sahanızın silinmesi iptal edildi; saha yeniden aktifleştirildi.`,
            relatedId: pitch.id,
            read: false,
            metadata: { pitchId: pitch.id },
          }),
        );
      }
    } catch (err) {
      this.logger.error('Planlı saha silme iptali başarısız:', err);
    }
  }

  async scheduleDowngrade(
    ownerId: string,
    planType: string,
    rcCustomerId: string,
    manager?: EntityManager,
  ): Promise<Subscription> {
    const repo =
      manager?.getRepository(Subscription) ?? this.subscriptionRepository;
    const plan = SUBSCRIPTION_PLANS[planType];
    if (!plan) throw new NotFoundException('Geçersiz plan tipi.');

    const subscription = await repo.findOne({ where: { ownerId } });
    if (!subscription) throw new NotFoundException('Abonelik bulunamadı.');
    if (this.applyPendingPlanIfDue(subscription)) {
      await repo.save(subscription);
    }

    // Zaten aynı düşürme planlanmış — retry (örn. linkRevenueCatUser tekrar denemesi)
    if (subscription.pendingPlanType === planType) {
      subscription.revenuecatCustomerId = rcCustomerId;
      return repo.save(subscription);
    }

    const currentPlan = SUBSCRIPTION_PLANS[subscription.planType];
    if (plan.pitchCount >= currentPlan.pitchCount) {
      throw new BadRequestException('Bu işlem bir plan düşürme değil.');
    }

    subscription.pendingPlanType = planType;
    subscription.pendingPlanEffectiveAt =
      subscription.expiresAt ?? subscription.trialEndsAt ?? null;
    subscription.pricePerMonth = plan.pricePerMonth; // bir sonraki dönemde tahsil edilecek tutar hemen gösterilir
    subscription.revenuecatCustomerId = rcCustomerId;

    return repo.save(subscription);
  }

  async handleWebhook(event: RevenueCatWebhookPayload): Promise<void> {
    const { type, app_user_id } = event;
    // RevenueCat her event'te app_user_id gönderir; bozuk/eksik payload'da hiçbir
    // aboneliğe dokunma (tipleme öncesi bu yol tanımsız davranıştı).
    if (!app_user_id) return;

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
          subscription.expiresAt = new Date(event.expiration_at_ms as string);
        }
        this.applyPendingPlanIfDue(subscription);
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
