import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Pitch } from './pitch.entity';

@Entity('time_slots')
export class TimeSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  pitchId: string;

  @ManyToOne(() => Pitch, (pitch) => pitch.timeSlots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pitchId' })
  pitch: Pitch;

  @Column()
  startTime: string; // "09:00" format

  @Column()
  endTime: string; // "10:00" format

  @Column({ default: true })
  isActive: boolean;
}
