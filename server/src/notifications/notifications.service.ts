import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { Challenge } from '../challenges/challenge.entity';
import { ChatChannel } from '../chat/chat-channel.entity';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';
import { TeamsService } from '../teams/teams.service';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectRepository(Notification)
        private notificationsRepository: Repository<Notification>,
        @InjectRepository(Challenge)
        private challengesRepository: Repository<Challenge>,
        @InjectRepository(ChatChannel)
        private chatChannelsRepository: Repository<ChatChannel>,
        @InjectRepository(MatchAnnouncement)
        private matchAnnouncementsRepository: Repository<MatchAnnouncement>,
        private teamsService: TeamsService,
    ) { }

    async createJoinRequestNotification(teamId: string, joinRequestId: string, requesterId: string): Promise<Notification> {
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

        return this.notificationsRepository.save(notification);
    }

    async create(data: Partial<Notification>): Promise<Notification> {
        const notification = this.notificationsRepository.create(data);
        return this.notificationsRepository.save(notification);
    }

    async sendJokerInvite(jokerId: string, matchId: string, inviterId: string, note?: string): Promise<Notification> {
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
            }
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
                note: note
            }
        });

        return this.notificationsRepository.save(notification);
    }

    async getSentJokerInvites(inviterId: string, jokerId: string): Promise<string[]> {
        // Find all JOKER_INVITE notifications sent to jokerId where metadata.inviterId matches
        // It's a bit tricky to query JSONB directly for inviterId in TypeORM without exact Postgres syntax,
        // so we'll fetch notifications for the joker and filter by inviterId.
        const invites = await this.notificationsRepository.find({
            where: { userId: jokerId, type: 'JOKER_INVITE' }
        });

        const sentByMe = invites.filter(n => n.metadata?.inviterId === inviterId);
        return sentByMe.map(n => n.relatedId).filter(Boolean) as string[];
    }

    async cancelJokerInvite(inviterId: string, jokerId: string, matchId: string): Promise<void> {
        const invites = await this.notificationsRepository.find({
            where: { userId: jokerId, type: 'JOKER_INVITE', relatedId: matchId }
        });

        const toCancel = invites.find(n => n.metadata?.inviterId === inviterId);
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
        const enrichedNotifications = await Promise.all(notifications.map(async (notification) => {
            // Only process CHALLENGE notifications that are missing date/time
            if (notification.type === 'CHALLENGE' && (!notification.metadata?.matchDate || !notification.metadata?.matchTime)) {
                try {
                    let matchId: string | null = null;

                    if (notification.relatedId) {
                        // Case 1: Notification is linked to a Challenge (Offer)
                        const challenge = await this.challengesRepository.findOne({
                            where: { id: notification.relatedId }
                        });
                        if (challenge) {
                            matchId = challenge.toMatchId;
                        } else {
                            // Case 2: Notification is linked to a ChatChannel (Accepted)
                            const channel = await this.chatChannelsRepository.findOne({
                                where: { id: notification.relatedId }
                            });
                            if (channel) {
                                matchId = channel.relatedMatchId;
                            }
                        }
                    } else if (notification.metadata?.challengeId) {
                        // Fallback: Check metadata for challengeId
                        const challenge = await this.challengesRepository.findOne({
                            where: { id: notification.metadata.challengeId }
                        });
                        if (challenge) matchId = challenge.toMatchId;
                    }

                    if (matchId) {
                        const match = await this.matchAnnouncementsRepository.findOne({ where: { id: matchId } });
                        if (match) {
                            // Enriched! Update the notification
                            notification.metadata = {
                                ...notification.metadata,
                                matchDate: match.date,
                                matchTime: match.time
                            };
                            await this.notificationsRepository.save(notification);
                            console.log(`🔧 Repaired notification ${notification.id} with match date: ${match.date}`);
                        } else {
                            // Match not found (likely deleted because it expired or was removed)
                            // Mark as expired using a past date to ensure consistency
                            notification.metadata = {
                                ...notification.metadata,
                                matchDate: '2000-01-01', // Legacy date to force expiry
                                matchTime: '00:00'
                            };
                            await this.notificationsRepository.save(notification);
                            console.log(`🔧 Repaired notification ${notification.id} as EXPIRED (Match not found)`);
                        }
                    }
                } catch (error) {
                    console.error(`Failed to repair notification ${notification.id}`, error);
                }
            }
            return notification;
        }));

        return enrichedNotifications;
    }

    async markAsRead(id: string): Promise<Notification> {
        await this.notificationsRepository.update(id, { read: true });
        const notification = await this.notificationsRepository.findOne({ where: { id } });
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
            { read: true }
        );
    }
}
