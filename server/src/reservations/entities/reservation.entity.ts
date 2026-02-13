import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Pitch } from '../../pitches/entities/pitch.entity';
import { Team } from '../../teams/team.entity';

export enum ReservationStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    CANCELLED = 'CANCELLED'
}

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

    @Column({ nullable: true })
    matchAnnouncementId: string; // Reference to match announcement if type is MATCH

    @CreateDateColumn()
    createdAt: Date;
}
