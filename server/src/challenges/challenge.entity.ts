import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Team } from '../teams/team.entity';
import type { MatchAnnouncement } from '../match-announcements/match-announcement.entity';

@Entity('challenges')
export class Challenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ default: 'PENDING' })
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne('Team', { eager: true })
  @JoinColumn({ name: 'fromTeamId' })
  fromTeam: Team;

  @Column({ nullable: true })
  fromTeamId: string;

  @ManyToOne('MatchAnnouncement', { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'toMatchId' })
  match: MatchAnnouncement;

  @Column({ nullable: true })
  toMatchId: string;
}
