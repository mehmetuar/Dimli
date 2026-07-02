import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Team } from '../teams/team.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true, unique: true })
  phone: string;

  @Column()
  password: string;

  @Column()
  full_name: string;

  @Column({ nullable: true })
  position: string;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'date', nullable: true })
  birthDate: Date;

  @Column({ nullable: true })
  secondaryPosition: string;

  @Column({ nullable: true })
  foot: string;

  @Column('simple-array', { nullable: true })
  favoriteBusinessIds: string[];

  @Column('float', { default: 0 })
  rating: number;

  @Column({ name: 'avatar_url', nullable: true, type: 'varchar' })
  avatarUrl: string | null;

  @Column({ nullable: true })
  pushToken: string;

  @Index()
  @Column({ nullable: true, name: 'team_id' })
  teamId: string;

  @Column({ default: false })
  phoneVerified: boolean;

  @Index()
  @Column({ default: false })
  isJoker: boolean;

  @Column({ default: true })
  sharesFee: boolean;

  @Column({ default: false })
  isChatBanned: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  chatBannedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  chatBanExpiry: Date | null;

  @Index()
  @Column('float', { nullable: true })
  latitude: number | null;

  @Index()
  @Column('float', { nullable: true })
  longitude: number | null;

  @ManyToOne('Team', (team: Team) => team.players, { nullable: true })
  @JoinColumn({ name: 'team_id' })
  team: Team;
}
