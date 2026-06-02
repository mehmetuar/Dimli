import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Pitch } from '../../pitches/entities/pitch.entity';
import { Team } from '../../teams/team.entity';
import { MatchAnnouncement } from '../../match-announcements/match-announcement.entity';

export enum ReservationStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    CANCELLED = 'CANCELLED'
}

@Index(['pitchId', 'slotTime'])
@Index(['teamId', 'status'])
@Entity()
export class Reservation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    slotTime: Date; // The start time of the reservation

    @Column({
        type: 'enum',
        enum: ReservationStatus,
        default: ReservationStatus.PENDING
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

    @Column({
        type: 'enum',
        enum: ['DIRECT', 'MATCH'],
        default: 'DIRECT'
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

    @CreateDateColumn()
    createdAt: Date;
}
