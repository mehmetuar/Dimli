import { Entity, Column, PrimaryGeneratedColumn, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity()
export class Team {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ name: 'logo_url', nullable: true })
    logoUrl: string;

    @Column({ name: 'primary_color', nullable: true })
    primaryColor: string;

    @Column({ nullable: true })
    level: string; // 'BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO'

    @Column({ nullable: true })
    location: string;

    @Column('text', { nullable: true })
    description: string;

    @Column('float', { name: 'fair_play_score', default: 5.0 })
    fairPlayScore: number;

    @Column('int', { default: 0 })
    wins: number;

    @Column('int', { default: 0 })
    losses: number;

    // Relations
    @OneToOne(() => User)
    @JoinColumn()
    captain: User;

    @OneToOne(() => User, { nullable: true })
    @JoinColumn()
    viceCaptain: User;

    @OneToMany(() => User, (user) => user.team, { cascade: true })
    players: User[];
}
