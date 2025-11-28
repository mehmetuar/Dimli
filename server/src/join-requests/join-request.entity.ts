import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Team } from '../teams/team.entity';

@Entity('join_requests')
export class JoinRequest {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    teamId: string;

    @ManyToOne(() => Team)
    @JoinColumn({ name: 'teamId' })
    team: Team;

    @Column({ type: 'text', nullable: true })
    message: string;

    @Column({ default: 'PENDING' })
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';

    @CreateDateColumn()
    createdAt: Date;
}
