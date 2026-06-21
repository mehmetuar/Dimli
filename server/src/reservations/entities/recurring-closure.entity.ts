import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Pitch } from '../../pitches/entities/pitch.entity';

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
