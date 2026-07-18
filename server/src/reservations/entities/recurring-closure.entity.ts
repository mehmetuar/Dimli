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
import { Team } from '../../teams/team.entity';

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

  // Abone takım ataması: teamId dolu = tek takım; ikisi de dolu = rakipli
  // çift takım. Kanal bağı chat_channels.relatedClosureId üzerinden kurulur.
  @Column({ nullable: true, type: 'varchar' })
  teamId: string | null;

  @ManyToOne(() => Team, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'teamId' })
  team: Team | null;

  @Column({ nullable: true, type: 'varchar' })
  opponentTeamId: string | null;

  @ManyToOne(() => Team, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'opponentTeamId' })
  opponentTeam: Team | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
