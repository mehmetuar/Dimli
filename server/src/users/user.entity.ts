import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column({ unique: true })
    username: string;

    @Column({ nullable: true })
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

    @Column({ nullable: true, name: 'team_id' })
    teamId: string;

    @Column({ default: false })
    phoneVerified: boolean;

    @Column({ default: false })
    isJoker: boolean;

    @Column({ default: true })
    sharesFee: boolean;

    @ManyToOne('Team', (team: any) => team.players, { nullable: true })
    @JoinColumn({ name: 'team_id' })
    team: any; // Using 'any' or import Team to avoid circular dependency issues for now, or use forwardRef
}
