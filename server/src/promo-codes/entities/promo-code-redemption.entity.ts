import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { PromoCode } from './promo-code.entity';

/**
 * Kod kullanım denetim izi (kim / ne zaman / hangi bağlamda). Kullanım limiti
 * `PromoCode.usedCount` sayacıyla atomik uygulanır; bu tablo raporlama içindir.
 * Unique (promoCodeId, ownerId): aynı işletme aynı kodu iki kez kullanamaz.
 */
@Entity('promo_code_redemptions')
@Index(['promoCodeId', 'ownerId'], { unique: true })
export class PromoCodeRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  promoCodeId: string;

  @ManyToOne(() => PromoCode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promoCodeId' })
  promoCode: PromoCode;

  @Index()
  @Column()
  ownerId: string;

  // 'registration' = yeni kayıtta (IAP atlandı) | 'existing' = mevcut işletme
  @Column({ type: 'varchar' })
  context: 'registration' | 'existing';

  @CreateDateColumn({ name: 'redeemed_at' })
  redeemedAt: Date;
}
