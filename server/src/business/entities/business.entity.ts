import { Entity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Pitch } from '../../pitches/entities/pitch.entity';

@Entity('businesses')
export class Business {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    district: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column('float', { nullable: true })
    latitude: number;

    @Column('float', { nullable: true })
    longitude: number;

    @Column({ nullable: true })
    coverImageUrl: string;

    @Column({ nullable: true })
    logoUrl: string;

    @Column({ nullable: true })
    phone: string;



    @Column({ nullable: true })
    openTime: string;

    @Column({ nullable: true })
    closeTime: string;

    @Column('float', { default: 5.0 })
    rating: number;

    @Column('int', { default: 0 })
    ratingCount: number;

    @OneToMany(() => Pitch, (pitch) => pitch.business)
    pitches: Pitch[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
