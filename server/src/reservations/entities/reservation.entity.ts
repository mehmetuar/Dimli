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
import { MatchAnnouncement } from '../../match-announcements/match-announcement.entity';
import { RecurringClosure } from './recurring-closure.entity';

export enum ReservationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

@Index(['pitchId', 'slotTime'])
@Index(['teamId', 'status'])
// Geçmiş/yaklaşan maç sorguları (teamId OR opponentTeamId) filtreler — OR'un
// ikinci kolu indekssiz kalınca veri büyüyünce seq-scan olur.
@Index(['opponentTeamId', 'status'])
// İşletme istatistiği (getStats): pitchId + status=APPROVED + slotTime aralığı
// sayımları bu bileşik indeksten okur. Dashboard gün sorgusu (pitchId + slotTime
// aralığı) ise yukarıdaki [pitchId, slotTime]'dan okumaya devam eder.
@Index(['pitchId', 'status', 'slotTime'])
// Sabit-kapatma (recurring closure) ve maç-ilanı FK lookup'ları — bu kolonlar
// indekssizdi (canlı DB'de doğrulandı); veri büyüyünce seq-scan olur.
@Index(['recurringClosureId'])
@Index(['matchAnnouncementId'])
@Entity()
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  slotTime: Date; // The start time of the reservation

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  // ✅ CRITICAL FIX: Add explicit foreign key columns
  @Column({ nullable: true })
  pitchId: string;

  @ManyToOne(() => Pitch)
  @JoinColumn({ name: 'pitchId' })
  pitch: Pitch;

  @Column({ nullable: true })
  teamId: string;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'teamId' })
  team: Team;

  // Optional: Opponent team if it was a match request
  @Column({ nullable: true })
  opponentTeamId: string;

  @ManyToOne(() => Team, { nullable: true })
  @JoinColumn({ name: 'opponentTeamId' })
  opponentTeam: Team;

  // Bir takım silinince teamId/opponentTeamId NULL'lanır (FK) → rakibin KİM olduğu
  // kaybolur. purgeTeam bu maçlar için silinen takımın adını buraya snapshot'lar ki
  // maç geçmişi/fair-play akışı "Bu takım artık mevcut değil" diye bilgilendirebilsin.
  @Column({ type: 'varchar', nullable: true })
  deletedTeamName: string | null;

  @Column({
    type: 'enum',
    enum: ['DIRECT', 'MATCH'],
    default: 'DIRECT',
  })
  type: 'DIRECT' | 'MATCH'; // Reservation type: direct booking or match-based

  // Reference to match announcement if type is MATCH
  @Column({ nullable: true })
  matchAnnouncementId: string;

  @ManyToOne(() => MatchAnnouncement, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'matchAnnouncementId' })
  matchAnnouncement: MatchAnnouncement;

  @Column({ nullable: true })
  proposedTime: Date; // For conflict resolution: suggested new time

  @Column({ nullable: true })
  proposedByUserId: string; // Who proposed the new time?

  @Column({ default: false })
  cancelRequested: boolean;

  @Column({ nullable: true })
  cancelRequestedByTeamId: string;

  @Column({ default: false })
  reminderSent: boolean;

  // Bu rezervasyon bir RecurringClosure kuralından materialize edildiyse, kuralın id'si.
  // null ise tekil manuel kapatma (manualFill) ya da gerçek bir takım rezervasyonudur.
  @Column({ nullable: true })
  recurringClosureId: string;

  @ManyToOne(() => RecurringClosure, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'recurringClosureId' })
  recurringClosure: RecurringClosure;

  @CreateDateColumn()
  createdAt: Date;
}
