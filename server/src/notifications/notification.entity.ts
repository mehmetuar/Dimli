import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    type: 'JOIN_REQUEST' | 'CHALLENGE' | 'MATCH_RESULT' | 'SYSTEM' | 'MATCH_REMINDER' | 'RESERVATION_REQUEST' | 'REMATCH_PROPOSAL' | 'CANCEL_REQUEST';

    @Column({ nullable: true })
    title: string;

    @Column({ nullable: true })
    message: string;

    @Column({ nullable: true })
    relatedId: string;

    @Column({ type: 'json', nullable: true })
    metadata: any;

    @Column({ default: false })
    read: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
