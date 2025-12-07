import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { ChatChannel } from './chat-channel.entity';

@Entity('chat_messages')
export class ChatMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    channelId: string;

    @ManyToOne(() => ChatChannel, channel => channel.messages)
    @JoinColumn({ name: 'channelId' })
    channel: ChatChannel;

    @Column()
    senderId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'senderId' })
    sender: User;

    @Column('text')
    content: string;

    @Column({ default: false })
    isSystemMessage: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
