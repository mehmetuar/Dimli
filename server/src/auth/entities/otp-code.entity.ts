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

    @CreateDateColumn()
    createdAt: Date;
}
