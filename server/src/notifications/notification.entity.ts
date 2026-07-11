import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

// RESERVATION_REQUEST v3 metadata'sındaki takım projeksiyonu — üretici:
// notifications.service toTeamMeta + reservation-lifecycle.create (aynı şekil).
export interface NotificationTeamMeta {
  id: string;
  name: string;
  logo: string | null;
  level: string | null;
  fairPlay: number | null;
  ratingCount: number;
}

// Bildirim metadata'sı gerçekten polimorfik (~40 yazım noktası, bildirim türüne
// göre değişen şekiller) → bilinen/okunan anahtarlar opsiyonel olarak tiplenir,
// uzun kuyruk index signature ile taşınır. KURAL: yeni bir anahtar OKUYACAKSAN
// buraya gerçek tipiyle ekle; okuma yerinde cast etme.
export interface NotificationMetadata {
  type?: string;
  teamId?: string;
  requesterId?: string;
  inviterId?: string;
  challengeId?: string;
  matchAnnouncementId?: string;
  announcementId?: string;
  channelId?: string;
  reservationId?: string;
  pitchId?: string;
  metaV?: number;
  matchDate?: string;
  matchTime?: string;
  team?: NotificationTeamMeta | null;
  opponentTeam?: NotificationTeamMeta | null;
  [k: string]: unknown;
}

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
  metadata: NotificationMetadata | null;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
