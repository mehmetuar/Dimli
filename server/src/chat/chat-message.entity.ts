import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { ChatChannel } from './chat-channel.entity';

// Sistem/aksiyon mesajlarının metadata sözleşmesi (katı discriminated union).
// Yeni bir sistem-mesaj tipi eklerken buraya YENİ ARM ekle — union'ı gevşetme.
// Yazıcılar: chat.service (joker/rematch akışları) + reservation-* servisleri
// (ReservationSupportService.sendSystemMessage aktarıcısı üzerinden).
export type ChatMessageMetadata =
  // Rezervasyon yaşam döngüsü ailesi — hepsi { type, reservationId }
  | {
      type:
        | 'MATCH_APPROVED'
        | 'MATCH_REJECTED'
        | 'MATCH_REJECTED_PASSIVE'
        | 'MATCH_CANCELLED_BY_CAPTAIN'
        | 'MATCH_REVOKED_TO_PENDING'
        | 'MATCH_RESTORED_TO_PENDING'
        | 'MATCH_CANCELLED_BY_BUSINESS_APPROVAL'
        | 'MANUAL_FILL_REJECTED'
        | 'MANUAL_FILL_REVOKED'
        | 'CANCEL_REQUEST_SENT'
        | 'CANCEL_REQUEST_REJECTED'
        | 'UNDO_CANCEL_REQUEST'
        | 'BUSINESS_NOTE'
        | 'TIME_CONFLICT_CANCELLED'
        | 'INFO'
        | 'BUSINESS_CLOSED'
        | 'PITCH_REMOVED'
        | 'PITCH_SCHEDULED_OFFLINE';
      reservationId: string;
    }
  // Saat teklifi kartı — yazımda Date, json kolonundan geri okunduğunda ISO string
  | {
      type: 'PROPOSAL_ACTION';
      reservationId: string;
      proposedTime: Date | string;
    }
  | {
      type: 'REMATCH_PROPOSAL';
      challengeId: string;
      matchAnnouncementId: string;
      channelId: string;
    }
  // İşletmenin abone (SUBSCRIPTION) sohbetine düşürdüğü not. BUSINESS_NOTE'un
  // ikizi ama abonelikte rezervasyon yok → bağ rezervasyona değil kurala kurulur.
  | { type: 'SUBSCRIPTION_NOTE'; closureId: string }
  | { type: 'MATCH_CONFIRMED'; matchAnnouncementId: string }
  | { type: 'JOKER_NEGOTIATION_STARTED'; matchId: string; jokerId: string }
  | { type: 'JOKER_JOINED'; jokerId: string; invitingTeamId: string | null }
  | { type: 'JOKER_ADDED_TO_MATCH' }
  | { type: 'JOKER_LEFT'; jokerId: string }
  // Anket duyurusu — anket verisi polls tablosunda yaşar (oylar sürekli değişir,
  // metadata bir kez yazılır); client pollId ile kendi poll haritasından join'ler.
  | { type: 'POLL'; pollId: string };

@Index(['channelId', 'createdAt'])
@Index(['channelId'])
@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  channelId: string;

  @ManyToOne(() => ChatChannel, (channel) => channel.messages, {
    onDelete: 'CASCADE',
  })
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
  metadata: ChatMessageMetadata | null; // aksiyon/sistem mesajı sözleşmesi (üstteki union)

  // Cevaplanan mesaj (WhatsApp tarzı alıntı). Mesajlar tek tek silinmediği için
  // FK pratikte dangling olmaz; SET NULL kanal CASCADE teardown penceresi için emniyet.
  @Column({ nullable: true, type: 'uuid' })
  replyToId: string | null;

  @ManyToOne(() => ChatMessage, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'replyToId' })
  replyTo: ChatMessage | null;

  @CreateDateColumn()
  createdAt: Date;
}
