import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Davet/partner kodu. İlk işletmelere ücretsiz erişim için sunucu-tarafı kod
 * sistemi (store offer code / RevenueCat entitlement KULLANILMAZ — abonelik
 * durumunun kaynağı `subscriptions` tablosudur). Kod tüketimi atomik koşullu
 * UPDATE ile yapılır (usedCount < maxRedemptions), yarış durumunda Postgres
 * satır kilidi serileştirir.
 */
@Entity('promo_codes')
export class PromoCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Format: DIMLI-XXXXXXXX (büyük harf). Alfabe karışabilir karakter içermez.
  @Index({ unique: true })
  @Column()
  code: string;

  // Admin etiketi (partner adı / kampanya notu).
  @Column({ nullable: true, type: 'varchar' })
  note: string | null;

  // null = süresiz (ömür boyu ücretsiz); dolu = complimentary abonelik bu kadar
  // ay sürer, sonra cron EXPIRED'a düşürür.
  @Column({ nullable: true, type: 'int' })
  durationMonths: number | null;

  @Column({ type: 'int', default: 1 })
  maxRedemptions: number;

  @Column({ type: 'int', default: 0 })
  usedCount: number;

  @Column({ default: true })
  isActive: boolean;

  // Kodun kendisinin son kullanılma tarihi (opsiyonel — verilen ücretsiz süre
  // DEĞİL; kodun kullanılabildiği pencere).
  @Column({ nullable: true, type: 'timestamp' })
  expiresAt: Date | null;

  @Column({ nullable: true, type: 'varchar' })
  createdByAdminId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
