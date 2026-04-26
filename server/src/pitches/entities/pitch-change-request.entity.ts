import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Pitch } from './pitch.entity';

export type ChangeRequestType = 'CUSTOM_FACILITY' | 'PHOTO_UPDATE';
export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected';

@Entity('pitch_change_requests')
export class PitchChangeRequest {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'pitch_id' })
    pitchId: string;

    @ManyToOne(() => Pitch)
    @JoinColumn({ name: 'pitch_id' })
    pitch: Pitch;

    @Column({ name: 'business_id' })
    businessId: string;

    @Column()
    type: ChangeRequestType;

    @Column({ default: 'pending' })
    status: ChangeRequestStatus;

    @Column({ type: 'json' })
    requestedData: any; // { facility: string } or { imageUrl: string }

    @Column({ type: 'json', nullable: true })
    currentData: any; // existing value before change

    @Column({ nullable: true })
    rejectionReason: string;

    @Column({ nullable: true })
    reviewedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
