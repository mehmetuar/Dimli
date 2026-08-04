import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ChatChannel } from '../chat/chat-channel.entity';
import { User } from '../users/user.entity';
import { PollOption } from './poll-option.entity';

// WhatsApp tarzı sohbet anketi — yalnız kendi aramızda maç sohbetlerinde
// (MATCH_GROUP + reservation.opponentTeamId yok) kaptan/yardımcı oluşturur.
// Duyurusu {type:'POLL', pollId} metadata'lı sistem mesajıdır; oy verileri
// burada yaşar (mesaj metadata'sı bir kez yazılır, oylar sürekli değişir).
@Index(['channelId'])
@Entity('polls')
export class Poll {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  channelId: string;

  // Gerçek FK: kanal silinince anket (ve CASCADE ile seçenek/oylar) temizlenir
  @ManyToOne(() => ChatChannel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channelId' })
  channel: ChatChannel;

  // Hesap silinse de kart yaşasın diye SET NULL
  @Column({ nullable: true, type: 'varchar' })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User | null;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  // "Birden fazla yanıta izin ver" (WhatsApp anahtarı)
  @Column({ default: false })
  allowMultiple: boolean;

  @Column({ default: false })
  isClosed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @Column({ nullable: true, type: 'varchar' })
  closedById: string | null;

  // Duyuru sistem mesajına geri bağ (teşhis/ileride deep-link)
  @Column({ nullable: true, type: 'uuid' })
  messageId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => PollOption, (option) => option.poll)
  options: PollOption[];
}
