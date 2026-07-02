import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  Logger,
  Inject,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, LessThan } from 'typeorm';
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
import { RatingsService } from '../ratings/ratings.service';
import { AppGateway } from '../gateway/app.gateway';
import { UserBlocksService } from '../user-blocks/user-blocks.service';
import { istanbulDateTimeToUtc } from '../common/turkey-time.util';

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
    private ratingsService: RatingsService,
    @Optional() private gateway: AppGateway,
    private userBlocksService: UserBlocksService,
  ) {}

  async createChannel(
    type: 'DM' | 'MATCH_GROUP' | 'TEAM_INTERNAL' | 'JOKER_NEGOTIATION',
    name: string,
    participants: User[],
    relatedMatchId?: string,
  ): Promise<ChatChannel> {
    const channel = this.chatChannelRepository.create({
      type,
      name,
      relatedMatchId,
    });
    const savedChannel = await this.chatChannelRepository.save(channel);

    // Create participants
    for (const user of participants) {
      const participant = this.chatParticipantRepository.create({
        channelId: savedChannel.id,
        userId: user.id,
      });
      await this.chatParticipantRepository.save(participant);
    }

    if (this.gateway?.server) {
      participants.forEach((u) =>
        this.gateway.server
          .to(u.id)
          .emit('channelCreated', { channelId: savedChannel.id }),
      );
    }

    return savedChannel;
  }

  async getUserChannels(userId: string): Promise<any[]> {
    const currentUser = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['team'],
    });
    const userTeamId = currentUser?.team?.id || null;

    // Find channels where user is a participant and hasn't soft-deleted
    const participations = await this.chatParticipantRepository.find({
      where: { userId, deletedAt: IsNull() },
      relations: [
        'channel',
        'channel.participants',
        'channel.participants.user',
      ],
      order: { channel: { lastActivityAt: 'DESC' } },
    });

    if (!participations.length) return [];

    const channelIds = participations.map((p) => p.channelId);

    // Batch: son mesaj her kanal için (DISTINCT ON — tek sorgu)
    const lastMessageRows: any[] =
      await this.chatMessageRepository.manager.query(
        `
            SELECT DISTINCT ON (m."channelId")
                m.id, m."channelId", m."senderId", m.content, m."isSystemMessage", m.metadata, m."createdAt",
                u.username, u.full_name as "fullName", u.avatar_url as "avatarUrl"
            FROM chat_messages m
            LEFT JOIN "user" u ON u.id = m."senderId"
            WHERE m."channelId" = ANY($1)
            ORDER BY m."channelId", m."createdAt" DESC
        `,
        [channelIds],
      );

    const lastMessageMap = new Map<string, any>(
      lastMessageRows.map((r) => [
        r.channelId,
        {
          id: r.id,
          channelId: r.channelId,
          senderId: r.senderId,
          content: r.content,
          isSystemMessage: r.isSystemMessage,
          metadata: r.metadata,
          createdAt: r.createdAt,
          sender: r.senderId
            ? {
                username: r.username,
                full_name: r.fullName,
                avatarUrl: r.avatarUrl,
              }
            : null,
        },
      ]),
    );

    // Batch: kanal başına okunmamış sayısı (tek aggregation sorgusu)
    const unreadRows: any[] = await this.chatMessageRepository.manager.query(
      `
            SELECT m."channelId", COUNT(*) as unread_count
            FROM chat_messages m
            JOIN chat_participants_v2 cp
                ON cp."channelId" = m."channelId"
                AND cp."userId" = $1
                AND cp."deletedAt" IS NULL
            WHERE m."channelId" = ANY($2)
              AND m."createdAt" > cp."lastReadAt"
              AND (m."isSystemMessage" = true OR m."senderId" != $1)
            GROUP BY m."channelId"
        `,
      [userId, channelIds],
    );

    const unreadMap = new Map<string, number>(
      unreadRows.map((r) => [
        r.channelId as string,
        parseInt(r.unread_count as string, 10),
      ]),
    );

    // ── Batch enrichment (N+1 kaldırıldı): kanal-başına sorgu yerine sabit
    //    sayıda toplu sorgu + in-memory map. Dönüş şekli birebir korunur. ──
    const matchIds = Array.from(
      new Set(
        participations
          .map((p) => p.channel?.relatedMatchId)
          .filter((id): id is string => !!id),
      ),
    );

    // 1) matchAnnouncementId ile bağlı rezervasyonlar (primary) — tek sorgu
    const reservationByMatchId = new Map<string, any>();
    if (matchIds.length) {
      const primaryReservations = await this.reservationRepository.find({
        where: { matchAnnouncementId: In(matchIds) },
      });
      for (const r of primaryReservations) {
        if (r.matchAnnouncementId)
          reservationByMatchId.set(r.matchAnnouncementId, r);
      }
    }

    // 2) Maç ilanları — fallback + requiredPlayerCount + avatar (teamId/matchType) tek sorguda
    const matchById = new Map<string, any>();
    if (matchIds.length) {
      const matches = await this.matchAnnouncementRepository.find({
        where: { id: In(matchIds) },
      });
      for (const m of matches) matchById.set(m.id, m);
    }

    // 3) Fallback rezervasyon (eski maçlar): primary bulunmayanlar için team+slot eşleştirme
    const fallbackSpecs: { matchId: string; teamId: string; slotMs: number }[] =
      [];
    for (const matchId of matchIds) {
      if (reservationByMatchId.has(matchId)) continue;
      const m = matchById.get(matchId);
      if (!m) continue;
      try {
        const slotTime = istanbulDateTimeToUtc(m.date, m.time);
        fallbackSpecs.push({
          matchId,
          teamId: m.teamId,
          slotMs: new Date(slotTime).getTime(),
        });
      } catch {
        // ignore date parse errors
      }
    }
    if (fallbackSpecs.length) {
      const fallbackTeamIds = Array.from(
        new Set(fallbackSpecs.map((s) => s.teamId)),
      );
      const fallbackReservations = await this.reservationRepository.find({
        where: { teamId: In(fallbackTeamIds), type: 'MATCH' as any },
      });
      const fallbackByTeamSlot = new Map<string, any>();
      for (const r of fallbackReservations) {
        fallbackByTeamSlot.set(
          `${r.teamId}|${new Date(r.slotTime).getTime()}`,
          r,
        );
      }
      for (const spec of fallbackSpecs) {
        const r = fallbackByTeamSlot.get(`${spec.teamId}|${spec.slotMs}`);
        if (r) reservationByMatchId.set(spec.matchId, r);
      }
    }

    // 4) İlgili tüm teamId'ler (oyuncu sayısı + avatar takımları için birleşik küme)
    const teamIdSet = new Set<string>();
    for (const r of reservationByMatchId.values()) {
      if (r.teamId) teamIdSet.add(r.teamId);
      if (r.opponentTeamId) teamIdSet.add(r.opponentTeamId);
    }
    for (const m of matchById.values()) {
      if (m.teamId) teamIdSet.add(m.teamId);
    }
    const teamIds = Array.from(teamIdSet);

    // 5) Oyuncu sayıları — tek GROUP BY (getTeamPlayerCount ×N yerine)
    const playerCountByTeam = new Map<string, number>();
    if (teamIds.length) {
      const countRows: any[] = await this.userRepository.manager.query(
        `SELECT team_id, COUNT(*)::int AS count FROM "user" WHERE team_id = ANY($1) GROUP BY team_id`,
        [teamIds],
      );
      for (const row of countRows)
        playerCountByTeam.set(row.team_id, Number(row.count));
    }

    // 6) Avatar için takım kayıtları — tek sorgu
    const teamById = new Map<string, any>();
    if (teamIds.length) {
      const teams = await this.teamRepository.find({
        where: { id: In(teamIds) },
        select: ['id', 'name', 'logoUrl', 'primaryColor'] as any,
      });
      for (const t of teams) teamById.set(t.id, t);
    }

    // ── Kanal-başına saf in-memory map'leme (DB'ye gitmez) ──
    const channels = participations.map((p) => {
      const channel = p.channel;
      const unreadCount = unreadMap.get(p.channelId) ?? 0;
      const lastMessage = lastMessageMap.get(p.channelId) ?? null;

      let reservationData: {
        id?: string;
        status: string;
        slotTime: Date;
        cancelRequested?: boolean;
        teamId?: string;
        opponentTeamId?: string;
        homeTeamPlayerCount?: number;
        awayTeamPlayerCount?: number;
        requiredPlayerCount?: number | null;
      } | null = null;
      let isJoker = false;

      if (channel.relatedMatchId) {
        const reservation = reservationByMatchId.get(channel.relatedMatchId);
        const match = matchById.get(channel.relatedMatchId);

        if (reservation) {
          reservationData = {
            id: reservation.id,
            status: reservation.status,
            slotTime: reservation.slotTime,
            cancelRequested: reservation.cancelRequested,
            teamId: reservation.teamId,
            opponentTeamId: reservation.opponentTeamId,
            homeTeamPlayerCount: playerCountByTeam.get(reservation.teamId) ?? 0,
            // undefined for kendi aramızda (no opponent) to avoid false warnings
            awayTeamPlayerCount: reservation.opponentTeamId
              ? (playerCountByTeam.get(reservation.opponentTeamId) ?? 0)
              : undefined,
            requiredPlayerCount: match?.playerCount ?? null,
          } as any;
        } else if (match) {
          // FALLBACK: rezervasyon yok → maç durumunu yansıt (eski maçlar)
          try {
            const slotDateTime = istanbulDateTimeToUtc(match.date, match.time);
            reservationData = {
              status: match.status === 'CONFIRMED' ? 'APPROVED' : 'PENDING',
              slotTime: slotDateTime,
              teamId: match.teamId,
            } as any;
          } catch {
            // ignore date parse errors
          }
        }

        // Determine if current user is a joker
        if (channel.type === 'MATCH_GROUP') {
          if (userTeamId && reservationData) {
            if (
              userTeamId !== (reservationData as any).teamId &&
              userTeamId !== (reservationData as any).opponentTeamId
            ) {
              isJoker = true;
            }
          } else if (!userTeamId) {
            isJoker = true; // Without a team, definitely a joker in a MATCH_GROUP
          }
        }
      }

      // ── Avatar data: kanal tipine göre görsel için gerekli veriler ──────
      let avatarData: {
        matchType?: string;
        homeTeamLogo?: string | null;
        homeTeamName?: string;
        homeTeamColor?: string | null;
        awayTeamLogo?: string | null;
        awayTeamName?: string;
        awayTeamColor?: string | null;
        otherUserAvatar?: string | null;
        otherUserName?: string;
      } | null = null;

      if (channel.type === 'MATCH_GROUP' && channel.relatedMatchId) {
        const matchForType = matchById.get(channel.relatedMatchId);
        if (matchForType) {
          const homeTeamId =
            (reservationData as any)?.teamId || matchForType.teamId;
          const awayTeamId = (reservationData as any)?.opponentTeamId || null;

          const homeTeam = homeTeamId ? teamById.get(homeTeamId) : null;
          const awayTeam = awayTeamId ? teamById.get(awayTeamId) : null;

          avatarData = {
            matchType: matchForType.matchType,
            homeTeamLogo: homeTeam?.logoUrl ?? null,
            homeTeamName: homeTeam?.name ?? '',
            homeTeamColor: homeTeam?.primaryColor ?? null,
            awayTeamLogo: awayTeam?.logoUrl ?? null,
            awayTeamName: awayTeam?.name ?? '',
            awayTeamColor: awayTeam?.primaryColor ?? null,
          };
        }
      } else if (channel.type === 'JOKER_NEGOTIATION') {
        // channel.participants relation ile zaten yüklü — ekstra DB sorgusu yok
        const other = channel.participants?.find(
          (pp: any) => pp.userId !== userId && !pp.deletedAt,
        );
        if (other?.user) {
          avatarData = {
            otherUserAvatar: other.user.avatarUrl ?? null,
            otherUserName: other.user.full_name || other.user.username || '',
          };
        }
      }

      return {
        ...channel,
        lastMessage,
        unreadCount,
        reservation: reservationData,
        isJoker,
        avatarData,
      };
    });

    // DB'den gelen lastActivityAt DESC sırası korunur — en son mesajı olan
    // kanal her zaman en üstte görünür.

    // Teşhis: client'a dönen unreadCount değerleri — okunmadı rozeti
    // şikayetlerinde DB'deki gerçek durumla client'a giden veriyi
    // karşılaştırmak için.
    new Logger('ChatService').log(
      `getUserChannels(${userId}) → unreadCount'lar: ${channels
        .map((c) => `${c.id}=${c.unreadCount}`)
        .join(', ')}`,
    );

    return channels;
  }

  /**
   * Helper: Determine match status type for a channel.
   * Returns 'pending' | 'confirmed' | 'played' | 'unplayed' | null
   */
  private async getChannelMatchStatusType(
    channelId: string,
  ): Promise<'pending' | 'confirmed' | 'played' | 'unplayed' | null> {
    const channel = await this.chatChannelRepository.findOne({
      where: { id: channelId },
    });
    if (!channel || !channel.relatedMatchId) return null;

    // Find reservation
    let reservation = await this.reservationRepository.findOne({
      where: { matchAnnouncementId: channel.relatedMatchId },
    });

    if (!reservation) {
      const match = await this.matchAnnouncementRepository.findOne({
        where: { id: channel.relatedMatchId },
      });
      if (match) {
        try {
          const slotDateTime = istanbulDateTimeToUtc(match.date, match.time);
          reservation = await this.reservationRepository.findOne({
            where: {
              teamId: match.teamId,
              slotTime: slotDateTime,
              type: 'MATCH',
            },
          });
          if (!reservation) {
            // No reservation found, determine from match data
            const now = new Date();
            if (now > slotDateTime) {
              return match.status === 'CONFIRMED' ? 'played' : 'unplayed';
            }
            return match.status === 'CONFIRMED' ? 'confirmed' : 'pending';
          }
        } catch {
          return null;
        }
      } else {
        return null;
      }
    }

    const now = new Date();
    const slotDate = new Date(reservation.slotTime);
    const matchEndTime = new Date(slotDate.getTime() + 60 * 60 * 1000);

    if (reservation.status === 'REJECTED') {
      return 'unplayed';
    }
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

  async sendMessage(
    channelId: string,
    senderId: string | null,
    content: string,
    isSystemMessage = false,
    metadata?: any,
    // skipPush: mesaj sohbete düşer + websocket'le iletilir ama FCM push ATILMAZ.
    // Aynı olay için ayrı bir bildirim (örn. BUSINESS_NOTE/MATCH_APPROVED) zaten push
    // gönderdiğinde çift push'u önlemek için kullanılır. Varsayılan false → diğer
    // tüm çağıranlar aynı davranışta kalır.
    skipPush = false,
  ): Promise<ChatMessage> {
    // System messages can always be sent
    if (!isSystemMessage && senderId) {
      const sender = await this.userRepository.findOne({
        where: { id: senderId },
      });
      if (sender?.isChatBanned) {
        if (sender.chatBanExpiry && sender.chatBanExpiry < new Date()) {
          await this.userRepository.update(sender.id, {
            isChatBanned: false,
            chatBannedAt: null,
            chatBanExpiry: null,
          });
        } else {
          throw new HttpException(
            {
              statusCode: 403,
              error: 'Forbidden',
              message: 'Mesaj engeliniz var.',
              chatBanExpiry: sender.chatBanExpiry?.toISOString() ?? null,
            },
            403,
          );
        }
      }

      const statusType = await this.getChannelMatchStatusType(channelId);
      if (statusType === 'played' || statusType === 'unplayed') {
        throw new ForbiddenException(
          'Maç tamamlandığı için mesaj gönderilemez.',
        );
      }
    }

    const message = this.chatMessageRepository.create({
      channelId,
      senderId,
      content,
      isSystemMessage,
      metadata,
    });

    await this.chatMessageRepository.save(message);

    // Update last activity — DB tarafında CURRENT_TIMESTAMP kullanılıyor (UTC,
    // doğrulandı) çünkü TypeORM'un .update() metodu JS Date nesnelerini
    // "timestamp without time zone" kolonlara sunucu sürecinin yerel saat
    // dilimiyle yazıyor; bu da createdAt (UTC, @CreateDateColumn ile yazılır)
    // ile karşılaştırıldığında saatler süren bir kaymaya yol açabiliyordu.
    await this.chatChannelRepository.update(channelId, {
      lastActivityAt: () => 'CURRENT_TIMESTAMP',
    });

    // Gönderenin lastReadAt'ını şimdi olarak güncelle (zaten okumuş sayılır).
    // Sistem mesajlarında gerçek bir gönderen yok (senderId: null) — bu yüzden
    // hiçbir katılımcının okunmadı durumu burada sıfırlanmaz.
    if (senderId) {
      await this.chatParticipantRepository.update(
        { channelId, userId: senderId },
        { lastReadAt: () => 'CURRENT_TIMESTAMP' },
      );
    }

    const savedMessage = await this.chatMessageRepository.findOne({
      where: { id: message.id },
      relations: ['sender'],
    });

    if (!savedMessage) throw new Error('Failed to create message');

    const participants = await this.chatParticipantRepository.find({
      where: { channelId, deletedAt: IsNull() },
      select: ['userId'],
    });

    if (this.gateway?.server) {
      const payload = {
        channelId,
        message: {
          id: savedMessage.id,
          senderId: savedMessage.senderId,
          content: savedMessage.content,
          createdAt: savedMessage.createdAt,
        },
      };
      participants.forEach((p) =>
        this.gateway.server.to(p.userId).emit('newMessage', payload),
      );
    }

    if (!skipPush) {
      // Sistem mesajları dahil HER mesaj türü için push + okunmadı sayacı
      // tetiklenir — gönderenin kendisi (varsa) zaten yukarıda okumuş sayıldı,
      // diğer tüm katılımcılar bildirim alır.
      const channel = await this.chatChannelRepository.findOne({
        where: { id: channelId },
      });
      const sender = senderId
        ? await this.userRepository.findOne({ where: { id: senderId } })
        : null;
      const senderName = sender?.full_name ?? 'Dimli';
      if (channel) {
        const recipientIds = participants
          .map((p) => p.userId)
          .filter((uid) => uid !== senderId);
        const pushLogger = new Logger('ChatService');
        Promise.all(
          recipientIds.map(
            async (uid) => [uid, await this.getUnreadCount(uid)] as const,
          ),
        )
          .then((entries) => {
            // Teşhis: hangi kanala, kaç alıcıya push tetiklendi ve her birinin
            // o anki okunmamış sayısı (badge) ne — production'da push/badge
            // şikayetlerinde ilk bakılacak log satırı.
            pushLogger.log(
              `sendMessage push tetiklendi → channelId=${channelId} senderId=${senderId ?? 'SISTEM'} alıcılar=${entries
                .map(([uid, count]) => `${uid}(unread=${count})`)
                .join(', ')}`,
            );
            return this.notificationsService.sendChatPushToParticipants(
              senderId,
              senderName,
              channelId,
              channel.type,
              channel.name ?? null,
              content,
              participants.map((p) => p.userId),
              new Map(entries),
            );
          })
          .catch((e) =>
            pushLogger.error(`sendMessage push zinciri hata verdi: ${e}`),
          );
      }
    }

    return savedMessage;
  }

  async getChannelMessages(
    channelId: string,
    requestingUserId: string,
    before?: string,
    limit = 50,
  ): Promise<ChatMessage[]> {
    const PAGE = Math.min(limit, 100);

    const blockedUserIds =
      await this.userBlocksService.getBlockedUserIds(requestingUserId);

    let messages: ChatMessage[];
    if (before) {
      messages = await this.chatMessageRepository.find({
        where: { channelId, createdAt: LessThan(new Date(before)) },
        relations: ['sender', 'sender.team'],
        order: { createdAt: 'DESC' },
        take: PAGE,
      });
    } else {
      messages = await this.chatMessageRepository.find({
        where: { channelId },
        relations: ['sender', 'sender.team'],
        order: { createdAt: 'DESC' },
        take: PAGE,
      });
    }

    const filtered =
      blockedUserIds.length > 0
        ? messages.filter(
            (m) =>
              m.isSystemMessage ||
              !m.senderId ||
              !blockedUserIds.includes(m.senderId),
          )
        : messages;

    // Rakipli maç chatlerinde gönderenin takımını client'a iletmek için
    // Team'i gerekli alanlara indirgiyoruz (description, fairPlayScore vb. taşınmaz).
    for (const m of filtered) {
      if (m.sender?.team) {
        m.sender.team = {
          id: m.sender.team.id,
          name: m.sender.team.name,
          logoUrl: m.sender.team.logoUrl,
          primaryColor: m.sender.team.primaryColor,
          secondaryColor: m.sender.team.secondaryColor,
        } as Team;
      }
    }

    return filtered.reverse();
  }

  async markAsRead(channelId: string, userId: string): Promise<void> {
    await this.chatParticipantRepository.update(
      { channelId, userId },
      { lastReadAt: () => 'CURRENT_TIMESTAMP' },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await this.chatMessageRepository.manager.query(
      `
            SELECT COUNT(*) as total
            FROM chat_messages m
            JOIN chat_participants_v2 cp
                ON cp."channelId" = m."channelId"
                AND cp."userId" = $1
                AND cp."deletedAt" IS NULL
            WHERE m."createdAt" > cp."lastReadAt"
              AND (m."isSystemMessage" = true OR m."senderId" != $1)
        `,
      [userId],
    );
    return parseInt((result[0]?.total ?? '0') as string, 10);
  }

  async deleteChannel(channelId: string, userId: string): Promise<void> {
    const logger = new Logger('ChatService');
    logger.log(
      `Attempting to soft-delete channel ${channelId} for user ${userId}`,
    );

    const channel = await this.chatChannelRepository.findOne({
      where: { id: channelId },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    // Verify participant
    const participant = await this.chatParticipantRepository.findOne({
      where: { channelId, userId, deletedAt: IsNull() },
    });

    if (!participant) {
      throw new ForbiddenException(
        'Bu sohbetin katılımcısı değilsiniz veya zaten silinmiş.',
      );
    }

    // Check match status — only allow deletion for 'played' or 'unplayed'
    // EXCEPT FOR JOKER NEGOTIATIONS! Joker negotiations can be cancelled anytime.
    if (channel.type === 'JOKER_NEGOTIATION') {
      const allParticipants = await this.chatParticipantRepository.find({
        where: { channelId, deletedAt: IsNull() },
        relations: ['user'],
      });

      const otherParticipant = allParticipants.find((p) => p.userId !== userId);
      const thisParticipant = allParticipants.find((p) => p.userId === userId);

      // Soft-delete for everyone
      await this.chatParticipantRepository.update(
        { channelId },
        { deletedAt: new Date() },
      );

      if (otherParticipant && thisParticipant) {
        await this.notificationsService.create({
          userId: otherParticipant.userId,
          type: 'SYSTEM',
          title: 'Joker Anlaşması İptal Edildi',
          message: `${thisParticipant.user.full_name || thisParticipant.user.username} ile olan joker anlaşmanız iptal edildi.`,
          read: false,
        });
      }

      logger.log(
        `Joker negotiation channel ${channelId} cancelled and soft-deleted for all participants.`,
      );
      return;
    }

    const statusType = await this.getChannelMatchStatusType(channelId);
    logger.debug(`Channel ${channelId} match status: ${statusType}`);

    if (statusType === 'pending' || statusType === 'confirmed') {
      throw new ForbiddenException(
        'Kesinleşmiş veya onay bekleyen sohbetler silinemez.',
      );
    }

    // Per-user soft-delete: only mark this user's participation as deleted
    await this.chatParticipantRepository.update(
      { id: participant.id },
      { deletedAt: new Date() },
    );

    logger.log(`Channel ${channelId} soft-deleted for user ${userId}.`);
  }

  async getChannelMatchDetails(channelId: string): Promise<any> {
    // 1. Find the channel
    const channel = await this.chatChannelRepository.findOne({
      where: { id: channelId },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    if (!channel.relatedMatchId) {
      return {
        error: 'NO_MATCH',
        message: 'Bu sohbetin bir maçla ilişkisi yok.',
      };
    }

    // 2. Find the match announcement with team and pitch
    const match = await this.matchAnnouncementRepository.findOne({
      where: { id: channel.relatedMatchId },
      relations: ['team', 'pitch', 'pitch.business', 'pitch.business.owner'],
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
        const slotDateTime = istanbulDateTimeToUtc(match.date, match.time);

        reservation = await this.reservationRepository.findOne({
          where: {
            teamId: match.teamId,
            slotTime: slotDateTime,
            type: 'MATCH',
          },
        });
      } catch {
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
    const now = new Date();
    const countMatchesForTeam = async (
      teamId: string | null,
    ): Promise<number> => {
      if (!teamId) return 0;
      return this.reservationRepository
        .createQueryBuilder('r')
        .where('r.status = :status', { status: 'APPROVED' })
        .andWhere('r.slotTime < :now', { now })
        .andWhere('(r.teamId = :id OR r.opponentTeamId = :id)', { id: teamId })
        .getCount();
    };

    const [homeMatchCount, awayMatchCount] = await Promise.all([
      countMatchesForTeam(homeTeam?.id ?? null),
      countMatchesForTeam((awayTeam?.id ?? null) as string | null),
    ]);

    const buildTeamData = (team: any, matchCount: number) => {
      if (!team) return null;
      return {
        id: team.id,
        name: team.name,
        logoUrl: team.logoUrl,
        primaryColor: team.primaryColor,
        secondaryColor: team.secondaryColor,
        level: team.level,
        fairPlayScore: team.fairPlayScore,
        fairPlayRatingCount: team.fairPlayRatingCount ?? 0,
        playerCount: team.players?.length || 0,
        playedMatchCount: matchCount,
        captain: team.captain
          ? {
              id: team.captain.id,
              name: team.captain.full_name || team.captain.username,
              phone: team.captain.phone,
            }
          : null,
      };
    };

    return {
      homeTeam: buildTeamData(homeTeam, homeMatchCount),
      awayTeam: buildTeamData(awayTeam, awayMatchCount),
      match: {
        id: match.id,
        date: match.date,
        time: match.time,
        status: match.status,
        playerCount: match.playerCount,
        description: match.description,
        matchType: match.matchType,
      },
      reservation: reservation
        ? {
            id: reservation.id,
            status: reservation.status,
            slotTime: reservation.slotTime,
          }
        : null,
      pitch: match.pitch
        ? {
            id: match.pitch.id,
            name: match.pitch.name,
            type: match.pitch.type,
            pricePerHour: match.pitch.pricePerHour,
            business: match.pitch.business
              ? {
                  id: match.pitch.business.id,
                  name: match.pitch.business.name,
                  ownerPhone: match.pitch.business.owner?.phone ?? null,
                  address: match.pitch.business.address,
                  isDeleted: !!match.pitch.business.deletedAt,
                }
              : null,
          }
        : null,
    };
  }

  /**
   * Create a rematch/new match proposal from within a finished chat.
   * Only captains and vice-captains can create proposals.
   */
  async createRematchProposal(
    channelId: string,
    userId: string,
    data: { pitchId: string; date: string; time: string; playerCount: number },
  ): Promise<any> {
    const logger = new Logger('ChatService');
    logger.log(
      `Creating rematch proposal for channel ${channelId} by user ${userId}`,
    );

    // 1. Verify channel exists and is a finished match
    const channel = await this.chatChannelRepository.findOne({
      where: { id: channelId },
    });
    if (!channel) throw new NotFoundException('Kanal bulunamadı.');

    const statusType = await this.getChannelMatchStatusType(channelId);
    if (statusType !== 'played' && statusType !== 'unplayed') {
      throw new ForbiddenException(
        'Sadece bitmiş maç sohbetlerinden yeni maç teklifi gönderilebilir.',
      );
    }

    // 2. Get match details to find both teams
    const matchDetails = await this.getChannelMatchDetails(channelId);
    if (!matchDetails?.homeTeam || !matchDetails?.awayTeam) {
      throw new BadRequestException(
        'Maç detayları bulunamadı. Her iki takım bilgisi gerekli.',
      );
    }

    // 3. Find user and their team to determine which team is proposing
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['team'],
    });
    if (!user || !user.team)
      throw new ForbiddenException('Kullanıcı bir takıma ait değil.');

    const userTeamId = user.team.id;
    const userTeam = await this.teamRepository.findOne({
      where: { id: userTeamId },
      relations: ['captain'],
    });
    if (!userTeam) throw new NotFoundException('Takım bulunamadı.');

    // 4. Verify user is captain or vice-captain
    const isCaptain = userTeam.captainId === userId;
    const isViceCaptain = userTeam.viceCaptainIds?.includes(userId);
    if (!isCaptain && !isViceCaptain) {
      throw new ForbiddenException(
        'Sadece kaptan veya yardımcı kaptan yeni maç teklifi gönderebilir.',
      );
    }

    // 5. Determine opponent team
    const opponentTeamId =
      userTeamId === matchDetails.homeTeam.id
        ? matchDetails.awayTeam.id
        : matchDetails.homeTeam.id;

    const opponentTeam = await this.teamRepository.findOne({
      where: { id: opponentTeamId },
      relations: ['captain'],
    });
    if (!opponentTeam) throw new NotFoundException('Rakip takım bulunamadı.');

    // 6. Validate pitch exists
    const pitch = await this.pitchRepository.findOne({
      where: { id: data.pitchId },
      relations: ['business', 'timeSlots'],
    });
    if (!pitch) throw new BadRequestException('Saha bulunamadı.');

    // 7. Validate date/time
    const proposalDate = istanbulDateTimeToUtc(data.date, data.time);

    if (proposalDate < new Date()) {
      throw new BadRequestException(
        'Geçmiş bir tarih/saat için teklif gönderilemez.',
      );
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
    const savedAnnouncement =
      await this.matchAnnouncementRepository.save(announcement);
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

    // 10. Format date info for messages — proposalDate doğru mutlak an
    // tutuyor, görüntülemede açıkça İstanbul saatine çevrilmeli.
    const dayName = proposalDate.toLocaleDateString('tr-TR', {
      weekday: 'long',
      timeZone: 'Europe/Istanbul',
    });
    const formattedDate = proposalDate.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Istanbul',
    });
    const businessName = pitch.business?.name || 'İşletme';
    const pitchName = pitch.name || 'Saha';

    // Calculate end time
    let endTimeStr = '';
    if (pitch.timeSlots && pitch.timeSlots.length > 0) {
      const matchingSlot = pitch.timeSlots.find(
        (slot) => slot.startTime === data.time,
      );
      if (matchingSlot) endTimeStr = matchingSlot.endTime;
    }
    if (!endTimeStr) {
      const endTime = new Date(proposalDate.getTime() + 60 * 60 * 1000);
      endTimeStr = endTime.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Istanbul',
      });
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
      },
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
        title: 'Yeni Maç Teklifi!',
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
        },
      });
    }

    logger.log(
      `Rematch proposal sent. Notifications sent to ${recipientIds.length} recipients.`,
    );
    return {
      success: true,
      challengeId: savedChallenge.id,
      matchAnnouncementId: savedAnnouncement.id,
    };
  }

  /**
   * Accept a rematch proposal. Creates new chat, reservation, soft-deletes old chat.
   */
  async acceptRematchProposal(
    channelId: string,
    userId: string,
    data: { matchAnnouncementId: string },
  ): Promise<any> {
    const logger = new Logger('ChatService');
    logger.log(
      `Accepting rematch proposal in channel ${channelId} by user ${userId}`,
    );

    // 1. Find the challenge linked to this match announcement
    const challenge = await this.challengeRepository.findOne({
      where: { toMatchId: data.matchAnnouncementId, status: 'PENDING' },
    });
    if (!challenge)
      throw new NotFoundException('Teklif bulunamadı veya zaten işlenmiş.');

    // 2. Verify user is captain/vice-captain of the OPPONENT team (the one receiving the proposal)
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['team'],
    });
    if (!user || !user.team)
      throw new ForbiddenException('Kullanıcı bir takıma ait değil.');

    const userTeam = await this.teamRepository.findOne({
      where: { id: user.team.id },
      relations: ['captain'],
    });
    if (!userTeam) throw new NotFoundException('Takım bulunamadı.');

    const isCaptain = userTeam.captainId === userId;
    const isViceCaptain = userTeam.viceCaptainIds?.includes(userId);
    if (!isCaptain && !isViceCaptain) {
      throw new ForbiddenException(
        'Sadece kaptan veya yardımcı kaptan teklifi onaylayabilir.',
      );
    }

    // 3. The proposer team should be the challenge.fromTeamId — user should NOT be from that team
    if (user.team.id === challenge.fromTeamId) {
      throw new ForbiddenException('Kendi teklifinizi onaylayamazsınız.');
    }

    // 4. Load match announcement
    const match = await this.matchAnnouncementRepository.findOne({
      where: { id: data.matchAnnouncementId },
      relations: [
        'team',
        'team.captain',
        'pitch',
        'pitch.business',
        'pitch.timeSlots',
      ],
    });
    if (!match) throw new NotFoundException('Maç ilanı bulunamadı.');

    // 5. Update match status to CONFIRMED
    await this.matchAnnouncementRepository.update(match.id, {
      status: 'CONFIRMED',
    });

    // 6. Update challenge status to ACCEPTED
    await this.challengeRepository.update(challenge.id, { status: 'ACCEPTED' });

    // 7. Load both teams with captains
    const proposerTeam = await this.teamRepository.findOne({
      where: { id: challenge.fromTeamId },
      relations: ['captain'],
    });
    if (!proposerTeam)
      throw new NotFoundException('Teklif eden takım bulunamadı.');

    // 8. Create new chat channel
    const participants = [proposerTeam.captain, userTeam.captain].filter(
      Boolean,
    );
    const newChannel = await this.createChannel(
      'MATCH_GROUP',
      `${proposerTeam.name} vs ${userTeam.name}`,
      participants,
      match.id,
    );
    logger.log(`New chat channel created: ${newChannel.id}`);

    // 9. Format date info for system message — matchDateTime doğru mutlak
    // an tutuyor, görüntülemede açıkça İstanbul saatine çevrilmeli.
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
    const businessName = match.pitch?.business?.name || 'İşletme';
    const pitchName = match.pitch?.name || 'Saha';

    let endTimeStr = '';
    if (match.pitch?.timeSlots && match.pitch.timeSlots.length > 0) {
      const matchingSlot = match.pitch.timeSlots.find(
        (slot) => slot.startTime === match.time,
      );
      if (matchingSlot) endTimeStr = matchingSlot.endTime;
    }
    if (!endTimeStr) {
      const endTime = new Date(matchDateTime.getTime() + 60 * 60 * 1000);
      endTimeStr = endTime.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Istanbul',
      });
    }

    // 10. Send system message to NEW chat
    await this.sendMessage(
      newChannel.id,
      userTeam.captain?.id || userId,
      `Sohbet Oluşturuldu\n\n` +
        `{{STADIUM}} ${businessName}\n` +
        `{{PIN}} ${pitchName}\n` +
        `{{CALENDAR}} ${formattedDate} ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}\n` +
        `{{CLOCK}} ${match.time} - ${endTimeStr}\n\n` +
        `Maçı kesinleştirmek için Sahayı arayın ve saatinizi rezerve edin.\nAcele et! Yerinizi kapabilirler.`,
      true,
      { type: 'MATCH_CONFIRMED', matchAnnouncementId: match.id },
    );

    // 11. Create auto PENDING reservation
    try {
      await this.reservationsService.create({
        pitchId: match.pitchId,
        teamId: match.teamId,
        opponentTeamId: user.team.id,
        slotTime: matchDateTime,
        type: 'MATCH',
        matchAnnouncementId: match.id,
      });
      logger.log(`Auto-reservation created for match ${match.id}`);
    } catch (err) {
      logger.error('Failed to create auto-reservation:', err);
    }

    // 12. Soft-delete old chat channel for ALL participants
    const oldParticipants = await this.chatParticipantRepository.find({
      where: { channelId, deletedAt: IsNull() },
    });
    for (const participant of oldParticipants) {
      await this.chatParticipantRepository.update(
        { id: participant.id },
        { deletedAt: new Date() },
      );
    }
    logger.log(
      `Old channel ${channelId} soft-deleted for ${oldParticipants.length} participants.`,
    );

    // 13. Send notification to proposer team
    if (proposerTeam.captain) {
      await this.notificationsService.create({
        userId: proposerTeam.captain.id,
        type: 'CHALLENGE',
        title: 'Rövanş Teklifi Kabul Edildi!',
        message: `${userTeam.name} rövanş teklifinizi kabul etti. Sohbet kanalı oluşturuldu.`,
        relatedId: newChannel.id,
        metadata: {
          channelId: newChannel.id,
          isChatRedirect: true,
          matchDate: match.date,
          matchTime: match.time,
        },
      });
    }

    // 14. Delete the original rematch proposal notifications
    try {
      await this.chatChannelRepository.manager.query(
        `DELETE FROM notifications WHERE type = 'REMATCH_PROPOSAL' AND "relatedId" = $1`,
        [challenge.id],
      );
      logger.log(
        `Cleaned up rematch proposal notifications for challenge ${challenge.id}`,
      );
    } catch (err) {
      logger.error('Failed to clean up notifications:', err);
    }

    return { success: true, newChannelId: newChannel.id };
  }

  /**
   * Create a Joker Negotiation channel when a joker accepts an invite
   */
  async createJokerNegotiation(
    userId: string,
    data: { matchId: string; inviterId: string; notificationId: string },
  ): Promise<any> {
    const logger = new Logger('ChatService');
    logger.log(
      `Creating Joker negotiation channel for user ${userId} and match ${data.matchId}`,
    );

    // 1. Validate users
    const joker = await this.userRepository.findOne({ where: { id: userId } });
    const inviter = await this.userRepository.findOne({
      where: { id: data.inviterId },
    });

    if (!joker || !inviter) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    // 2. Fetch Match Announcement
    const match = await this.matchAnnouncementRepository.findOne({
      where: { id: data.matchId },
      relations: ['team', 'pitch', 'pitch.business'],
    });

    if (!match) {
      throw new NotFoundException('Maç ilanı bulunamadı.');
    }

    // 3. Create a JOKER_NEGOTIATION channel
    const newChannel = await this.createChannel(
      'JOKER_NEGOTIATION',
      `Joker DM: ${joker.full_name || joker.username}`,
      [joker, inviter],
      match.id,
    );

    // 4. Send Initial System Message
    const dayName = new Date(match.date).toLocaleDateString('tr-TR', {
      weekday: 'long',
    });
    const formattedDate = new Date(match.date).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const businessName = match.pitch?.business?.name || 'İşletme';
    const pitchName = match.pitch?.name || 'Saha';

    await this.sendMessage(
      newChannel.id,
      inviter.id,
      `[ICON:joker_joined] Joker Daveti Kabul Edildi!\n\n` +
        `${joker.full_name || joker.username}, maça katılmayı kabul etti. Oyuncuyu genel sohbete davet edebilirsiniz veya anlaşmayı iptal edebilirsiniz.\n\n` +
        `{{STADIUM}} ${businessName}\n` +
        `{{PIN}} ${pitchName}\n` +
        `{{CALENDAR}} ${formattedDate} ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}\n` +
        `{{CLOCK}} ${match.time}`,
      true, // isSystemMessage
      {
        type: 'JOKER_NEGOTIATION_STARTED',
        matchId: match.id,
        jokerId: joker.id,
      },
    );

    // 5. Delete the notification
    try {
      await this.notificationsService.delete(data.notificationId);
    } catch (e) {
      logger.error(`Failed to delete Joker invite notification:`, e);
    }

    return newChannel;
  }

  /**
   * Invite Joker to the main MATCH_GROUP channel
   */
  async inviteJokerToMatchGroup(
    negotiationChannelId: string,
    inviterId: string,
  ): Promise<any> {
    // 1. Find the negotiation channel
    const negotiationChannel = await this.chatChannelRepository.findOne({
      where: { id: negotiationChannelId },
      relations: ['participants', 'participants.user'],
    });

    if (!negotiationChannel)
      throw new NotFoundException('Sohbet kanalı bulunamadı.');
    if (negotiationChannel.type !== 'JOKER_NEGOTIATION') {
      throw new BadRequestException('Bu kanal bir Joker anlaşma kanalı değil.');
    }

    // 2. Identify inviter and joker
    const inviterParticipant = negotiationChannel.participants.find(
      (p) => p.userId === inviterId,
    );
    if (!inviterParticipant)
      throw new ForbiddenException('Bu işlem için yetkiniz yok.');

    const jokerParticipant = negotiationChannel.participants.find(
      (p) => p.userId !== inviterId,
    );
    if (!jokerParticipant)
      throw new BadRequestException('Joker oyuncu bulunamadı.');
    const joker = jokerParticipant.user;

    // 3. Find the main MATCH_GROUP channel
    const matchChannel = await this.chatChannelRepository.findOne({
      where: {
        relatedMatchId: negotiationChannel.relatedMatchId,
        type: 'MATCH_GROUP',
      },
    });

    if (!matchChannel)
      throw new NotFoundException('Bağlı maç veya etkinlik grubu bulunamadı.');

    // F2: Anlaşma kanalında olmak yetmez — çağıran, maçtaki iki takımdan birinin
    // kaptanı/yardımcı kaptanı olmalı (yoksa jokerin kendisi kendini ana gruba
    // ekleyebilirdi). removeJokerFromChannel ile aynı yetki deseni.
    const matchDetails = await this.getChannelMatchDetails(matchChannel.id);
    const inviterUser = await this.userRepository.findOne({
      where: { id: inviterId },
      relations: ['team'],
    });
    const inviterTeamId = inviterUser?.team?.id;
    const validTeamIds = [
      matchDetails?.homeTeam?.id,
      matchDetails?.awayTeam?.id,
    ].filter(Boolean);
    if (!inviterTeamId || !validTeamIds.includes(inviterTeamId)) {
      throw new ForbiddenException('Bu maçta yetkili değilsiniz.');
    }
    const inviterTeam = await this.teamRepository.findOne({
      where: { id: inviterTeamId },
    });
    if (
      inviterTeam?.captainId !== inviterId &&
      !inviterTeam?.viceCaptainIds?.includes(inviterId)
    ) {
      throw new ForbiddenException(
        'Joker eklemek için kaptan veya yardımcı kaptan olmalısınız.',
      );
    }

    // F5: çift-rezervasyon ve joker sayısı tavanı kontrolleri (ekleme öncesi)
    const currentMatch = await this.matchAnnouncementRepository.findOne({
      where: { id: negotiationChannel.relatedMatchId },
    });
    if (!currentMatch) throw new NotFoundException('Maç ilanı bulunamadı.');

    // (a) Zaman çakışması: joker aynı tarih+saatte başka bir maçta mı?
    const jokerActiveParticipations = await this.chatParticipantRepository.find(
      {
        where: { userId: joker.id, deletedAt: IsNull() },
        relations: ['channel'],
      },
    );
    const otherMatchIds = jokerActiveParticipations
      .filter(
        (p) =>
          p.channel?.type === 'MATCH_GROUP' &&
          !!p.channel?.relatedMatchId &&
          p.channel.id !== matchChannel.id,
      )
      .map((p) => p.channel.relatedMatchId);
    if (otherMatchIds.length > 0) {
      const otherMatches = await this.matchAnnouncementRepository.find({
        where: {
          id: In(otherMatchIds),
          status: In(['PENDING', 'CONFIRMED']),
        },
      });
      const hasClash = otherMatches.some(
        (m) => m.date === currentMatch.date && m.time === currentMatch.time,
      );
      if (hasClash) {
        throw new BadRequestException(
          'Bu oyuncu aynı tarih ve saatte başka bir maçta yer alıyor.',
        );
      }
    }

    // (b) Joker tavanı: bu takımın mevcut joker sayısı playerCount'u aşamaz
    // (roster büyüklüğüne değil joker sayısına bakar → meşru durumları engellemez,
    // sadece absürt suistimali keser).
    const existingTeamJokers = await this.getJokersInChannel(
      matchChannel.id,
      inviterId,
    );
    if (existingTeamJokers.length >= currentMatch.playerCount) {
      throw new BadRequestException(
        'Bu maç için joker oyuncu sınırına ulaşıldı.',
      );
    }

    // 4. Check if joker is already in the main channel
    const existingMainParticipant =
      await this.chatParticipantRepository.findOne({
        where: { channelId: matchChannel.id, userId: joker.id },
      });

    if (existingMainParticipant) {
      if (existingMainParticipant.deletedAt) {
        // Restore participation
        await this.chatParticipantRepository.update(
          { id: existingMainParticipant.id },
          { deletedAt: null },
        );
      } else {
        throw new BadRequestException(
          'Joker oyuncu zaten genel sohbette bulunuyor.',
        );
      }
    } else {
      // Add joker to main channel
      const newParticipant = this.chatParticipantRepository.create({
        channelId: matchChannel.id,
        userId: joker.id,
      });
      await this.chatParticipantRepository.save(newParticipant);
    }

    // 5. Send system messages
    const jokerName = joker.full_name || joker.username;
    // In the main match group
    await this.sendMessage(
      matchChannel.id,
      inviterId,
      `[ICON:joker_added] Takımımıza ${jokerName} isimli joker oyuncu dahil olmuştur. Hoş geldin!`,
      true, // system message
      {
        type: 'JOKER_JOINED',
        jokerId: joker.id,
        // F3: davet eden takımı kalıcı olarak kaydet (sorgu anında canlı
        // sender.team'den türetmek yerine) — kaptan takım değiştirse bile
        // joker yetim kalmasın.
        invitingTeamId: inviterParticipant.user?.teamId ?? null,
      },
    );

    // In the negotiation channel
    await this.sendMessage(
      negotiationChannel.id,
      inviterId,
      `[ICON:joker_success] Oyuncu genel maça ve sohbete başarıyla eklendi!`,
      true,
      { type: 'JOKER_ADDED_TO_MATCH' },
    );

    // Update the metadata of the starting message or something?
    // Let's just return success
    return { success: true, matchChannelId: matchChannel.id };
  }

  /**
   * Get all Jokers in a match group channel
   */
  async getJokersInChannel(
    channelId: string,
    requesterId: string,
  ): Promise<any[]> {
    const channel = await this.chatChannelRepository.findOne({
      where: { id: channelId },
      relations: ['participants', 'participants.user'],
    });

    if (!channel || channel.type !== 'MATCH_GROUP') {
      throw new BadRequestException(
        'Bu işlem sadece maç gruplarında yapılabilir.',
      );
    }

    const requester = await this.userRepository.findOne({
      where: { id: requesterId },
      relations: ['team'],
    });
    const requesterTeamId = requester?.team?.id;

    if (!requesterTeamId) return [];

    const matchDetails = await this.getChannelMatchDetails(channelId);
    if (!matchDetails || matchDetails.error) return [];

    const validTeamIds = [
      matchDetails.homeTeam?.id,
      matchDetails.awayTeam?.id,
    ].filter(Boolean);

    const allJokers = channel.participants
      .filter((p) => !p.deletedAt && !validTeamIds.includes(p.user.teamId))
      .map((p) => ({
        id: p.user.id,
        name: p.user.full_name || p.user.username,
        position: p.user.position,
        rating: p.user.rating,
        avatarUrl: (p.user as any).avatarUrl,
      }));

    // Find all JOKER_JOINED messages in this channel
    const joinMessages = await this.chatMessageRepository.find({
      where: { channelId, isSystemMessage: true },
      relations: ['sender', 'sender.team'],
    });

    const allowedJokerIds = new Set<string>();
    for (const msg of joinMessages) {
      if (msg.metadata?.type === 'JOKER_JOINED' && msg.metadata?.jokerId) {
        // F3: önce kalıcı invitingTeamId; eski mesajlarda yoksa canlı sender.team fallback.
        const invitingTeamId =
          (msg.metadata?.invitingTeamId as string) ?? msg.sender?.team?.id;
        if (invitingTeamId === requesterTeamId) {
          allowedJokerIds.add(msg.metadata.jokerId as string);
        }
      }
    }

    return allJokers.filter((j) => allowedJokerIds.has(j.id));
  }

  /**
   * Remove or Leave Joker from a match group channel
   */
  async removeJokerFromChannel(
    channelId: string,
    jokerId: string,
    requesterId: string,
  ): Promise<any> {
    const logger = new Logger('ChatService');

    const channel = await this.chatChannelRepository.findOne({
      where: { id: channelId },
      relations: ['participants', 'participants.user'],
    });

    if (!channel || channel.type !== 'MATCH_GROUP') {
      throw new BadRequestException('Geçersiz kanal.');
    }

    // Validate requester logic
    // 1. Is Requester the Joker? (Self-leave)
    let isKicking = true;

    if (jokerId === requesterId) {
      isKicking = false;
    } else {
      // Requester must be a captain or vice-captain of a team in the match
      const matchDetails = await this.getChannelMatchDetails(channelId);
      const user = await this.userRepository.findOne({
        where: { id: requesterId },
        relations: ['team'],
      });

      if (!user?.team) throw new ForbiddenException('Takım yetkisi yok.');

      const teamId = user.team.id;
      const validTeamIds = [
        matchDetails.homeTeam?.id,
        matchDetails.awayTeam?.id,
      ].filter(Boolean);

      if (!validTeamIds.includes(teamId)) {
        throw new ForbiddenException('Bu maçta yetkili değilsiniz.');
      }

      const team = await this.teamRepository.findOne({ where: { id: teamId } });
      if (
        team?.captainId !== requesterId &&
        !team?.viceCaptainIds?.includes(requesterId)
      ) {
        throw new ForbiddenException(
          'Joker çıkarmak için kaptan veya yardımcı kaptan olmalısınız.',
        );
      }

      // Verify this team actually invited this joker
      const joinMessages = await this.chatMessageRepository.find({
        where: { channelId, isSystemMessage: true },
        relations: ['sender', 'sender.team'],
      });
      const wasInvitedByMyTeam = joinMessages.some(
        (msg) =>
          msg.metadata?.type === 'JOKER_JOINED' &&
          msg.metadata?.jokerId === jokerId &&
          // F3: kalıcı invitingTeamId; eski mesajlarda canlı sender.team fallback.
          ((msg.metadata?.invitingTeamId as string) ?? msg.sender?.team?.id) ===
            teamId,
      );

      if (!wasInvitedByMyTeam) {
        throw new ForbiddenException(
          'Sadece kendi takımınızın davet ettiği jokerleri çıkarabilirsiniz.',
        );
      }
    }

    // Find the joker participant
    const jokerParticipant = channel.participants.find(
      (p) => p.userId === jokerId && !p.deletedAt,
    );
    if (!jokerParticipant)
      throw new NotFoundException('Joker bu sohbette bulunamadı.');

    // Soft delete the participant
    await this.chatParticipantRepository.update(
      { id: jokerParticipant.id },
      { deletedAt: new Date() },
    );

    // Send system message
    const jokerName =
      jokerParticipant.user.full_name || jokerParticipant.user.username;
    const msg = isKicking
      ? `[ICON:joker_kicked] Takım kaptanı tarafından ${jokerName} adlı oyuncu maç kadrosundan çıkarıldı.`
      : `[ICON:joker_left] ${jokerName} isimli joker oyuncu maçtan kendi isteğiyle ayrıldı.`;

    await this.sendMessage(
      channelId,
      requesterId,
      msg,
      true, // system message
      { type: 'JOKER_LEFT', jokerId },
    );

    // EXTRA: Find and delete the related JOKER_NEGOTIATION channel
    // since the Joker left or was kicked, we no longer need the inbox DM for this match.
    try {
      const negotiationChannels = await this.chatChannelRepository.find({
        where: {
          type: 'JOKER_NEGOTIATION',
          relatedMatchId: channel.relatedMatchId,
        },
        relations: ['participants'],
      });

      // Find the specific negotiation channel that includes this joker
      const myNegotiationChannel = negotiationChannels.find((nc) =>
        nc.participants.some((p) => p.userId === jokerId && !p.deletedAt),
      );

      if (myNegotiationChannel) {
        // Soft delete the channel for all participants
        await this.chatParticipantRepository.update(
          { channelId: myNegotiationChannel.id },
          { deletedAt: new Date() },
        );
        logger.log(
          `Related Joker Negotiation channel ${myNegotiationChannel.id} deleted as Joker left the match.`,
        );
      }
    } catch (e) {
      logger.error('Failed to delete related Joker Negotiation channel:', e);
    }

    return { success: true };
  }

  async addUserToTeamActiveMatchChannels(
    userId: string,
    teamId: string,
  ): Promise<void> {
    const nowTurkey = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const todayTurkey = nowTurkey.toISOString().split('T')[0];
    const timeTurkey = nowTurkey.toISOString().split('T')[1].slice(0, 5);
    const activeMatches = await this.matchAnnouncementRepository.find({
      where: { teamId, status: In(['PENDING', 'CONFIRMED']) },
    });
    const upcomingMatches = activeMatches.filter((m) => {
      if (m.date > todayTurkey) return true;
      if (m.date === todayTurkey) return m.time > timeTurkey;
      return false;
    });
    if (upcomingMatches.length === 0) return;

    for (const match of upcomingMatches) {
      const channel = await this.chatChannelRepository.findOne({
        where: { relatedMatchId: match.id },
      });
      if (!channel) continue;

      const existing = await this.chatParticipantRepository.findOne({
        where: { channelId: channel.id, userId },
      });
      if (existing) continue;

      const participant = this.chatParticipantRepository.create({
        channelId: channel.id,
        userId,
      });
      await this.chatParticipantRepository.save(participant);

      this.gateway?.server
        ?.to(userId)
        .emit('channelCreated', { channelId: channel.id });
    }
  }

  async removeUserFromTeamActiveMatchChannels(
    userId: string,
    teamId: string,
  ): Promise<void> {
    const nowTurkey = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const todayTurkey = nowTurkey.toISOString().split('T')[0];
    const timeTurkey = nowTurkey.toISOString().split('T')[1].slice(0, 5);
    const activeMatches = await this.matchAnnouncementRepository.find({
      where: { teamId, status: In(['PENDING', 'CONFIRMED']) },
    });
    const upcomingMatches = activeMatches.filter((m) => {
      if (m.date > todayTurkey) return true;
      if (m.date === todayTurkey) return m.time > timeTurkey;
      return false;
    });
    if (upcomingMatches.length === 0) return;

    for (const match of upcomingMatches) {
      const channel = await this.chatChannelRepository.findOne({
        where: { relatedMatchId: match.id },
      });
      if (!channel) continue;

      await this.chatParticipantRepository.delete({
        channelId: channel.id,
        userId,
      });

      this.gateway?.server
        ?.to(userId)
        .emit('channelRemoved', { channelId: channel.id });
    }
  }
}
