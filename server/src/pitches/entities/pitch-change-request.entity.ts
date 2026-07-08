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

export type ChangeRequestType =
  | 'CUSTOM_FACILITY'
  | 'PHOTO_UPDATE'
  | 'BUSINESS_PHOTO_UPDATE';
export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected';

// CUSTOM_FACILITY isteğinde requestedData tek `{ facility }`, currentData mevcut
// `{ facilities }` dizisini (snapshot) taşır; PHOTO_UPDATE ve BUSINESS_PHOTO_UPDATE
// isteğinde ikisi de `{ imageUrl }`.
export interface PitchChangeData {
  facility?: string;
  facilities?: string[];
  imageUrl?: string;
}

// BUSINESS_PHOTO_UPDATE isteklerinde pitch_id NULL'dur — istek sahaya değil işletmeye
// (businesses.coverImageUrl) aittir. Business'a ManyToOne EKLENMEZ: business_id kolonu
// varchar, businesses.id uuid → synchronize FK üretirken tip uyuşmazlığıyla patlar.
@Entity('pitch_change_requests')
export class PitchChangeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'pitch_id', nullable: true })
  pitchId: string | null;

  @ManyToOne(() => Pitch, { nullable: true })
  @JoinColumn({ name: 'pitch_id' })
  pitch: Pitch | null;

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
