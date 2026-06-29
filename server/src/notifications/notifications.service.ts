import {
  Injectable,
  Optional,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { Challenge } from '../challenges/challenge.entity';
import { ChatChannel } from '../chat/chat-channel.entity';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { User } from '../users/user.entity';
import { TeamsService } from '../teams/teams.service';
import { AppGateway } from '../gateway/app.gateway';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(Challenge)
    private challengesRepository: Repository<Challenge>,
    @InjectRepository(ChatChannel)
    private chatChannelsRepository: Repository<ChatChannel>,
    @InjectRepository(MatchAnnouncement)
    private matchAnnouncementsRepository: Repository<MatchAnnouncement>,
    @InjectRepository(BusinessOwner)
    private businessOwnerRepository: Repository<BusinessOwner>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @Inject(forwardRef(() => TeamsService))
    private teamsService: TeamsService,
    @Optional() private gateway: AppGateway,
    private firebaseService: FirebaseService,
  ) {}

  async createJoinRequestNotification(
    teamId: string,
    joinRequestId: string,
    requesterId: string,
  ): Promise<Notification> {
    // Get team to find captain
    const team = await this.teamsService.findOne(teamId);
    if (!team) throw new Error('Team not found');

    const notification = this.notificationsRepository.create({
      userId: team.captainId || (team.captain as any).id, // Captain gets notification
      type: 'JOIN_REQUEST',
      relatedId: joinRequestId,
      metadata: { teamId, requesterId },
      read: false,
    });

    const saved = await this.notificationsRepository.save(notification);
    this.gateway?.server
      ?.to(saved.userId)
      .emit('notification', { type: saved.type, relatedId: saved.relatedId });
    this.usersRepository
      .findOne({ where: { id: saved.userId } })
      .then((user) => {
        if (user?.pushToken) {
          void this.firebaseService.sendToDevice(
            user.pushToken,
            'Katılım İsteği',
            'Takımına yeni bir katılım isteği var',
            { type: 'JOIN_REQUEST' },
          );
        }
      })
      .catch(() => {});
    return saved;
  }

  async createPlayerRemovedNotification(
    teamId: string,
    playerId: string,
  ): Promise<void> {
    const team = await this.teamsService.findOne(teamId);
    if (!team) return;

    const notification = this.notificationsRepository.create({
      userId: playerId,
      type: 'TEAM_KICKED',
      title: 'Takımdan Çıkarıldınız',
      message: `${team.name} takımından çıkarıldınız.`,
      metadata: { teamId },
      read: false,
    });

    await this.notificationsRepository.save(notification);
    this.gateway?.server
      ?.to(playerId)
      .emit('notification', { type: 'TEAM_KICKED' });
    this.usersRepository
      .findOne({ where: { id: playerId } })
      .then((user) => {
        if (user?.pushToken) {
          void this.firebaseService.sendToDevice(
            user.pushToken,
            'Takımdan Çıkarıldınız',
            `${team.name} takımından çıkarıldınız.`,
            { type: 'TEAM_KICKED' },
          );
        }
      })
      .catch(() => {});
  }

  async createJoinRequestAcceptedNotification(
    joinRequestId: string,
    userId: string,
    teamId: string,
  ): Promise<void> {
    const team = await this.teamsService.findOne(teamId);
    if (!team) return;

    const notification = this.notificationsRepository.create({
      userId,
      type: 'JOIN_REQUEST_ACCEPTED',
      title: 'Katılma İsteği Onaylandı',
      message: `${team.name} takımına katılma isteğiniz onaylandı!`,
      relatedId: joinRequestId,
      metadata: { teamId },
      read: false,
    });

    await this.notificationsRepository.save(notification);
    this.gateway?.server
      ?.to(userId)
      .emit('notification', { type: 'JOIN_REQUEST_ACCEPTED' });
    this.usersRepository
      .findOne({ where: { id: userId } })
      .then((user) => {
        if (user?.pushToken) {
          void this.firebaseService.sendToDevice(
            user.pushToken,
            'Katılma İsteği Onaylandı',
            `${team.name} takımına katılma isteğiniz onaylandı!`,
            { type: 'JOIN_REQUEST_ACCEPTED' },
          );
        }
      })
      .catch(() => {});
  }

  async create(data: Partial<Notification>): Promise<Notification> {
    const notification = this.notificationsRepository.create(data);
    const saved = await this.notificationsRepository.save(notification);
    if (saved.userId) {
      this.gateway?.server?.to(saved.userId).emit('notification', {
        type: saved.type,
        title: saved.title,
        message: saved.message,
      });
    }
    const userPushTypes = new Set(['CHALLENGE', 'MATCH_REMINDER']);
    const userSystemPushTypes = new Set([
      'MATCH_APPROVED',
      'MATCH_REVOKED_TO_PENDING',
      'MATCH_CANCELLED_BY_CAPTAIN',
      'TIME_CONFLICT_CANCELLED',
      'TIME_CONFLICT_OPPONENT_CANCELLED',
      'MATCH_REJECTED_PASSIVE',
      'MANUAL_FILL_REJECTED',
      'ANNOUNCEMENT_SLOT_TAKEN',
      'MATCH_RESTORED_TO_PENDING',
      'BUSINESS_NOTE',
    ]);
    const isUserPush =
      saved.userId &&
      (userPushTypes.has(saved.type) ||
        (saved.type === 'SYSTEM' &&
          userSystemPushTypes.has(saved.metadata?.type as string)));
    if (isUserPush) {
      this.usersRepository
        .findOne({ where: { id: saved.userId } })
        .then((user) => {
          if (user?.pushToken) {
            void this.firebaseService.sendToDevice(
              user.pushToken,
              saved.title || 'Yeni Bildirim',
              saved.message || '',
              { type: saved.metadata?.type || saved.type },
            );
          }
        })
        .catch(() => {});
    }
    const businessPushTypes = new Set([
      'RESERVATION_REQUEST',
      'CANCEL_REQUEST',
      'CANCEL_REQUEST_UNDONE',
      'PITCH_CHANGE_APPROVED',
      'PITCH_CHANGE_REJECTED',
      'BUSINESS_APPLICATION_APPROVED',
      'BUSINESS_APPLICATION_REJECTED',
    ]);
    if (businessPushTypes.has(saved.type) && saved.userId) {
      this.businessOwnerRepository
        .findOne({ where: { id: saved.userId } })
        .then((owner) => {
          if (owner?.pushToken) {
            void this.firebaseService.sendToDevice(
              owner.pushToken,
              saved.title || 'Yeni Bildirim',
              saved.message || '',
              { type: saved.type },
            );
          }
        })
        .catch(() => {});
    }
    return saved;
  }

  async sendJokerInvite(
    jokerId: string,
    matchId: string,
    inviterId: string,
    note?: string,
  ): Promise<Notification> {
    const match = await this.matchAnnouncementsRepository.findOne({
      where: { id: matchId },
      relations: ['team', 'pitch', 'pitch.business'],
    });

    if (!match) throw new Error('Match not found');

    // Prevent duplicate invites
    const existingInvite = await this.notificationsRepository.findOne({
      where: {
        userId: jokerId,
        type: 'JOKER_INVITE',
        relatedId: matchId,
      },
    });

    if (existingInvite) {
      throw new Error('Joker için bu maça zaten bir davet gönderilmiş.');
    }

    const notification = this.notificationsRepository.create({
      userId: jokerId,
      type: 'JOKER_INVITE',
      relatedId: matchId,
      read: false,
      message: `${match.team?.name} seni maça joker olarak davet ediyor!`,
      metadata: {
        inviterId,
        teamId: match.teamId,
        teamName: match.team?.name,
        matchDate: match.date,
        matchTime: match.time,
        pitchName: match.pitch?.name,
        businessName: match.pitch?.business?.name,
        note: note,
      },
    });

    const saved = await this.notificationsRepository.save(notification);
    this.gateway?.server
      ?.to(jokerId)
      .emit('notification', { type: 'JOKER_INVITE', relatedId: matchId });
    this.usersRepository
      .findOne({ where: { id: jokerId } })
      .then((user) => {
        if (user?.pushToken) {
          void this.firebaseService.sendToDevice(
            user.pushToken,
            'Joker Daveti ⚡',
            saved.message || 'Seni maça joker olarak davet ediyorlar!',
            { type: 'JOKER_INVITE' },
          );
        }
      })
      .catch(() => {});
    return saved;
  }

  async getSentJokerInvites(
    inviterId: string,
    jokerId: string,
  ): Promise<string[]> {
    // Find all JOKER_INVITE notifications sent to jokerId where metadata.inviterId matches
    // It's a bit tricky to query JSONB directly for inviterId in TypeORM without exact Postgres syntax,
    // so we'll fetch notifications for the joker and filter by inviterId.
    const invites = await this.notificationsRepository.find({
      where: { userId: jokerId, type: 'JOKER_INVITE' },
    });

    const sentByMe = invites.filter((n) => n.metadata?.inviterId === inviterId);
    return sentByMe.map((n) => n.relatedId).filter(Boolean);
  }

  async cancelJokerInvite(
    inviterId: string,
    jokerId: string,
    matchId: string,
  ): Promise<void> {
    const invites = await this.notificationsRepository.find({
      where: { userId: jokerId, type: 'JOKER_INVITE', relatedId: matchId },
    });

    const toCancel = invites.find((n) => n.metadata?.inviterId === inviterId);
    if (toCancel) {
      await this.notificationsRepository.delete(toCancel.id);
    }
  }

  async findByUser(userId: string): Promise<Notification[]> {
    const notifications = await this.notificationsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // Enrich notifications with missing metadata (Self-Repairing Logic)
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        // Only process CHALLENGE notifications that are missing date/time
        if (
          notification.type === 'CHALLENGE' &&
          (!notification.metadata?.matchDate ||
            !notification.metadata?.matchTime)
        ) {
          try {
            let matchId: string | null = null;

            if (notification.relatedId) {
              // Case 1: Notification is linked to a Challenge (Offer)
              const challenge = await this.challengesRepository.findOne({
                where: { id: notification.relatedId },
              });
              if (challenge) {
                matchId = challenge.toMatchId;
              } else {
                // Case 2: Notification is linked to a ChatChannel (Accepted)
                const channel = await this.chatChannelsRepository.findOne({
                  where: { id: notification.relatedId },
                });
                if (channel) {
                  matchId = channel.relatedMatchId;
                }
              }
            } else if (notification.metadata?.challengeId) {
              // Fallback: Check metadata for challengeId
              const challenge = await this.challengesRepository.findOne({
                where: { id: notification.metadata.challengeId },
              });
              if (challenge) matchId = challenge.toMatchId;
            }

            if (matchId) {
              const match = await this.matchAnnouncementsRepository.findOne({
                where: { id: matchId },
              });
              if (match) {
                // Enriched! Update the notification
                notification.metadata = {
                  ...notification.metadata,
                  matchDate: match.date,
                  matchTime: match.time,
                };
                await this.notificationsRepository.save(notification);
                console.log(
                  `🔧 Repaired notification ${notification.id} with match date: ${match.date}`,
                );
              } else {
                // Match not found (likely deleted because it expired or was removed)
                // Mark as expired using a past date to ensure consistency
                notification.metadata = {
                  ...notification.metadata,
                  matchDate: '2000-01-01', // Legacy date to force expiry
                  matchTime: '00:00',
                };
                await this.notificationsRepository.save(notification);
                console.log(
                  `🔧 Repaired notification ${notification.id} as EXPIRED (Match not found)`,
                );
              }
            }
          } catch (error) {
            console.error(
              `Failed to repair notification ${notification.id}`,
              error,
            );
          }
        }
        return notification;
      }),
    );

    return enrichedNotifications;
  }

  async markAsRead(id: string): Promise<Notification> {
    await this.notificationsRepository.update(id, { read: true });
    const notification = await this.notificationsRepository.findOne({
      where: { id },
    });
    if (!notification) throw new Error('Notification not found');
    return notification;
  }

  async delete(id: string): Promise<void> {
    await this.notificationsRepository.delete(id);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationsRepository.count({
      where: { userId, read: false },
    });
  }

  // Business Owner Notifications
  async findByOwner(ownerId: string): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: { userId: ownerId }, // Using userId column for ownerId too
      order: { createdAt: 'DESC' },
    });
  }

  async getUnreadCountForOwner(ownerId: string): Promise<number> {
    return this.notificationsRepository.count({
      where: { userId: ownerId, read: false },
    });
  }

  async markAllAsReadForOwner(ownerId: string): Promise<void> {
    await this.notificationsRepository.update(
      { userId: ownerId, read: false },
      { read: true },
    );
  }

  async sendChatPushToParticipants(
    senderId: string | null,
    senderName: string,
    channelId: string,
    channelType: 'DM' | 'MATCH_GROUP' | 'TEAM_INTERNAL' | 'JOKER_NEGOTIATION',
    channelName: string | null,
    content: string,
    participantUserIds: string[],
    badgeCounts?: Map<string, number>,
  ): Promise<void> {
    const recipients = participantUserIds.filter((uid) => uid !== senderId);
    if (!recipients.length) return;

    const title = this.buildChatTitle(senderName, channelType, channelName);
    const body =
      content.length > 120 ? content.substring(0, 117) + '...' : content;

    const users = await this.usersRepository.find({
      where: { id: In(recipients) },
    });

    // Teşhis: her alıcı için push token var mı ve hesaplanan badge sayısı ne —
    // production'da "push gitmiyor" şikayetlerinde ilk bakılacak yer.
    for (const u of users) {
      this.logger.log(
        `Sohbet push hedefi → userId=${u.id} pushToken=${u.pushToken ? 'var' : 'YOK'} badge=${badgeCounts?.get(u.id) ?? 1}`,
      );
    }
    const missingTokenIds = recipients.filter(
      (uid) => !users.find((u) => u.id === uid)?.pushToken,
    );
    if (missingTokenIds.length) {
      this.logger.warn(
        `Push token eksik olan alıcı(lar): ${missingTokenIds.join(', ')} — bu kullanıcılara FCM bildirimi gönderilemeyecek.`,
      );
    }

    await Promise.allSettled(
      users
        .filter((u) => u.pushToken)
        .map((u) =>
          this.firebaseService.sendToDevice(
            u.pushToken,
            title,
            body,
            { type: 'CHAT', channelId },
            badgeCounts?.get(u.id) ?? 1,
          ),
        ),
    );
  }

  private buildChatTitle(
    senderName: string,
    channelType: string,
    channelName: string | null,
  ): string {
    switch (channelType) {
      case 'JOKER_NEGOTIATION':
        return `${senderName} · Joker DM`;
      case 'MATCH_GROUP':
        return `${senderName} · ${channelName || 'Maç Sohbeti'}`;
      case 'TEAM_INTERNAL':
        return `${senderName} · Takım Sohbeti`;
      default:
        return senderName;
    }
  }
}
