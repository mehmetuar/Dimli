import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('challenges')
export class Challenge {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    fromTeamId: string;

    @Column()
    toMatchId: string;

    @Column({ type: 'text', nullable: true })
    note: string;

    @Column({ default: 'PENDING' })
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';

    @CreateDateColumn()
    createdAt: Date;
}
