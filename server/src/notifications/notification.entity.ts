import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

// findByUser (WHERE userId ORDER BY createdAt DESC) + unread-count bu indeksten okur.
@Index(['userId', 'createdAt'])
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  type:
    | 'JOIN_REQUEST'
    | 'CHALLENGE'
    | 'MATCH_RESULT'
    | 'SYSTEM'
    | 'MATCH_REMINDER'
    | 'RESERVATION_REQUEST'
    | 'REMATCH_PROPOSAL'
    | 'CANCEL_REQUEST'
    | 'CANCEL_REQUEST_UNDONE'
    | 'JOKER_INVITE'
    | 'PITCH_CHANGE_APPROVED'
    | 'PITCH_CHANGE_REJECTED'
    | 'TEAM_KICKED'
    | 'JOIN_REQUEST_ACCEPTED'
    | 'CHAT_BAN'
    | 'MATCH_APPROVED'
    | 'BUSINESS_NOTE'
    | 'MATCH_REJECTED_PASSIVE'
    | 'TIME_CONFLICT_CANCELLED'
    | 'ANNOUNCEMENT_TIME_CONFLICT'
    | 'ANNOUNCEMENT_SLOT_TAKEN'
    | 'MATCH_CANCELLED_BY_CAPTAIN'
    | 'CANCEL_REQUEST_REJECTED'
    | 'MATCH_CANCELLED_BY_BUSINESS_APPROVAL'
    | 'CANCEL_REQUEST_SENT'
    | 'PITCH_APPROVAL_APPROVED'
    | 'PITCH_APPROVAL_REJECTED'
    | 'BUSINESS_APPLICATION_APPROVED'
    | 'BUSINESS_APPLICATION_REJECTED'
    | 'PITCH_DELETION_SCHEDULED'
    | 'PITCH_DELETION_REMINDER'
    | 'PITCH_DELETED'
    | 'PITCH_DELETION_CANCELLED';

  @Column({ nullable: true })
  title: string;

  @Column({ nullable: true })
  message: string;

  @Column({ nullable: true })
  relatedId: string;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
