import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Team } from '../teams/team.entity';
import { User } from '../users/user.entity';

@Entity('team_bans')
@Index(['teamId', 'userId'], { unique: true })
export class TeamBan {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    teamId: string;

    @ManyToOne(() => Team, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'teamId' })
    team: Team;

    @Column()
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @CreateDateColumn()
    createdAt: Date;
}
