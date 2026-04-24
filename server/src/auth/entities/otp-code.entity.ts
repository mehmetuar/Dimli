import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('otp_codes')
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
    purpose: string; // 'registration' | 'password_reset'

    @Column({ default: 0 })
    attempts: number;

    @CreateDateColumn()
    createdAt: Date;
}
