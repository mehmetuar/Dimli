import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('otp_codes')
@Index(['phone', 'purpose'])
export class OtpCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  phone: string;

  @Column()
  code: string;

  @Column({ default: false })
  verified: boolean;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: 'registration' })
  purpose: string; // OtpPurpose (otp-security.service.ts): 'registration' | 'password_reset' | 'business_registration' | 'business_password_reset'

  @Column({ default: 0 })
  attempts: number;

  @CreateDateColumn()
  createdAt: Date;
}
