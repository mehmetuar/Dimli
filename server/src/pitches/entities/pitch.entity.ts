import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Business } from '../../business/entities/business.entity';
import { MatchAnnouncement } from '../../match-announcements/match-announcement.entity';
import { TimeSlot } from './time-slot.entity';

export type PitchApprovalStatus = 'approved' | 'pending' | 'rejected';

// İşletme→saha join'leri ve approved-pitch alt sorguları (business.service
// geoCandidates/fetchBusinessesByIds) bu bileşik indeksten okur.
@Index(['businessId', 'approvalStatus'])
@Entity('pitches')
export class Pitch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g., "1 No'lu Saha", "Kapalı Saha"

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'business_id' })
  businessId: string;

  @ManyToOne(() => Business, (business) => business.pitches)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @OneToMany(() => MatchAnnouncement, (announcement) => announcement.pitch)
  matchAnnouncements: MatchAnnouncement[];

  @OneToMany(() => TimeSlot, (timeSlot) => timeSlot.pitch, {
    cascade: true,
    eager: true,
  })
  timeSlots: TimeSlot[];

  @Column({ nullable: true })
  type: string; // 'INDOOR', 'OUTDOOR'

  @Column('float', { nullable: true })
  pricePerHour: number;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  openTime: string;

  @Column({ nullable: true })
  closeTime: string;

  @Column('simple-array', { nullable: true })
  facilities: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column('simple-array', { nullable: true })
  closedDays: string[]; // e.g. ['Sunday', 'Monday']

  @Column({
    type: 'enum',
    enum: ['approved', 'pending', 'rejected'],
    default: 'approved',
  })
  approvalStatus: PitchApprovalStatus;

  @Column({ nullable: true, type: 'text' })
  rejectionReason: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  reviewedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, default: null })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
