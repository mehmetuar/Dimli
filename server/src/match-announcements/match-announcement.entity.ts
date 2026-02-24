import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Team } from '../teams/team.entity';
import { Pitch } from '../pitches/entities/pitch.entity';

@Entity('match_announcements')
export class MatchAnnouncement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'team_id' })
    teamId: string;

    @ManyToOne(() => Team)
    @JoinColumn({ name: 'team_id' })
    team: Team;

    @Column({ name: 'pitch_id', nullable: true })
    pitchId: string;

    @ManyToOne(() => Pitch)
    @JoinColumn({ name: 'pitch_id' })
    pitch: Pitch;

    @Column()
    date: string; // YYYY-MM-DD

    @Column()
    time: string; // HH:MM

    @Column({ name: 'player_count' })
    playerCount: number; // 5, 6, 7, 8, 11

    @Column('text', { nullable: true })
    description: string;

    @Column({ default: 'PENDING' })
    status: string; // PENDING, CONFIRMED, CANCELLED

    @Column({ name: 'match_type', default: 'rakip_araniyor' })
    matchType: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
