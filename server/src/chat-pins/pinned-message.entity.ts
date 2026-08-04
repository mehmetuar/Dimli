import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ChatChannel } from '../chat/chat-channel.entity';
import { ChatMessage } from '../chat/chat-message.entity';
import { User } from '../users/user.entity';

// Sohbet tepesine sabitlenmiş mesaj (WhatsApp tarzı). Slot modeli TAKIM
// bazlıdır: kanal başına takım başına TEK sabit (@Unique) — rakipli maçta iki
// takımın kaptanları birbirinin sabitine dokunamaz, çakışma yapısal olarak imkansız.
@Unique(['channelId', 'teamId'])
@Index(['channelId'])
@Entity('chat_pinned_messages')
export class PinnedMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  channelId: string;

  @ManyToOne(() => ChatChannel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channelId' })
  channel: ChatChannel;

  // Slotun sahibi takım — kanalın bağlam takımlarından biri (reservation/closure)
  @Column()
  teamId: string;

  @Column()
  messageId: string;

  @ManyToOne(() => ChatMessage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: ChatMessage;

  @Column({ nullable: true, type: 'varchar' })
  pinnedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pinnedById' })
  pinnedBy: User | null;

  @CreateDateColumn()
  pinnedAt: Date;
}
