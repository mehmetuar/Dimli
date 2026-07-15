import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Between,
  EntityManager,
  IsNull,
  LessThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import {
  Subscription,
  SubscriptionStatus,
} from './entities/subscription.entity';
import { Pitch } from '../pitches/entities/pitch.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { Notification } from '../notifications/notification.entity';
import { FirebaseService } from '../firebase/firebase.service';
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
    // Firebase leaf servis — NotificationsModule'deki gibi ad-hoc provider;
    // cron davetli üyelik hatırlatmalarını push olarak da gönderir (yaprak bozulmaz).
    private firebaseService: FirebaseService,
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

  /**
   * Davet/partner kodu ile ücretsiz abonelik oluşturur (yeni kayıt yolu).
   * `pricePerMonth=0`, `status=COMPLIMENTARY`. `complimentaryUntil=null` ise
   * süresiz (cron dokunmaz), dolu ise o tarihte cron EXPIRED'a düşürür.
   * Transaction içinde çağrılabilmesi için opsiyonel `manager` alır (kayıt
   * akışı bunu queryRunner.manager ile geçer — atomik).
   */
  async createComplimentarySubscription(
    ownerId: string,
    planType: string,
    complimentaryUntil: Date | null,
    promoCodeId: string,
    manager?: EntityManager,
  ): Promise<Subscription> {
    const plan = SUBSCRIPTION_PLANS[planType];
    if (!plan) throw new NotFoundException('Geçersiz plan tipi.');

    const repo =
      manager?.getRepository(Subscription) ?? this.subscriptionRepository;

    const subscription = repo.create({
      ownerId,
      planType,
      pitchCount: plan.pitchCount,
      pricePerMonth: 0,
      status: SubscriptionStatus.COMPLIMENTARY,
      complimentaryUntil,
      complimentaryReminderSentAt: null,
      promoCodeId,
    });

    return repo.save(subscription);
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
    // Davetli üyelikten bilinçli ücretliye geçiş: complimentary kalıntısını
    // temizle (aksi halde expiry cron'u ücretli aboneliği hedef alabilir).
    subscription.complimentaryUntil = null;
    subscription.complimentaryReminderSentAt = null;
    subscription.complimentaryReminderStage = 0;
    subscription.promoCodeId = null;

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

    // Davetli (complimentary) abonelik store olaylarından ETKİLENMEZ. Mevcut bir
    // işletme kod kullandıktan sonra store aboneliği bir süre daha
    // RENEWAL/CANCELLATION/EXPIRATION üretebilir; hiçbiri ücretsiz erişimi
    // bozmamalı. RENEWAL statüyü ACTIVE'e çevirir, ardından gelen EXPIRATION
    // erişimi öldürürdü — bu yüzden TÜM tipler atlanır. Ücretliye bilinçli
    // dönüş tek yoldan olur: confirm-purchase (complimentary alanlarını temizler).
    if (subscription.status === SubscriptionStatus.COMPLIMENTARY) {
      this.logger.log(
        `Webhook ${type} atlandı — davetli (complimentary) abonelik (owner ${subscription.ownerId}).`,
      );
      return;
    }

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

  // ─── Davetli (complimentary) üyelik süre yönetimi ─────────────────────────
  // Sunucuda genel bir trial-expiry cron'u YOK (trialEndsAt geçince kimse
  // dokunmaz; EXPIRED yalnız RC webhook'la gelir). Süreli davetli üyeliklerin
  // bitişini bu cron yönetir. Yalnız Subscription + Notification repo kullanır
  // → SubscriptionModule yaprak kalır. complimentaryUntil=null (süresiz) hiç
  // yakalanmaz.
  // İşletme sahibine bildirim (DB) + best-effort push. Modül döngüsü nedeniyle
  // NotificationsService yerine doğrudan repo + Firebase (yaprak kural). metadata
  // { screen:'subscription' } → client bildirime/push'a tıklayınca abonelik ayarları.
  private async notifyOwner(
    ownerId: string,
    type: 'SUBSCRIPTION_EXPIRED' | 'SUBSCRIPTION_REMINDER',
    title: string,
    message: string,
  ): Promise<void> {
    await this.notificationRepository.save(
      this.notificationRepository.create({
        userId: ownerId,
        type,
        title,
        message,
        read: false,
        metadata: { screen: 'subscription' },
      }),
    );
    try {
      const owner = await this.businessOwnerRepository.findOne({
        where: { id: ownerId },
      });
      if (owner?.pushToken) {
        await this.firebaseService.sendToDevice(
          owner.pushToken,
          title,
          message,
          {
            type,
            screen: 'subscription',
          },
        );
      }
    } catch (err) {
      this.logger.warn(
        `Davetli üyelik push gönderilemedi (owner ${ownerId}): ${String(err)}`,
      );
    }
  }

  private formatPlanPrice(planType: string): string {
    const plan = SUBSCRIPTION_PLANS[planType];
    if (!plan) return '';
    return `${Number(plan.pricePerMonth).toLocaleString('tr-TR')} TL/ay`;
  }

  private formatTrDate(d: Date): string {
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Istanbul',
    });
  }

  @Cron(CronExpression.EVERY_HOUR, { name: 'complimentary_expiry' })
  async processComplimentaryExpiry(): Promise<void> {
    const now = new Date();
    const DAY = 24 * 60 * 60 * 1000;

    // 1) Süresi dolanlar → EXPIRED (complimentary alanları denetim izi olarak
    //    KORUNUR; client'taki expired gate satın almaya zorlar).
    const due = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.COMPLIMENTARY,
        complimentaryUntil: LessThanOrEqual(now),
      },
    });
    for (const sub of due) {
      try {
        sub.status = SubscriptionStatus.EXPIRED;
        await this.subscriptionRepository.save(sub);
        const price = this.formatPlanPrice(sub.planType);
        await this.notifyOwner(
          sub.ownerId,
          'SUBSCRIPTION_EXPIRED',
          'Davetli Üyeliğiniz Sona Erdi',
          `Davetli ücretsiz üyeliğinizin süresi doldu. Sahalarınızın yayında kalması için ${
            price ? `planınızı (${price}) ` : 'planınızı '
          }abonelik ayarlarından satın alabilirsiniz.`,
        );
      } catch (err) {
        this.logger.error(
          `Davetli üyelik süre dolumu işlenemedi (owner ${sub.ownerId}):`,
          err,
        );
      }
    }

    // 2) Kademeli hatırlatma: 1 ay (≤30g), 1 hafta (≤7g), 3 gün (≤3g) kala.
    //    Her kademe bir kez; complimentaryReminderStage yalnız ileri gider.
    const monthWindow = new Date(now.getTime() + 30 * DAY);
    const toRemind = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.COMPLIMENTARY,
        complimentaryUntil: Between(now, monthWindow),
      },
    });
    for (const sub of toRemind) {
      try {
        if (!sub.complimentaryUntil) continue;
        const daysLeft =
          (sub.complimentaryUntil.getTime() - now.getTime()) / DAY;
        const targetStage = daysLeft <= 3 ? 3 : daysLeft <= 7 ? 2 : 1;
        if (targetStage <= sub.complimentaryReminderStage) continue;

        const price = this.formatPlanPrice(sub.planType);
        const dateStr = this.formatTrDate(sub.complimentaryUntil);
        const leadLabel =
          targetStage === 3
            ? 'son 3 gün'
            : targetStage === 2
              ? 'yaklaşık 1 hafta'
              : 'yaklaşık 1 ay';
        await this.notifyOwner(
          sub.ownerId,
          'SUBSCRIPTION_REMINDER',
          'Davetli Üyeliğiniz Sona Eriyor',
          `Davetli ücretsiz üyeliğinizin bitişine ${leadLabel} kaldı (${dateStr}). ` +
            `Kesintisiz devam için planınızı${price ? ` (${price})` : ''} abonelik ayarlarından şimdi satın alabilirsiniz.`,
        );
        sub.complimentaryReminderStage = targetStage;
        sub.complimentaryReminderSentAt = now;
        await this.subscriptionRepository.save(sub);
      } catch (err) {
        this.logger.error(
          `Davetli üyelik hatırlatması gönderilemedi (owner ${sub.ownerId}):`,
          err,
        );
      }
    }
  }
}
