import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Pitch } from '../../pitches/entities/pitch.entity';

// Aynı saha+gün+saat için aktif iki kural oluşmasını DB seviyesinde de
// engeller — createRecurringClosure()'daki idempotency kontrolünün
// güvencesi (uygulama katmanı yarış durumlarına karşı).
@Index(['pitchId', 'dayOfWeek', 'startTime', 'endTime'], { unique: true })
@Entity('recurring_closures')
export class RecurringClosure {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  pitchId: string;

  @ManyToOne(() => Pitch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pitchId' })
  pitch: Pitch;

  @Column()
  dayOfWeek: string; // 'Monday'..'Sunday' — Pitch.closedDays ile aynı konvansiyon

  @Column()
  startTime: string; // "21:00"

  @Column()
  endTime: string; // "22:00"

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
