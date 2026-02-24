import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatChannel } from './chat-channel.entity';
import { ChatMessage } from './chat-message.entity';
import { ChatParticipant } from './chat-participant.entity';
import { User } from '../users/user.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';
import { Team } from '../teams/team.entity';
import { Pitch } from '../pitches/entities/pitch.entity';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(ChatChannel)
        private chatChannelRepository: Repository<ChatChannel>,
        @InjectRepository(ChatMessage)
        private chatMessageRepository: Repository<ChatMessage>,
        @InjectRepository(ChatParticipant)
        private chatParticipantRepository: Repository<ChatParticipant>,
        @InjectRepository(Reservation)
        private reservationRepository: Repository<Reservation>,
        @InjectRepository(MatchAnnouncement)
        private matchAnnouncementRepository: Repository<MatchAnnouncement>,
        @InjectRepository(Team)
        private teamRepository: Repository<Team>,
        @InjectRepository(Pitch)
        private pitchRepository: Repository<Pitch>,
    ) { }

    async createChannel(type: 'DM' | 'MATCH_GROUP' | 'TEAM_INTERNAL', name: string, participants: User[], relatedMatchId?: string): Promise<ChatChannel> {
        const channel = this.chatChannelRepository.create({
            type,
            name,
            relatedMatchId
        });
        const savedChannel = await this.chatChannelRepository.save(channel);

        // Create participants
        for (const user of participants) {
            const participant = this.chatParticipantRepository.create({
                channelId: savedChannel.id,
                userId: user.id
            });
            await this.chatParticipantRepository.save(participant);
        }

        return savedChannel;
    }

    async getUserChannels(userId: string): Promise<any[]> {
        // Find channels where user is a participant
        const participations = await this.chatParticipantRepository.find({
            where: { userId },
            relations: ['channel', 'channel.messages', 'channel.messages.sender', 'channel.participants', 'channel.participants.user'],
            order: { channel: { lastActivityAt: 'DESC' } }
        });

        const channels = await Promise.all(participations.map(async p => {
            const channel = p.channel;
            // Calculate unread count
            const unreadCount = channel.messages.filter(m =>
                m.createdAt > p.lastReadAt && m.senderId !== userId
            ).length;

            const lastMessage = channel.messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

            let reservationData: { status: string; slotTime: Date } | null = null;
            if (channel.relatedMatchId) {
                // Find reservation linked to this match announcement
                let reservation = await this.reservationRepository.findOne({
                    where: { matchAnnouncementId: channel.relatedMatchId }
                });

                // FALLBACK FOR OLD MATCHES: Find by relation through match
                if (!reservation) {
                    const match = await this.matchAnnouncementRepository.findOne({
                        where: { id: channel.relatedMatchId }
                    });

                    if (match) {
                        try {
                            const [hours, minutes] = match.time.split(':').map(Number);
                            const slotDateTime = new Date(match.date);
                            slotDateTime.setHours(hours, minutes || 0, 0, 0);

                            reservation = await this.reservationRepository.findOne({
                                where: { teamId: match.teamId, slotTime: slotDateTime, type: 'MATCH' }
                            });

                            if (!reservation) {
                                // If no reservation, just map the match status
                                reservationData = {
                                    status: match.status === 'CONFIRMED' ? 'APPROVED' : 'PENDING',
                                    slotTime: slotDateTime
                                };
                            }
                        } catch (e) {
                            // ignore date parse errors
                        }
                    }
                }

                if (reservation) {
                    reservationData = {
                        status: reservation.status,
                        slotTime: reservation.slotTime
                    };
                }
            }

            return {
                ...channel,
                lastMessage,
                unreadCount,
                reservation: reservationData
            };
        }));

        return channels;
    }

    async sendMessage(channelId: string, senderId: string, content: string, isSystemMessage = false, metadata?: any): Promise<ChatMessage> {
        const message = this.chatMessageRepository.create({
            channelId,
            senderId,
            content,
            isSystemMessage,
            metadata
        });

        await this.chatMessageRepository.save(message);

        // Update last activity
        await this.chatChannelRepository.update(channelId, { lastActivityAt: new Date() });

        // Update sender's lastReadAt to now (since they sent it)
        await this.chatParticipantRepository.update(
            { channelId, userId: senderId },
            { lastReadAt: new Date() }
        );

        const savedMessage = await this.chatMessageRepository.findOne({
            where: { id: message.id },
            relations: ['sender']
        });

        if (!savedMessage) throw new Error('Failed to create message');
        return savedMessage;
    }

    async getChannelMessages(channelId: string): Promise<ChatMessage[]> {
        return this.chatMessageRepository.find({
            where: { channelId },
            relations: ['sender'],
            order: { createdAt: 'ASC' }
        });
    }

    async markAsRead(channelId: string, userId: string): Promise<void> {
        await this.chatParticipantRepository.update(
            { channelId, userId },
            { lastReadAt: new Date() }
        );
    }

    async getUnreadCount(userId: string): Promise<number> {
        const participations = await this.chatParticipantRepository.find({
            where: { userId },
            relations: ['channel', 'channel.messages']
        });

        let totalUnread = 0;
        for (const p of participations) {
            const count = p.channel.messages.filter(m =>
                m.createdAt > p.lastReadAt && m.senderId !== userId
            ).length;
            totalUnread += count;
        }
        return totalUnread;
    }

    async deleteChannel(channelId: string, userId: string): Promise<void> {
        const logger = new Logger('ChatService');
        logger.log(`Attempting to delete channel ${channelId} by user ${userId}`);

        const channel = await this.chatChannelRepository.findOne({ where: { id: channelId } });
        if (!channel) throw new NotFoundException('Channel not found');

        logger.debug(`Channel found: ${channel.id}, Type: ${channel.type}, RelatedMatchId: ${channel.relatedMatchId}`);

        if (channel.type === 'MATCH_GROUP' && channel.relatedMatchId) {
            try {
                // If relatedMatchId is a UUID, assume it's a match announcement
                logger.debug(`Querying match announcement for ID: ${channel.relatedMatchId}`);

                const matches = await this.chatChannelRepository.manager.query(
                    `SELECT id, date, time FROM match_announcements WHERE id = $1`,
                    [channel.relatedMatchId]
                );

                logger.debug(`Match query result: ${JSON.stringify(matches)}`);

                if (matches && matches.length > 0) {
                    const match = matches[0];

                    // Robust Date Parsing
                    // 'date' column might return as Date object or string 'YYYY-MM-DD'
                    let dateStr = '';
                    if (match.date instanceof Date) {
                        // Extract YYYY-MM-DD from Date object
                        dateStr = match.date.toISOString().split('T')[0];
                    } else {
                        dateStr = match.date; // Assume formatted string or raw string
                    }

                    // Combine with time 'HH:MM'
                    const matchDateTimeStr = `${dateStr}T${match.time}`;
                    let matchDate = new Date(matchDateTimeStr);

                    // Check if date parse was valid
                    if (isNaN(matchDate.getTime())) {
                        logger.error(`Invalid date parsing. Raw Date: ${match.date}, Raw Time: ${match.time}, Combined: ${matchDateTimeStr}`);
                        // If parsing fails for some reason, we shouldn't block deletion indefinitely with 500.
                        // But let's throw Bad Request for now.
                        throw new BadRequestException('Match date data is corrupt or invalid.');
                    }

                    const matchEndDate = new Date(matchDate.getTime() + 60 * 60 * 1000); // +1 hour duration
                    const now = new Date();

                    logger.debug(`Match End Date: ${matchEndDate.toISOString()}, Current Time: ${now.toISOString()}`);

                    if (now < matchEndDate) {
                        logger.warn(`Deletion blocked: Match end time not passed yet.`);
                        // Using ForbiddenException gives a 403 status
                        throw new ForbiddenException('Maç saati geçmediği için sohbet silinemez.');
                    }
                } else {
                    logger.warn(`No match announcement found for ID ${channel.relatedMatchId}. Deletion allowed (fallback).`);
                }
            } catch (error) {
                logger.error(`Error during match verification: ${error.message}`);
                if (error instanceof ForbiddenException || error instanceof BadRequestException) {
                    throw error;
                }
                // For other DB errors, throw Internal Server Error or just rethrow
                throw new BadRequestException('Failed to verify match status for deletion.');
            }
        }

        // Verify participant
        const participant = await this.chatParticipantRepository.findOne({
            where: { channelId, userId }
        });

        if (!participant) {
            throw new ForbiddenException('You are not a participant of this channel.');
        }

        await this.chatChannelRepository.delete(channelId);
        logger.log(`Channel ${channelId} deleted successfully.`);
    }

    async getChannelMatchDetails(channelId: string): Promise<any> {
        const logger = new Logger('ChatService');

        // 1. Find the channel
        const channel = await this.chatChannelRepository.findOne({ where: { id: channelId } });
        if (!channel) throw new NotFoundException('Channel not found');
        if (!channel.relatedMatchId) {
            return { error: 'NO_MATCH', message: 'Bu sohbetin bir maçla ilişkisi yok.' };
        }

        // 2. Find the match announcement with team and pitch
        const match = await this.matchAnnouncementRepository.findOne({
            where: { id: channel.relatedMatchId },
            relations: ['team', 'pitch', 'pitch.business'],
        });

        if (!match) {
            return { error: 'MATCH_NOT_FOUND', message: 'Maç bulunamadı.' };
        }

        // 3. Find reservation to get opponent team
        let reservation = await this.reservationRepository.findOne({
            where: { matchAnnouncementId: channel.relatedMatchId },
        });

        // FALLBACK FOR OLD MATCHES: Find by relation through match
        if (!reservation) {
            try {
                const [hours, minutes] = match.time.split(':').map(Number);
                const slotDateTime = new Date(match.date);
                slotDateTime.setHours(hours, minutes || 0, 0, 0);

                reservation = await this.reservationRepository.findOne({
                    where: { teamId: match.teamId, slotTime: slotDateTime, type: 'MATCH' }
                });
            } catch (e) {
                // ignore date parse errors
            }
        }

        // 4. Load both teams with captain info
        const homeTeam = await this.teamRepository.findOne({
            where: { id: match.teamId },
            relations: ['captain', 'players'],
        });

        let awayTeam: any = null;
        if (reservation?.opponentTeamId) {
            awayTeam = await this.teamRepository.findOne({
                where: { id: reservation.opponentTeamId },
                relations: ['captain', 'players'],
            });
        }

        // 5. Build response
        const buildTeamData = (team: any) => {
            if (!team) return null;
            return {
                id: team.id,
                name: team.name,
                logoUrl: team.logoUrl,
                primaryColor: team.primaryColor,
                secondaryColor: team.secondaryColor,
                level: team.level,
                fairPlayScore: team.fairPlayScore,
                wins: team.wins,
                losses: team.losses,
                playerCount: team.players?.length || 0,
                captain: team.captain ? {
                    id: team.captain.id,
                    name: team.captain.full_name || team.captain.username,
                    phone: team.captain.phone,
                } : null,
            };
        };

        return {
            homeTeam: buildTeamData(homeTeam),
            awayTeam: buildTeamData(awayTeam),
            match: {
                id: match.id,
                date: match.date,
                time: match.time,
                status: match.status,
                playerCount: match.playerCount,
                description: match.description,
                matchType: match.matchType,
            },
            reservation: reservation ? {
                id: reservation.id,
                status: reservation.status,
                slotTime: reservation.slotTime,
            } : null,
            pitch: match.pitch ? {
                id: match.pitch.id,
                name: match.pitch.name,
                type: match.pitch.type,
                pricePerHour: match.pitch.pricePerHour,
                business: match.pitch.business ? {
                    id: match.pitch.business.id,
                    name: match.pitch.business.name,
                    phone: match.pitch.business.phone,
                    address: match.pitch.business.address,
                } : null,
            } : null,
        };
    }
}
