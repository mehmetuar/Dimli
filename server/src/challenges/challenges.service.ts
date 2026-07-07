import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Challenge } from './challenge.entity';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { MatchAnnouncementsService } from '../match-announcements/match-announcements.service';
import { TeamsService } from '../teams/teams.service';
import { ChatService } from '../chat/chat.service';
import { ReservationsService } from '../reservations/reservations.service';
import {
  istanbulDateTimeToUtc,
  nowInIstanbul,
} from '../common/turkey-time.util';
import { assertNoteWithinLimit } from '../common/text-limit.util';

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
    // Not: en fazla 50 karakter — hem Meydan Okuma hem Maç Teklifi bu uçtan geçer
    assertNoteWithinLimit(note, 50, 'Not');
    // 0. Check for existing pending challenge
    const existingChallenge = await this.challengesRepository.findOne({
      where: {
        fromTeamId,
        toMatchId,
        status: 'PENDING',
      },
    });

    if (existingChallenge) {
      throw new ConflictException(
        'Bu maça zaten meydan okudunuz. Cevap bekleniyor.',
      );
    }

    // 1. Fetch Match Announcement (challenge kaydından ÖNCE — slot uygunluğu için)
    const match = await this.matchAnnouncementsRepository.findOne({
      where: { id: toMatchId },
      relations: ['team', 'team.captain'],
    });

    if (!match) throw new NotFoundException('Maç bulunamadı.');

    // 1b. Slot kapalı/dolu mu? (sabit/manuel kapatma veya başka takımca onaylı maç) —
    // kapalı slottaki ilana meydan okuma gönderilmesini anında engelle (gönderen
    // kullanıcı uyarıyı send anında görür).
    await this.reservationsService.assertSlotAvailable(
      match.pitchId,
      istanbulDateTimeToUtc(match.date, match.time),
    );

    // 2. Create Challenge Record
    const challenge = this.challengesRepository.create({
      fromTeamId,
      toMatchId,
      note,
      status: 'PENDING',
    });
    const savedChallenge = await this.challengesRepository.save(challenge);

    // 3. Fetch Challenger Team Name
    const challengerTeam = await this.teamsService.findOne(fromTeamId);
    if (!challengerTeam)
      throw new NotFoundException('Meydan okuyan takım bulunamadı.');

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

  // Takım İstekleri ekranı: takımın GELECEK maçlara gönderdiği ve hâlâ CEVAP
  // BEKLEYEN meydan okumalar, opponent takım + saha + işletme join'li
  // (findIncomingByTeamId deseni). Yalnız PENDING — kabul edilenler bu listeden
  // düşer (kesinleşen maç Yaklaşan Maçlar'da görünür). Geçmiş maçlar
  // (date+time < now) hariç → ekran kirlenmez; cron artıkları da temizler.
  async findActiveOutgoingByTeamId(teamId: string): Promise<Challenge[]> {
    const { dateStr: todayStr, hours, minutes } = nowInIstanbul();
    const currentTimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    return (
      this.challengesRepository
        .createQueryBuilder('challenge')
        .leftJoinAndSelect('challenge.match', 'match')
        .leftJoinAndSelect('match.team', 'opponentTeam')
        .leftJoinAndSelect('match.pitch', 'pitch')
        .leftJoinAndSelect('pitch.business', 'business')
        .where('challenge.fromTeamId = :teamId', { teamId })
        .andWhere('challenge.status = :status', { status: 'PENDING' })
        // Yalnız gelecek maçlar (İstanbul date+time >= now)
        .andWhere(
          new Brackets((qb) => {
            qb.where('match.date > :today', { today: todayStr }).orWhere(
              new Brackets((qb2) => {
                qb2
                  .where('match.date = :today', { today: todayStr })
                  .andWhere('match.time >= :nowTime', {
                    nowTime: currentTimeStr,
                  });
              }),
            );
          }),
        )
        .orderBy('match.date', 'ASC')
        .addOrderBy('match.time', 'ASC')
        .getMany()
    );
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

  async delete(id: string, userId?: string): Promise<void> {
    const challenge = await this.challengesRepository.findOne({
      where: { id },
    });
    if (!challenge) throw new NotFoundException('Meydan okuma bulunamadı.');

    // Yetki: yalnız meydan okuyan takımın kaptanı/yardımcı kaptanı geri çekebilir
    // (joker cancel F1 deseniyle aynı). userId verildiyse doğrula.
    if (userId) {
      const team = await this.teamsService.findOne(challenge.fromTeamId);
      const isLeader =
        !!team &&
        (team.captainId === userId ||
          (team.viceCaptainIds || []).includes(userId));
      if (!isLeader) {
        throw new ForbiddenException(
          'Bu meydan okumayı yalnız takım kaptanı veya yardımcı kaptanı geri çekebilir.',
        );
      }
      if (challenge.status !== 'PENDING') {
        throw new BadRequestException(
          'Yalnız cevap bekleyen meydan okumalar geri çekilebilir.',
        );
      }
    }

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

    if (!challenge) throw new NotFoundException('Meydan okuma bulunamadı.');

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

      if (!match) throw new NotFoundException('Maç bulunamadı.');

      const challengerTeam = await this.teamsService.findOne(
        challenge.fromTeamId,
      );
      if (!challengerTeam)
        throw new NotFoundException('Meydan okuyan takım bulunamadı.');

      const hostTeam = match.team;

      // Participants: All players from both teams
      const hostPlayers = hostTeam.players?.length
        ? hostTeam.players
        : [hostTeam.captain];
      const challengerPlayers = challengerTeam.players?.length
        ? challengerTeam.players
        : [challengerTeam.captain];
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

      // Parse date and format with day name — matchDateTime doğru mutlak an
      // tutuyor, görüntülemede açıkça İstanbul saatine çevrilmeli.
      const matchDateTime = istanbulDateTimeToUtc(match.date, match.time);
      const dayName = matchDateTime.toLocaleDateString('tr-TR', {
        weekday: 'long',
        timeZone: 'Europe/Istanbul',
      });
      const formattedDate = matchDateTime.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/Istanbul',
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
          timeZone: 'Europe/Istanbul',
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
        console.log('📅 Slot DateTime:', matchDateTime.toISOString());

        const reservationData = {
          pitchId: match.pitchId,
          teamId: match.teamId, // Host team
          opponentTeamId: challenge.fromTeamId, // Challenger team
          slotTime: matchDateTime,
          type: 'MATCH' as const,
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
