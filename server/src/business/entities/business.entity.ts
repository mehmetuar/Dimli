import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Pitch } from '../../pitches/entities/pitch.entity';
import { BusinessOwner } from '../../business-owner/entities/business-owner.entity';

@Entity('businesses')
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  district: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Index()
  @Column('float', { nullable: true })
  latitude: number;

  @Index()
  @Column('float', { nullable: true })
  longitude: number;

  @Column({ nullable: true })
  coverImageUrl: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  openTime: string;

  @Column({ nullable: true })
  closeTime: string;

  @Column('float', { default: 5.0 })
  rating: number;

  @Column('int', { default: 0 })
  ratingCount: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'active', 'rejected', 'suspended'],
    default: 'pending',
  })
  status: string;

  @Column({ nullable: true, type: 'text' })
  rejectionReason: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  reviewedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, default: null })
  deletedAt: Date | null;

  // ─── Silme arşivi / nedeni / geri yükleme denetimi ──────────────────────────
  // İşletme silinince doldurulur. Sahip (business_owner) hard-delete edildiğinden,
  // "Silinen İşletmeler" panelinde sahibi gösterebilmek için snapshot tutulur.
  @Column({ nullable: true, type: 'varchar' })
  deletedBy: string | null; // 'owner' | 'admin'

  @Column({ nullable: true, type: 'varchar' })
  deletionReason: string | null;

  @Column({ nullable: true, type: 'text' })
  deletionNote: string | null;

  @Column({ nullable: true, type: 'varchar' })
  ownerNameSnapshot: string | null;

  @Column({ nullable: true, type: 'varchar' })
  ownerEmailSnapshot: string | null;

  @Column({ nullable: true, type: 'varchar' })
  ownerPhoneSnapshot: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  restoredAt: Date | null;

  @Column({ nullable: true, type: 'varchar' })
  restoredBy: string | null; // admin id

  @OneToOne(() => BusinessOwner, (owner) => owner.business)
  owner: BusinessOwner;

  @OneToMany(() => Pitch, (pitch) => pitch.business)
  pitches: Pitch[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
