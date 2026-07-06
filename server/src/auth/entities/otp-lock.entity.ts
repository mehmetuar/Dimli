import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

// 5 yanlış OTP denemesi sonrası telefon bazlı geçici engel — tüm amaçları kapsar,
// hem yeni kod gönderimini hem doğrulamayı engeller. DB'de tutulur ki
// restart/deploy kilidi sıfırlamasın.
@Entity('otp_locks')
export class OtpLock {
  @PrimaryColumn()
  phone: string;

  @Column({ type: 'timestamp' })
  lockedUntil: Date;

  @Column({ default: 'wrong_attempts' })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;
}
