import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { ChatChannel } from './chat-channel.entity';

@Entity('chat_participants_v2')
export class ChatParticipant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    channelId: string;

    @ManyToOne(() => ChatChannel, channel => channel.participants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'channelId' })
    channel: ChatChannel;

    @Column()
    userId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    lastReadAt: Date;

    @CreateDateColumn()
    joinedAt: Date;
}
