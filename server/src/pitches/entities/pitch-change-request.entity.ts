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

// CUSTOM_FACILITY isteğinde requestedData tek `{ facility }`, currentData mevcut
// `{ facilities }` dizisini (snapshot) taşır; PHOTO_UPDATE isteğinde ikisi de `{ imageUrl }`.
export interface PitchChangeData {
  facility?: string;
  facilities?: string[];
  imageUrl?: string;
}

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
  requestedData: PitchChangeData; // { facility } veya { imageUrl }

  @Column({ type: 'json', nullable: true })
  currentData: PitchChangeData; // değişiklikten önceki değer

  @Column({ nullable: true })
  rejectionReason: string;

  @Column({ nullable: true })
  reviewedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
