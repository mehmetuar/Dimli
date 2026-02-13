import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { Business } from '../../business/entities/business.entity';

@Entity()
export class BusinessOwner {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @Column()
    fullName: string;

    @Column({ nullable: true })
    phone: string;

    @OneToOne(() => Business, { nullable: true })
    @JoinColumn()
    business: Business;
}
