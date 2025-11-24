import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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

    @Column('float', { default: 0 })
    rating: number;

    @Column({ nullable: true })
    team_id: string; // Relation will be added later
}
