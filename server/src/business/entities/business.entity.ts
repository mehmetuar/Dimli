import { Entity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Pitch } from '../../pitches/entities/pitch.entity';

@Entity('businesses')
export class Business {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    location: string;

    @Column({ nullable: true })
    phone: string;

    @Column('float', { default: 0 })
    rating: number;

    @OneToMany(() => Pitch, (pitch) => pitch.business)
    pitches: Pitch[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
