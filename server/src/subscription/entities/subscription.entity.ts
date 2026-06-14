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
}

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

    @Column({ nullable: true })
    pendingPlanType: string | null;

    @Column({ nullable: true, type: 'timestamp' })
    pendingPlanEffectiveAt: Date | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
