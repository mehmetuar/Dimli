import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';

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

    @Column('float', { default: 0 })
    rating: number;

    @ManyToOne('Team', (team: any) => team.players, { nullable: true })
    team: any; // Using 'any' or import Team to avoid circular dependency issues for now, or use forwardRef
}
