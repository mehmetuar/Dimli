import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

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
  fromTeam: any;

  @Column({ nullable: true })
  fromTeamId: string;

  @ManyToOne('MatchAnnouncement', { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'toMatchId' })
  match: any;

  @Column({ nullable: true })
  toMatchId: string;
}
