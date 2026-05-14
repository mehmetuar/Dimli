import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';
import { ChatChannel } from './chat-channel.entity';

@Index(['channelId', 'createdAt'])
@Index(['channelId'])
@Entity('chat_messages')
export class ChatMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    channelId: string;

    @ManyToOne(() => ChatChannel, channel => channel.messages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'channelId' })
    channel: ChatChannel;

    @Column({ nullable: true, type: 'varchar' })
    senderId: string | null;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'senderId' })
    sender: User;

    @Column('text')
    content: string;

    @Column({ default: false })
    isSystemMessage: boolean;

    @Column('json', { nullable: true })
    metadata: any; // For actionable messages (e.g. { type: 'PROPOSAL', reservationId: '...' })

    @CreateDateColumn()
    createdAt: Date;
}
