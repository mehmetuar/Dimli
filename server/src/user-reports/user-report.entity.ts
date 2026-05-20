import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

export type ReportStatus = 'pending' | 'reviewed' | 'dismissed';

@Entity('user_reports')
@Index(['reportedUserId', 'status'])
@Index(['reporterId'])
@Index(['status'])
export class UserReport {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    reporterId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'reporterId' })
    reporter: User;

    @Column()
    reportedUserId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'reportedUserId' })
    reportedUser: User;

    @Column({ nullable: true, type: 'varchar' })
    messageId: string | null;

    @Column({ nullable: true, type: 'varchar' })
    channelId: string | null;

    @Column({ nullable: true, type: 'text' })
    note: string | null;

    @Column({ default: 'pending' })
    status: ReportStatus;

    @CreateDateColumn()
    createdAt: Date;
}
