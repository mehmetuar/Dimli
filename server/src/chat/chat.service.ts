import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ChatChannel } from './chat-channel.entity';
import { ChatMessage } from './chat-message.entity';
import { ChatParticipant } from './chat-participant.entity';
import { User } from '../users/user.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';
import { Team } from '../teams/team.entity';
import { Pitch } from '../pitches/entities/pitch.entity';
import { Challenge } from '../challenges/challenge.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { ReservationsService } from '../reservations/reservations.service';
import { TeamsService } from '../teams/teams.service';

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
        @InjectRepository(Challenge)
        private challengeRepository: Repository<Challenge>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private notificationsService: NotificationsService,
        @Inject(forwardRef(() => ReservationsService))
        private reservationsService: ReservationsService,
        private teamsService: TeamsService,
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
        // Find channels where user is a participant and hasn't soft-deleted
        const participations = await this.chatParticipantRepository.find({
            where: { userId, deletedAt: IsNull() },
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

    /**
     * Helper: Determine match status type for a channel.
     * Returns 'pending' | 'confirmed' | 'played' | 'unplayed' | null
     */
    private async getChannelMatchStatusType(channelId: string): Promise<'pending' | 'confirmed' | 'played' | 'unplayed' | null> {
        const channel = await this.chatChannelRepository.findOne({ where: { id: channelId } });
        if (!channel || !channel.relatedMatchId) return null;

        // Find reservation
        let reservation = await this.reservationRepository.findOne({
            where: { matchAnnouncementId: channel.relatedMatchId }
        });

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
                        // No reservation found, determine from match data
                        const now = new Date();
                        if (now > slotDateTime) {
                            return match.status === 'CONFIRMED' ? 'played' : 'unplayed';
                        }
                        return match.status === 'CONFIRMED' ? 'confirmed' : 'pending';
                    }
                } catch (e) {
                    return null;
                }
            } else {
                return null;
            }
        }

        const now = new Date();
        const slotDate = new Date(reservation.slotTime);
        const matchEndTime = new Date(slotDate.getTime() + 60 * 60 * 1000);

        if (now > slotDate && reservation.status !== 'APPROVED') {
            return 'unplayed';
        }
        if (reservation.status === 'PENDING') {
            return 'pending';
        }
        if (reservation.status === 'APPROVED' && now <= matchEndTime) {
            return 'confirmed';
        }
        if (reservation.status === 'APPROVED' && now > matchEndTime) {
            return 'played';
        }
        return null;
    }

    async sendMessage(channelId: string, senderId: string, content: string, isSystemMessage = false, metadata?: any): Promise<ChatMessage> {
        // System messages can always be sent
        if (!isSystemMessage) {
            const statusType = await this.getChannelMatchStatusType(channelId);
            if (statusType === 'played' || statusType === 'unplayed') {
                throw new ForbiddenException('Maç tamamlandığı için mesaj gönderilemez.');
            }
        }

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
        logger.log(`Attempting to soft-delete channel ${channelId} for user ${userId}`);

        const channel = await this.chatChannelRepository.findOne({ where: { id: channelId } });
        if (!channel) throw new NotFoundException('Channel not found');

        // Verify participant
        const participant = await this.chatParticipantRepository.findOne({
            where: { channelId, userId, deletedAt: IsNull() }
        });

        if (!participant) {
            throw new ForbiddenException('Bu sohbetin katılımcısı değilsiniz veya zaten silinmiş.');
        }

        // Check match status — only allow deletion for 'played' or 'unplayed'
        const statusType = await this.getChannelMatchStatusType(channelId);
        logger.debug(`Channel ${channelId} match status: ${statusType}`);

        if (statusType === 'pending' || statusType === 'confirmed') {
            throw new ForbiddenException('Kesinleşmiş veya onay bekleyen sohbetler silinemez.');
        }

        // Per-user soft-delete: only mark this user's participation as deleted
        await this.chatParticipantRepository.update(
            { id: participant.id },
            { deletedAt: new Date() }
        );

        logger.log(`Channel ${channelId} soft-deleted for user ${userId}.`);
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

    /**
     * Create a rematch/new match proposal from within a finished chat.
     * Only captains and vice-captains can create proposals.
     */
    async createRematchProposal(
        channelId: string,
        userId: string,
        data: { pitchId: string; date: string; time: string; playerCount: number }
    ): Promise<any> {
        const logger = new Logger('ChatService');
        logger.log(`Creating rematch proposal for channel ${channelId} by user ${userId}`);

        // 1. Verify channel exists and is a finished match
        const channel = await this.chatChannelRepository.findOne({ where: { id: channelId } });
        if (!channel) throw new NotFoundException('Kanal bulunamadı.');

        const statusType = await this.getChannelMatchStatusType(channelId);
        if (statusType !== 'played' && statusType !== 'unplayed') {
            throw new ForbiddenException('Sadece bitmiş maç sohbetlerinden yeni maç teklifi gönderilebilir.');
        }

        // 2. Get match details to find both teams
        const matchDetails = await this.getChannelMatchDetails(channelId);
        if (!matchDetails?.homeTeam || !matchDetails?.awayTeam) {
            throw new BadRequestException('Maç detayları bulunamadı. Her iki takım bilgisi gerekli.');
        }

        // 3. Find user and their team to determine which team is proposing
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['team']
        });
        if (!user || !user.team) throw new ForbiddenException('Kullanıcı bir takıma ait değil.');

        const userTeamId = user.team.id;
        const userTeam = await this.teamRepository.findOne({
            where: { id: userTeamId },
            relations: ['captain']
        });
        if (!userTeam) throw new NotFoundException('Takım bulunamadı.');

        // 4. Verify user is captain or vice-captain
        const isCaptain = userTeam.captainId === userId;
        const isViceCaptain = userTeam.viceCaptainIds?.includes(userId);
        if (!isCaptain && !isViceCaptain) {
            throw new ForbiddenException('Sadece kaptan veya yardımcı kaptan yeni maç teklifi gönderebilir.');
        }

        // 5. Determine opponent team
        const opponentTeamId = userTeamId === matchDetails.homeTeam.id
            ? matchDetails.awayTeam.id
            : matchDetails.homeTeam.id;

        const opponentTeam = await this.teamRepository.findOne({
            where: { id: opponentTeamId },
            relations: ['captain']
        });
        if (!opponentTeam) throw new NotFoundException('Rakip takım bulunamadı.');

        // 6. Validate pitch exists
        const pitch = await this.pitchRepository.findOne({
            where: { id: data.pitchId },
            relations: ['business', 'timeSlots']
        });
        if (!pitch) throw new BadRequestException('Saha bulunamadı.');

        // 7. Validate date/time
        const [hours, minutes] = data.time.split(':').map(Number);
        const proposalDate = new Date(data.date);
        proposalDate.setHours(hours, minutes, 0, 0);

        if (proposalDate < new Date()) {
            throw new BadRequestException('Geçmiş bir tarih/saat için teklif gönderilemez.');
        }

        // 8. Create MatchAnnouncement
        const announcement = this.matchAnnouncementRepository.create({
            teamId: userTeamId,
            pitchId: data.pitchId,
            date: data.date,
            time: data.time,
            playerCount: data.playerCount,
            description: `Rövanş teklifi: ${userTeam.name} vs ${opponentTeam.name}`,
            status: 'PENDING',
            matchType: 'rakip_araniyor',
        });
        const savedAnnouncement = await this.matchAnnouncementRepository.save(announcement);
        logger.log(`Match announcement created: ${savedAnnouncement.id}`);

        // 9. Create Challenge record
        const challenge = this.challengeRepository.create({
            fromTeamId: userTeamId,
            toMatchId: savedAnnouncement.id,
            note: `${userTeam.name} takımından rövanş teklifi`,
            status: 'PENDING',
        });
        const savedChallenge = await this.challengeRepository.save(challenge);
        logger.log(`Challenge created: ${savedChallenge.id}`);

        // 10. Format date info for messages
        const dayName = proposalDate.toLocaleDateString('tr-TR', { weekday: 'long' });
        const formattedDate = proposalDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        const businessName = pitch.business?.name || 'İşletme';
        const pitchName = pitch.name || 'Saha';

        // Calculate end time
        let endTimeStr = '';
        if (pitch.timeSlots && pitch.timeSlots.length > 0) {
            const matchingSlot = pitch.timeSlots.find(slot => slot.startTime === data.time);
            if (matchingSlot) endTimeStr = matchingSlot.endTime;
        }
        if (!endTimeStr) {
            const endTime = new Date(proposalDate.getTime() + 60 * 60 * 1000);
            endTimeStr = endTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        }

        // 11. Send system message to current chat
        await this.sendMessage(
            channelId,
            userId,
            `{{ENVELOPE}} ${userTeam.name} yeni maç teklifi gönderdi!\n\n` +
            `{{STADIUM}} ${businessName}\n` +
            `{{PIN}} ${pitchName}\n` +
            `{{CALENDAR}} ${formattedDate} ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}\n` +
            `{{CLOCK}} ${data.time} - ${endTimeStr}`,
            true, // isSystemMessage
            {
                type: 'REMATCH_PROPOSAL',
                challengeId: savedChallenge.id,
                matchAnnouncementId: savedAnnouncement.id,
                channelId: channelId,
            }
        );

        // 12. Send notifications to opponent captain + vice-captains
        const recipientIds: string[] = [];
        if (opponentTeam.captainId) recipientIds.push(opponentTeam.captainId);
        if (opponentTeam.viceCaptainIds) {
            for (const vcId of opponentTeam.viceCaptainIds) {
                if (!recipientIds.includes(vcId)) recipientIds.push(vcId);
            }
        }

        for (const recipientId of recipientIds) {
            await this.notificationsService.create({
                userId: recipientId,
                type: 'REMATCH_PROPOSAL',
                title: '📩 Yeni Maç Teklifi!',
                message: `${userTeam.name} takımından rövanş teklifi: ${formattedDate} ${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${data.time} - ${businessName} ${pitchName}`,
                relatedId: savedChallenge.id,
                metadata: {
                    challengeId: savedChallenge.id,
                    matchAnnouncementId: savedAnnouncement.id,
                    channelId: channelId,
                    proposerTeamName: userTeam.name,
                    matchDate: data.date,
                    matchTime: data.time,
                    businessName,
                    pitchName,
                }
            });
        }

        logger.log(`Rematch proposal sent. Notifications sent to ${recipientIds.length} recipients.`);
        return { success: true, challengeId: savedChallenge.id, matchAnnouncementId: savedAnnouncement.id };
    }

    /**
     * Accept a rematch proposal. Creates new chat, reservation, soft-deletes old chat.
     */
    async acceptRematchProposal(
        channelId: string,
        userId: string,
        data: { matchAnnouncementId: string }
    ): Promise<any> {
        const logger = new Logger('ChatService');
        logger.log(`Accepting rematch proposal in channel ${channelId} by user ${userId}`);

        // 1. Find the challenge linked to this match announcement
        const challenge = await this.challengeRepository.findOne({
            where: { toMatchId: data.matchAnnouncementId, status: 'PENDING' }
        });
        if (!challenge) throw new NotFoundException('Teklif bulunamadı veya zaten işlenmiş.');

        // 2. Verify user is captain/vice-captain of the OPPONENT team (the one receiving the proposal)
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['team']
        });
        if (!user || !user.team) throw new ForbiddenException('Kullanıcı bir takıma ait değil.');

        const userTeam = await this.teamRepository.findOne({
            where: { id: user.team.id },
            relations: ['captain']
        });
        if (!userTeam) throw new NotFoundException('Takım bulunamadı.');

        const isCaptain = userTeam.captainId === userId;
        const isViceCaptain = userTeam.viceCaptainIds?.includes(userId);
        if (!isCaptain && !isViceCaptain) {
            throw new ForbiddenException('Sadece kaptan veya yardımcı kaptan teklifi onaylayabilir.');
        }

        // 3. The proposer team should be the challenge.fromTeamId — user should NOT be from that team
        if (user.team.id === challenge.fromTeamId) {
            throw new ForbiddenException('Kendi teklifinizi onaylayamazsınız.');
        }

        // 4. Load match announcement
        const match = await this.matchAnnouncementRepository.findOne({
            where: { id: data.matchAnnouncementId },
            relations: ['team', 'team.captain', 'pitch', 'pitch.business', 'pitch.timeSlots']
        });
        if (!match) throw new NotFoundException('Maç ilanı bulunamadı.');

        // 5. Update match status to CONFIRMED
        await this.matchAnnouncementRepository.update(match.id, { status: 'CONFIRMED' });

        // 6. Update challenge status to ACCEPTED
        await this.challengeRepository.update(challenge.id, { status: 'ACCEPTED' });

        // 7. Load both teams with captains
        const proposerTeam = await this.teamRepository.findOne({
            where: { id: challenge.fromTeamId },
            relations: ['captain']
        });
        if (!proposerTeam) throw new NotFoundException('Teklif eden takım bulunamadı.');

        // 8. Create new chat channel
        const participants = [proposerTeam.captain, userTeam.captain].filter(Boolean);
        const newChannel = await this.createChannel(
            'MATCH_GROUP',
            `${proposerTeam.name} vs ${userTeam.name}`,
            participants,
            match.id
        );
        logger.log(`New chat channel created: ${newChannel.id}`);

        // 9. Format date info for system message
        const [matchHours, matchMinutes] = match.time.split(':').map(Number);
        const matchDateTime = new Date(match.date);
        matchDateTime.setHours(matchHours, matchMinutes, 0, 0);
        const dayName = matchDateTime.toLocaleDateString('tr-TR', { weekday: 'long' });
        const formattedDate = matchDateTime.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        const businessName = match.pitch?.business?.name || 'İşletme';
        const pitchName = match.pitch?.name || 'Saha';

        let endTimeStr = '';
        if (match.pitch?.timeSlots && match.pitch.timeSlots.length > 0) {
            const matchingSlot = match.pitch.timeSlots.find(slot => slot.startTime === match.time);
            if (matchingSlot) endTimeStr = matchingSlot.endTime;
        }
        if (!endTimeStr) {
            const endTime = new Date(matchDateTime.getTime() + 60 * 60 * 1000);
            endTimeStr = endTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        }

        // 10. Send system message to NEW chat
        await this.sendMessage(
            newChannel.id,
            userTeam.captain?.id || userId,
            `Eşleşme Onaylandı! {{CHECK}}\n\n` +
            `{{STADIUM}} ${businessName}\n` +
            `{{PIN}} ${pitchName}\n` +
            `{{CALENDAR}} ${formattedDate} ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}\n` +
            `{{CLOCK}} ${match.time} - ${endTimeStr}\n\n` +
            `Maçı kesinleştirmek için Sahayı arayın ve saatinizi rezerve edin.\nAcele et! Yerinizi kapabilirler.`,
            true,
            { type: 'MATCH_CONFIRMED', matchAnnouncementId: match.id }
        );

        // 11. Create auto PENDING reservation
        try {
            const slotDateTime = new Date(match.date);
            slotDateTime.setHours(matchHours, matchMinutes, 0, 0);

            await this.reservationsService.create({
                pitchId: match.pitchId,
                teamId: match.teamId,
                opponentTeamId: user.team.id,
                slotTime: slotDateTime,
                type: 'MATCH',
                matchAnnouncementId: match.id
            });
            logger.log(`Auto-reservation created for match ${match.id}`);
        } catch (err) {
            logger.error('Failed to create auto-reservation:', err);
        }

        // 12. Soft-delete old chat channel for ALL participants
        const oldParticipants = await this.chatParticipantRepository.find({
            where: { channelId, deletedAt: IsNull() }
        });
        for (const participant of oldParticipants) {
            await this.chatParticipantRepository.update(
                { id: participant.id },
                { deletedAt: new Date() }
            );
        }
        logger.log(`Old channel ${channelId} soft-deleted for ${oldParticipants.length} participants.`);

        // 13. Send notification to proposer team
        if (proposerTeam.captain) {
            await this.notificationsService.create({
                userId: proposerTeam.captain.id,
                type: 'CHALLENGE',
                title: 'Rövanş Teklifi Kabul Edildi! ✅',
                message: `${userTeam.name} rövanş teklifinizi kabul etti. Sohbet kanalı oluşturuldu.`,
                relatedId: newChannel.id,
                metadata: {
                    channelId: newChannel.id,
                    isChatRedirect: true,
                    matchDate: match.date,
                    matchTime: match.time
                }
            });
        }

        // 14. Delete the original rematch proposal notifications
        try {
            const proposalNotifications = await this.chatChannelRepository.manager.query(
                `DELETE FROM notifications WHERE type = 'REMATCH_PROPOSAL' AND "relatedId" = $1`,
                [challenge.id]
            );
            logger.log(`Cleaned up rematch proposal notifications for challenge ${challenge.id}`);
        } catch (err) {
            logger.error('Failed to clean up notifications:', err);
        }

        return { success: true, newChannelId: newChannel.id };
    }
}
