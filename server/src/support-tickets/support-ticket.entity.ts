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
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';

export type SupportAudience = 'user' | 'business';
export type SupportTicketStatus = 'pending' | 'answered' | 'reviewed';

// Kategori key'leri tek kaynak burası — client etiketleri bu key'lere eşlenir.
export const USER_SUPPORT_CATEGORIES = [
  'MATCH_RESERVATION',
  'TEAM',
  'TECHNICAL',
  'ACCOUNT',
  'SUGGESTION',
  'OTHER',
] as const;

export const BUSINESS_SUPPORT_CATEGORIES = [
  'RESERVATION',
  'PAYMENT_SUBSCRIPTION',
  'TECHNICAL',
  'ACCOUNT_OWNER',
  'SUGGESTION',
  'OTHER',
] as const;

@Entity('support_tickets')
@Index(['audience', 'status', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['ownerId', 'createdAt'])
@Index(['status'])
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  audience: SupportAudience;

  @Column({ nullable: true, type: 'varchar' })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ nullable: true, type: 'varchar' })
  ownerId: string | null;

  @ManyToOne(() => BusinessOwner, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: BusinessOwner | null;

  @Column({ type: 'varchar', length: 40 })
  category: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: 'pending' })
  status: SupportTicketStatus;

  @Column({ nullable: true, type: 'text' })
  adminReply: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  repliedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
