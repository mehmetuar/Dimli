import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Challenge } from './challenge.entity';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { MatchAnnouncementsService } from '../match-announcements/match-announcements.service';
import { TeamsService } from '../teams/teams.service';
import { ChatService } from '../chat/chat.service';
import { ReservationsService } from '../reservations/reservations.service';

@Injectable()
export class ChallengesService {
  constructor(
    @InjectRepository(Challenge)
    private challengesRepository: Repository<Challenge>,
    @InjectRepository(MatchAnnouncement)
    private matchAnnouncementsRepository: Repository<MatchAnnouncement>,
    private notificationsService: NotificationsService,
    private matchAnnouncementsService: MatchAnnouncementsService,
    private teamsService: TeamsService,
    private chatService: ChatService,
    private reservationsService: ReservationsService,
  ) {}

  async create(
    fromTeamId: string,
    toMatchId: string,
    note?: string,
  ): Promise<Challenge> {
    // 0. Check for existing pending challenge
    const existingChallenge = await this.challengesRepository.findOne({
      where: {
        fromTeamId,
        toMatchId,
        status: 'PENDING',
      },
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
    const match = await this.matchAnnouncementsRepository.findOne({
      where: { id: toMatchId },
      relations: ['team', 'team.captain'],
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
        matchTime: match.time,
      },
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
      order: { createdAt: 'DESC' },
    });
  }

  async findIncomingByTeamId(teamId: string): Promise<Challenge[]> {
    // Find match announcements created by this team
    const matches = await this.matchAnnouncementsRepository.find({
      where: { teamId },
      select: ['id'],
    });

    const matchIds = matches.map((m) => m.id);

    if (matchIds.length === 0) return [];

    // Find PENDING challenges for these matches
    return this.challengesRepository
      .createQueryBuilder('challenge')
      .leftJoinAndSelect('challenge.fromTeam', 'fromTeam') // Challenger Team
      .leftJoinAndSelect('challenge.match', 'match') // Match Announcement
      .leftJoinAndSelect('match.pitch', 'pitch') // Pitch info
      .leftJoinAndSelect('pitch.business', 'business') // Business/Facility info
      .where('challenge.toMatchId IN (:...matchIds)', { matchIds })
      .andWhere('challenge.status = :status', { status: 'PENDING' })
      .orderBy('challenge.createdAt', 'DESC')
      .getMany();
  }

  async delete(id: string): Promise<void> {
    const challenge = await this.challengesRepository.findOne({
      where: { id },
    });
    if (!challenge) throw new Error('Challenge not found');

    // Delete related notification
    const notification = await this.notificationsService[
      'notificationsRepository'
    ].findOne({
      where: {
        type: 'CHALLENGE',
        relatedId: id,
      },
    });

    if (notification) {
      await this.notificationsService.delete(notification.id);
    }

    await this.challengesRepository.delete(id);
  }

  async updateStatus(
    id: string,
    status: 'ACCEPTED' | 'REJECTED',
  ): Promise<Challenge> {
    await this.challengesRepository.update(id, { status });
    const challenge = await this.challengesRepository.findOne({
      where: { id },
    });

    if (!challenge) throw new Error('Challenge not found');

    // Delete the original challenge notification
    const notification = await this.notificationsService[
      'notificationsRepository'
    ].findOne({
      where: {
        type: 'CHALLENGE',
        relatedId: id,
      },
    });

    if (notification) {
      await this.notificationsService.delete(notification.id);
    }

    console.log('🔵 Challenge status updated to:', status, 'Challenge ID:', id);

    if (status === 'ACCEPTED') {
      console.log('✅ Challenge ACCEPTED! Starting match confirmation flow...');

      // 1. Update Match Status to CONFIRMED
      await this.matchAnnouncementsRepository.update(challenge.toMatchId, {
        status: 'CONFIRMED',
      });
      console.log(
        '📝 Match status updated to CONFIRMED for match:',
        challenge.toMatchId,
      );

      // 2. Create Chat Channel
      const match = await this.matchAnnouncementsRepository.findOne({
        where: { id: challenge.toMatchId },
        relations: [
          'team',
          'team.captain',
          'team.players',
          'pitch',
          'pitch.business',
          'pitch.timeSlots',
        ],
      });

      if (!match) throw new Error('Match not found');

      const challengerTeam = await this.teamsService.findOne(
        challenge.fromTeamId,
      );
      if (!challengerTeam) throw new Error('Challenger team not found');

      const hostTeam = match.team;

      // Participants: All players from both teams
      const hostPlayers = hostTeam.players?.length ? hostTeam.players : [hostTeam.captain];
      const challengerPlayers = challengerTeam.players?.length ? challengerTeam.players : [challengerTeam.captain];
      const participants = [...hostPlayers, ...challengerPlayers];

      // Create Group Chat
      const channel = await this.chatService.createChannel(
        'MATCH_GROUP',
        `${hostTeam.name} vs ${challengerTeam.name}`,
        participants,
        match.id,
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
          matchTime: match.time,
        },
      });

      // 4. Send System Message to Chat — Detailed format
      const businessName = match.pitch?.business?.name || 'İşletme';
      const pitchName = match.pitch?.name || 'Saha';

      // Parse date and format with day name
      const [matchYear, matchMonth, matchDay] = match.date
        .split('-')
        .map(Number);
      const [matchHours, matchMinutes] = match.time.split(':').map(Number);
      const matchDateTime = new Date(
        matchYear,
        matchMonth - 1,
        matchDay,
        matchHours,
        matchMinutes,
      );
      const dayName = matchDateTime.toLocaleDateString('tr-TR', {
        weekday: 'long',
      });
      const formattedDate = matchDateTime.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      // Calculate end time from pitch time slots or default +1 hour
      let endTimeStr = '';
      const timeSlots = match.pitch?.timeSlots;
      if (timeSlots && timeSlots.length > 0) {
        const matchingSlot = timeSlots.find(
          (slot) => slot.startTime === match.time,
        );
        if (matchingSlot) {
          endTimeStr = matchingSlot.endTime;
        }
      }
      if (!endTimeStr) {
        const endTime = new Date(matchDateTime.getTime() + 60 * 60 * 1000);
        endTimeStr = endTime.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        });
      }

      await this.chatService.sendMessage(
        channel.id,
        null,
        `Sohbet Oluşturuldu\n\n` +
          `{{STADIUM}} ${businessName}\n` +
          `{{PIN}} ${pitchName}\n` +
          `{{CALENDAR}} ${formattedDate} ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}\n` +
          `{{CLOCK}} ${match.time} - ${endTimeStr}\n\n` +
          `Maçı kesinleştirmek için Sahayı arayın ve saatinizi rezerve edin.\nAcele et! Yerinizi kapabilirler.`,
        true,
      );

      // 5. 🆕 CREATE AUTOMATIC PENDING RESERVATION
      console.log('🎫 Creating auto-reservation...', {
        pitchId: match.pitchId,
        date: match.date,
        time: match.time,
      });
      try {
        // Parse date and time
        const [hours, minutes] = match.time.split(':').map(Number);
        const slotDateTime = new Date(match.date);
        slotDateTime.setHours(hours, minutes, 0, 0);
        console.log('📅 Slot DateTime:', slotDateTime.toISOString());

        const reservationData = {
          pitchId: match.pitchId,
          teamId: match.teamId, // Host team
          opponentTeamId: challenge.fromTeamId, // Challenger team
          slotTime: slotDateTime,
          type: 'MATCH',
          matchAnnouncementId: match.id,
        };
        console.log(
          '📦 Reservation data to create:',
          JSON.stringify(reservationData, null, 2),
        );

        const createdReservation =
          await this.reservationsService.create(reservationData);
        console.log('✅ Reservation created successfully!', createdReservation);

        console.log('✅ Auto-reservation created for match:', match.id);
      } catch (err) {
        console.error('❌ Failed to create auto-reservation:', err);
        // Don't throw - match is still confirmed even if reservation fails
      }
    }

    return challenge;
  }
}
