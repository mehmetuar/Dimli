import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Challenge } from './challenge.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { MatchAnnouncementsService } from '../match-announcements/match-announcements.service';
import { TeamsService } from '../teams/teams.service';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class ChallengesService {
    constructor(
        @InjectRepository(Challenge)
        private challengesRepository: Repository<Challenge>,
        private notificationsService: NotificationsService,
        private matchAnnouncementsService: MatchAnnouncementsService,
        private teamsService: TeamsService,
        private chatService: ChatService,
    ) { }

    async create(fromTeamId: string, toMatchId: string, note?: string): Promise<Challenge> {
        // 0. Check for existing pending challenge
        const existingChallenge = await this.challengesRepository.findOne({
            where: {
                fromTeamId,
                toMatchId,
                status: 'PENDING'
            }
        });

        if (existingChallenge) {
            throw new Error('Bu maça zaten meydan okudunuz. Cevap bekleniyor.');
        }

        // 1. Create Challenge Record
        const challenge = this.challengesRepository.create({
            fromTeamId,
            toMatchId,
            note,
            status: 'PENDING',
        });
        const savedChallenge = await this.challengesRepository.save(challenge);

        // 2. Fetch Match Announcement to find target team
        const match = await this.matchAnnouncementsService['matchAnnouncementsRepository'].findOne({
            where: { id: toMatchId },
            relations: ['team', 'team.captain']
        });

        if (!match) throw new Error('Match not found');

        // 3. Fetch Challenger Team Name
        const challengerTeam = await this.teamsService.findOne(fromTeamId);
        if (!challengerTeam) throw new Error('Challenger team not found');

        // 4. Create Notification for Target Team Captain
        await this.notificationsService.create({
            userId: match.team.captain.id,
            type: 'CHALLENGE',
            title: 'Yeni Meydan Okuma!',
            message: `${challengerTeam.name} takımından maç teklifi var: "${note || 'Maç yapmak istiyoruz.'}"`,
            relatedId: savedChallenge.id,
            metadata: {
                challengeId: savedChallenge.id,
                challengerTeamName: challengerTeam.name,
                matchDate: match.date,
                matchTime: match.time
            }
        });

        return savedChallenge;
    }

    async findByMatchId(matchId: string): Promise<Challenge[]> {
        return this.challengesRepository.find({
            where: { toMatchId: matchId },
            order: { createdAt: 'DESC' },
        });
    }

    async findByTeamId(teamId: string): Promise<Challenge[]> {
        return this.challengesRepository.find({
            where: { fromTeamId: teamId },
            order: { createdAt: 'DESC' }
        });
    }

    async delete(id: string): Promise<void> {
        const challenge = await this.challengesRepository.findOne({ where: { id } });
        if (!challenge) throw new Error('Challenge not found');

        // Delete related notification
        const notification = await this.notificationsService['notificationsRepository'].findOne({
            where: {
                type: 'CHALLENGE',
                relatedId: id
            }
        });

        if (notification) {
            await this.notificationsService.delete(notification.id);
        }

        await this.challengesRepository.delete(id);
    }

    async updateStatus(id: string, status: 'ACCEPTED' | 'REJECTED'): Promise<Challenge> {
        await this.challengesRepository.update(id, { status });
        const challenge = await this.challengesRepository.findOne({ where: { id } });

        if (!challenge) throw new Error('Challenge not found');

        // Delete the original challenge notification
        const notification = await this.notificationsService['notificationsRepository'].findOne({
            where: {
                type: 'CHALLENGE',
                relatedId: id
            }
        });

        if (notification) {
            await this.notificationsService.delete(notification.id);
        }

        if (status === 'ACCEPTED') {
            // 1. Update Match Status to CONFIRMED
            await this.matchAnnouncementsService['matchAnnouncementsRepository'].update(challenge.toMatchId, {
                status: 'CONFIRMED'
            });

            // 2. Create Chat Channel
            const match = await this.matchAnnouncementsService['matchAnnouncementsRepository'].findOne({
                where: { id: challenge.toMatchId },
                relations: ['team', 'team.captain']
            });

            if (!match) throw new Error('Match not found');

            const challengerTeam = await this.teamsService.findOne(challenge.fromTeamId);
            if (!challengerTeam) throw new Error('Challenger team not found');

            const hostTeam = match.team;

            // Participants: Both Captains
            const participants = [hostTeam.captain, challengerTeam.captain];

            // Create Group Chat
            const channel = await this.chatService.createChannel(
                'MATCH_GROUP',
                `${hostTeam.name} vs ${challengerTeam.name}`,
                participants,
                match.id
            );

            // 3. Notify Challenger Captain
            await this.notificationsService.create({
                userId: challengerTeam.captain.id,
                type: 'CHALLENGE',
                title: 'Meydan Okuma Kabul Edildi!',
                message: `${hostTeam.name} maç teklifinizi kabul etti. Sohbet kanalı oluşturuldu.`,
                relatedId: channel.id,
                metadata: {
                    channelId: channel.id,
                    isChatRedirect: true,
                    matchDate: match.date,
                    matchTime: match.time
                }
            });

            // 4. Send System Message to Chat
            await this.chatService.sendMessage(
                channel.id,
                hostTeam.captain.id, // System message sender (can be anyone or specific system user)
                `Eşleşme Onaylandı!\n${match.date} ${match.time}\n\nMaçı kesinleştirmek için Sahayı arayın ve saatinizi rezerve edin.\nAcele et! Yerinizi kapabilirler.`,
                true
            );
        }

        return challenge;
    }
}
