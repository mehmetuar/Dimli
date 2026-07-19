import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BusinessOwner } from '../../business-owner/entities/business-owner.entity';

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  // Davet/partner kodu ile verilen ücretsiz erişim. Kaynağı bu tablodur; RC
  // store olayları bu durumu ETKİLEMEZ (handleWebhook guard'ı). pricePerMonth=0.
  COMPLIMENTARY = 'complimentary',
}

// Müşteri tarafında işletmenin görünür + rezervasyon alabilir sayıldığı abonelik
// statüleri. TEK KAYNAK — business/reservation/match-announcements sorguları bunu
// kullanır (davetli üyeler ücretli üyeler gibi tam görünür). Yeni bir "görünür"
// statü eklenirse yalnız burada güncelle.
export const CUSTOMER_VISIBLE_SUBSCRIPTION_STATUSES: string[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIAL,
  SubscriptionStatus.COMPLIMENTARY,
];

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => BusinessOwner, { nullable: false })
  @JoinColumn()
  owner: BusinessOwner;

  @Column()
  ownerId: string;

  // 1_pitch | 2_pitch | 3_pitch | 4_pitch | 5plus_pitch
  @Column()
  planType: string;

  @Column('int')
  pitchCount: number;

  @Column('decimal', { precision: 10, scale: 2 })
  pricePerMonth: number;

  @Column({ nullable: true })
  revenuecatCustomerId: string;

  @Column({ nullable: true })
  revenuecatEntitlementId: string;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.TRIAL,
  })
  status: SubscriptionStatus;

  @Column({ nullable: true, type: 'timestamp' })
  trialEndsAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  expiresAt: Date;

  @Column({ nullable: true, type: 'varchar' })
  pendingPlanType: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  pendingPlanEffectiveAt: Date | null;

  // ─── Davet kodu (complimentary) alanları ───────────────────────────────────
  // null = süresiz (ömür boyu) ücretsiz; dolu = bu tarihte cron EXPIRED'a düşürür.
  @Column({ nullable: true, type: 'timestamp' })
  complimentaryUntil: Date | null;

  // Süre bitişine 7 gün kala tek seferlik hatırlatma damgası (eski tek-eşik
  // mantığı; çoklu kademe complimentaryReminderStage ile yönetilir).
  @Column({ nullable: true, type: 'timestamp' })
  complimentaryReminderSentAt: Date | null;

  // Gönderilen son hatırlatma kademesi: 0=hiç, 1=1 ay, 2=1 hafta, 3=3 gün kala,
  // 4=ödeme penceresi (grace) başladı, 5=grace ortası son-gün uyarısı.
  // Aynı kademe tekrar gönderilmez; kademe yalnız ileri gider.
  @Column({ type: 'smallint', default: 0 })
  complimentaryReminderStage: number;

  // Davetli üyelik bitince başlayan 1 haftalık ödeme penceresi (grace) bitişi.
  // Dolu + status=complimentary → işletme grace döneminde (tam işlevsel, müşteriye
  // görünür). Cron graceUntil geçince EXPIRED'a düşürür; confirmPurchase satın
  // almada temizler. EXPIRED sonrası audit izi olarak korunur.
  @Column({ nullable: true, type: 'timestamp' })
  graceUntil: Date | null;

  // Hangi promosyon kodundan geldiği (denetim izi).
  @Column({ nullable: true, type: 'varchar' })
  promoCodeId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
