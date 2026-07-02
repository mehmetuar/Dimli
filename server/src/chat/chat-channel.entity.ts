import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { ChatParticipant } from './chat-participant.entity';

@Entity('chat_channels')
export class ChatChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: 'DM' | 'MATCH_GROUP' | 'TEAM_INTERNAL' | 'JOKER_NEGOTIATION';

  @Column({ nullable: true })
  name: string; // e.g., "Match: Team A vs Team B"

  @OneToMany(() => ChatParticipant, (participant) => participant.channel)
  participants: ChatParticipant[];

  @OneToMany(() => ChatMessage, (message) => message.channel)
  messages: ChatMessage[];

  @Column({ nullable: true })
  relatedMatchId: string; // Optional: Link to a match

  @CreateDateColumn()
  createdAt: Date;

  @Index()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastActivityAt: Date;
}
