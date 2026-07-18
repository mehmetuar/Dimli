import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { ChatParticipant } from './chat-participant.entity';
import { RecurringClosure } from '../reservations/entities/recurring-closure.entity';

@Entity('chat_channels')
export class ChatChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type:
    | 'DM'
    | 'MATCH_GROUP'
    | 'TEAM_INTERNAL'
    | 'JOKER_NEGOTIATION'
    | 'SUBSCRIPTION';

  @Column({ nullable: true })
  name: string; // e.g., "Match: Team A vs Team B"

  @OneToMany(() => ChatParticipant, (participant) => participant.channel)
  participants: ChatParticipant[];

  @OneToMany(() => ChatMessage, (message) => message.channel)
  messages: ChatMessage[];

  @Column({ nullable: true })
  relatedMatchId: string; // Optional: Link to a match

  // SUBSCRIPTION kanallarını sabit kapatma kuralına bağlar. relatedMatchId'nin
  // aksine gerçek FK: kural silinince kanal (ve CASCADE ile mesaj/katılımcılar)
  // otomatik temizlenir — §45'teki yetim kanal sorununun yapısal önlemi.
  @Column({ nullable: true, type: 'varchar' })
  relatedClosureId: string | null;

  @ManyToOne(() => RecurringClosure, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'relatedClosureId' })
  relatedClosure: RecurringClosure | null;

  @CreateDateColumn()
  createdAt: Date;

  @Index()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastActivityAt: Date;
}
