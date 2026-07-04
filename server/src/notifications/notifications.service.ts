import {
  Injectable,
  Optional,
  Inject,
  forwardRef,
  Logger,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { Challenge } from '../challenges/challenge.entity';
import { ChatChannel } from '../chat/chat-channel.entity';
import { ChatParticipant } from '../chat/chat-participant.entity';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { User } from '../users/user.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import {
  istanbulDateTimeToUtc,
  istanbulDisplayParts,
} from '../common/turkey-time.util';
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
    @InjectRepository(ChatParticipant)
    private chatParticipantsRepository: Repository<ChatParticipant>,
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,
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
    if (!team) throw new NotFoundException('Takım bulunamadı.');

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
        if (user?.pushToken && !this.gateway?.isUserActive(saved.userId)) {
          void this.pushToUser(
            user.id,
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
        if (user?.pushToken && !this.gateway?.isUserActive(playerId)) {
          void this.pushToUser(
            user.id,
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
        if (user?.pushToken && !this.gateway?.isUserActive(userId)) {
          void this.pushToUser(
            user.id,
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
    // Uygulama ön plandayken (kullanıcı içerideyken) OS push gönderme — websocket
    // 'notification' olayı yukarıda zaten iletildi (rozet/liste anlık güncellenir).
    if (isUserPush && !this.gateway?.isUserActive(saved.userId)) {
      this.usersRepository
        .findOne({ where: { id: saved.userId } })
        .then((user) => {
          if (user?.pushToken) {
            void this.pushToUser(
              user.id,
              user.pushToken,
              this.cleanPushText(saved.title) || 'Yeni Bildirim',
              this.cleanPushText(saved.message),
              { type: String(saved.metadata?.type || saved.type) },
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
    if (
      businessPushTypes.has(saved.type) &&
      saved.userId &&
      !this.gateway?.isUserActive(saved.userId)
    ) {
      this.businessOwnerRepository
        .findOne({ where: { id: saved.userId } })
        .then((owner) => {
          if (owner?.pushToken) {
            void this.pushToOwner(
              owner.id,
              owner.pushToken,
              this.cleanPushText(saved.title) || 'Yeni Bildirim',
              this.cleanPushText(saved.message),
              { type: saved.type },
            );
          }
        })
        .catch(() => {});
    }
    return saved;
  }

  // Maçın rakip takımını çöz: önce matchAnnouncementId bağlı rezervasyon, yoksa
  // eski-maç fallback'i (teamId + slotTime + type MATCH — getChannelMatchDetails
  // deseni; chat.service.ts'te aynı helper'ın bir kopyası var). kendi_aramizda'da
  // opponentTeamId null döner.
  private async resolveOpponentTeamId(
    match: MatchAnnouncement,
  ): Promise<string | null> {
    let reservation = await this.reservationsRepository.findOne({
      where: { matchAnnouncementId: match.id },
    });
    if (!reservation) {
      try {
        const slotTime = istanbulDateTimeToUtc(match.date, match.time);
        reservation = await this.reservationsRepository.findOne({
          where: { teamId: match.teamId, slotTime, type: 'MATCH' },
        });
      } catch {
        // tarih parse hatası → fallback atlanır
      }
    }
    return reservation?.opponentTeamId ?? null;
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

    if (!match) throw new NotFoundException('Maç bulunamadı.');

    const opponentTeamId = await this.resolveOpponentTeamId(match);
    const matchTeamIds = [match.teamId, opponentTeamId].filter(
      Boolean,
    ) as string[];

    // F1 (2026-07-03 revizyonu): davet, maçtaki İKİ takımdan birinin kaptanı /
    // yardımcı kaptanı tarafından KENDİ takımı adına gönderilir (eskiden yalnız
    // ilan sahibi takım davet edebiliyordu; F2 gruba-ekleme kuralıyla hizalandı).
    const inviter = await this.usersRepository.findOne({
      where: { id: inviterId },
      relations: ['team'],
    });
    const inviterTeam = inviter?.team;
    const isTeamLeader =
      !!inviterTeam &&
      (inviterTeam.captainId === inviterId ||
        (inviterTeam.viceCaptainIds || []).includes(inviterId));
    if (!isTeamLeader || !matchTeamIds.includes(inviterTeam.id)) {
      throw new ForbiddenException(
        'Bu maça joker daveti göndermek için iki takımdan birinin kaptanı veya yardımcı kaptanı olmalısınız.',
      );
    }

    // Davetli kuralları: maçın kadrolarındaki oyuncular ve zaten maç sohbetinde
    // olanlar joker olarak davet edilemez.
    if (jokerId === inviterId) {
      throw new BadRequestException(
        'Kendinizi joker olarak davet edemezsiniz.',
      );
    }
    const joker = await this.usersRepository.findOne({
      where: { id: jokerId },
    });
    if (!joker) {
      throw new NotFoundException('Davet edilecek oyuncu bulunamadı.');
    }
    const jokerName = joker.full_name || joker.username;
    if (joker.teamId && matchTeamIds.includes(joker.teamId)) {
      throw new BadRequestException(
        joker.teamId === inviterTeam.id
          ? `${jokerName} zaten takımınızın oyuncusu — joker olarak davet edilemez.`
          : `${jokerName} bu maçtaki rakip takımın oyuncusu — joker olarak davet edilemez.`,
      );
    }
    const matchGroup = await this.chatChannelsRepository.findOne({
      where: { relatedMatchId: matchId, type: 'MATCH_GROUP' },
    });
    if (matchGroup) {
      const activeParticipant = await this.chatParticipantsRepository.findOne({
        where: {
          channelId: matchGroup.id,
          userId: jokerId,
          deletedAt: IsNull(),
        },
      });
      if (activeParticipant) {
        throw new ConflictException(
          `${jokerName} zaten bu maçın sohbetine dahil.`,
        );
      }
    }

    // Duplicate koruması TAKIM kapsamlı (F7): aynı takım aynı jokere aynı maç
    // için ikinci davet atamaz; RAKİP takımın daveti serbest. inviterId OR-dalı
    // teamId'siz eski kayıtları da yakalar.
    const existingInvites = await this.notificationsRepository.find({
      where: {
        userId: jokerId,
        type: 'JOKER_INVITE',
        relatedId: matchId,
      },
    });
    const teamAlreadyInvited = existingInvites.some(
      (n) =>
        n.metadata?.teamId === inviterTeam.id ||
        n.metadata?.inviterId === inviterId,
    );
    if (teamAlreadyInvited) {
      throw new ConflictException(
        'Takımınız bu joker için bu maça zaten davet göndermiş.',
      );
    }

    const notification = this.notificationsRepository.create({
      userId: jokerId,
      type: 'JOKER_INVITE',
      relatedId: matchId,
      read: false,
      message: `${inviterTeam.name} seni maça joker olarak davet ediyor!`,
      metadata: {
        inviterId,
        teamId: inviterTeam.id,
        teamName: inviterTeam.name,
        matchDate: match.date,
        matchTime: match.time,
        pitchName: match.pitch?.name,
        businessName: match.pitch?.business?.name,
        note: note,
        // Joker karar verirken görsün diye maç/saha detayları (kart zenginleştirme).
        // match zaten pitch.business ilişkileriyle yüklü — ek sorgu yok. Eski
        // bildirimlerde bu alanlar olmadığından client alan yoksa satırı gizler.
        pitchPrice: match.pitch?.pricePerHour ?? null,
        playerCount: match.playerCount ?? null,
        matchType: match.matchType ?? null,
        businessDistrict: match.pitch?.business?.district ?? null,
        businessAddress: match.pitch?.business?.address ?? null,
        businessLat: match.pitch?.business?.latitude ?? null,
        businessLng: match.pitch?.business?.longitude ?? null,
      },
    });

    const saved = await this.notificationsRepository.save(notification);
    this.gateway?.server
      ?.to(jokerId)
      .emit('notification', { type: 'JOKER_INVITE', relatedId: matchId });
    this.usersRepository
      .findOne({ where: { id: jokerId } })
      .then((user) => {
        if (user?.pushToken && !this.gateway?.isUserActive(jokerId)) {
          void this.pushToUser(
            user.id,
            user.pushToken,
            'Joker Daveti',
            this.cleanPushText(saved.message) ||
              'Seni maça joker olarak davet ediyorlar!',
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
    // TAKIM kapsamlı: yardımcı kaptan, kaptanın gönderdiği daveti de "gönderilmiş"
    // görür (metadata.teamId eşleşmesi); inviterId OR-dalı teamId'siz eski
    // kayıtları ve takımsız çağıranı kapsar. JSONB'yi TypeORM ile sorgulamak
    // yerine jokerin davetleri çekilip bellekte filtrelenir.
    const inviter = await this.usersRepository.findOne({
      where: { id: inviterId },
    });
    const invites = await this.notificationsRepository.find({
      where: { userId: jokerId, type: 'JOKER_INVITE' },
    });

    const sentByMyTeam = invites.filter(
      (n) =>
        (inviter?.teamId && n.metadata?.teamId === inviter.teamId) ||
        n.metadata?.inviterId === inviterId,
    );
    return sentByMyTeam.map((n) => n.relatedId).filter(Boolean);
  }

  async cancelJokerInvite(
    inviterId: string,
    jokerId: string,
    matchId: string,
  ): Promise<void> {
    const inviter = await this.usersRepository.findOne({
      where: { id: inviterId },
      relations: ['team'],
    });
    const inviterTeam = inviter?.team;
    const isLeader =
      !!inviterTeam &&
      (inviterTeam.captainId === inviterId ||
        (inviterTeam.viceCaptainIds || []).includes(inviterId));

    const invites = await this.notificationsRepository.find({
      where: { userId: jokerId, type: 'JOKER_INVITE', relatedId: matchId },
    });

    // Kendi gönderdiğin daveti her zaman, takımının davetini yalnız kaptan/
    // yardımcı kaptansan iptal edebilirsin. Diğer takımın daveti dokunulmaz;
    // eşleşme yoksa sessiz no-op (idempotent DELETE).
    const toCancel = invites.find(
      (n) =>
        n.metadata?.inviterId === inviterId ||
        (isLeader && n.metadata?.teamId === inviterTeam.id),
    );
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
    if (!notification) throw new NotFoundException('Bildirim bulunamadı.');
    return notification;
  }

  async delete(id: string): Promise<void> {
    await this.notificationsRepository.delete(id);
  }

  // Sahiplik-kontrollü joker daveti silme: yalnız ilgili kullanıcıya ait bir
  // JOKER_INVITE bildirimi silinir (keyfî bildirim silmeyi engeller). Hatalar
  // yutulur — bayat davet temizliği best-effort'tur.
  async deleteOwnJokerInvite(
    notificationId: string | undefined | null,
    userId: string,
  ): Promise<void> {
    if (!notificationId) return;
    try {
      const notification = await this.notificationsRepository.findOne({
        where: { id: notificationId },
      });
      if (
        notification &&
        notification.userId === userId &&
        notification.type === 'JOKER_INVITE'
      ) {
        await this.notificationsRepository.delete(notification.id);
      }
    } catch (e) {
      this.logger.error('deleteOwnJokerInvite başarısız:', e);
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationsRepository.count({
      where: { userId, read: false },
    });
  }

  // Business Owner Notifications
  async findByOwner(ownerId: string): Promise<Notification[]> {
    const notifications = await this.notificationsRepository.find({
      where: { userId: ownerId }, // Using userId column for ownerId too
      order: { createdAt: 'DESC' },
    });

    // Self-heal: eski RESERVATION_REQUEST bildirimleri ya minimal metadata
    // içeriyor ya da metaV:2 öncesi yanlış saatle (UTC formatı, İstanbul değil)
    // zenginleştirilmiş olabilir. Okuma sırasında metaV !== 2 olanlar ilgili
    // rezervasyondan yeniden doldurulur + kalıcılaştırılır (tek yazım garantisi:
    // metaV=2 işlendikten sonra guard bir daha girmez). Rezervasyon silinmişse
    // metaV=2 işaretlenir (team null kalır) → sonsuz yeniden deneme olmaz,
    // istemci title/message fallback'ini gösterir.
    return Promise.all(
      notifications.map(async (n) => {
        if (
          n.type === 'RESERVATION_REQUEST' &&
          n.metadata &&
          n.metadata.metaV !== 2
        ) {
          try {
            const resId = n.metadata.reservationId || n.relatedId;
            if (!resId) return n;
            const res = await this.reservationsRepository.findOne({
              where: { id: resId },
              relations: ['team', 'matchAnnouncement', 'pitch', 'pitch.timeSlots'],
            });
            if (!res) {
              n.metadata = { ...n.metadata, metaV: 2 };
              await this.notificationsRepository.save(n);
              return n;
            }

            const slotTime = new Date(res.slotTime);
            // İstanbul saatiyle formatla (istanbulDisplayParts) — timeZone'suz
            // toLocale* process TZ=UTC yüzünden 3 saat geri basar.
            const slotParts = istanbulDisplayParts(slotTime);
            const startTime = slotParts.time;
            let endTime = '';
            const slots = res.pitch?.timeSlots;
            if (slots?.length) {
              const m = slots.find((s) => s.startTime === startTime);
              if (m) endTime = m.endTime;
            }
            if (!endTime) {
              endTime = istanbulDisplayParts(
                new Date(slotTime.getTime() + 60 * 60 * 1000),
              ).time;
            }

            n.metadata = {
              ...n.metadata,
              metaV: 2,
              // Eski satırlardaki yanlış (UTC) date/time gösterim alanlarını da düzelt.
              date: slotParts.displayDate,
              time: slotParts.time,
              pitchId: res.pitchId ?? null,
              slotDateIso: slotParts.dateStr,
              slotTimeIso: slotTime.toISOString(),
              dayName: slotParts.dayName,
              startTime,
              endTime,
              matchType: res.matchAnnouncement?.matchType ?? null,
              reservationType: res.type,
              team: res.team
                ? {
                    id: res.team.id,
                    name: res.team.name,
                    logo: res.team.logoUrl ?? null,
                    level: res.team.level ?? null,
                    fairPlay: res.team.fairPlayScore ?? null,
                    ratingCount: res.team.fairPlayRatingCount ?? 0,
                  }
                : null,
            };
            await this.notificationsRepository.save(n);
          } catch (e) {
            this.logger.error(
              `RESERVATION_REQUEST enrich failed for ${n.id}`,
              e,
            );
          }
        }
        return n;
      }),
    );
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

    // Sohbet başlığı gönderen adını içerir (kullanıcı seçimi) → emoji'ye dokunma,
    // sadece whitespace sadeleştir + uzunluk sınırı. Gövde kullanıcı/sistem mesajı:
    // {{...}}/[ICON:...] token'larını temizle ama kullanıcının emoji'sine dokunma;
    // sonra OS banner için 120'ye kırp.
    const title = this.buildChatTitle(senderName, channelType, channelName)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80);
    const stripped = this.stripChatMarkers(content);
    const body =
      stripped.length > 120 ? stripped.substring(0, 117) + '...' : stripped;

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

    // Uygulama ön plandaki alıcılara OS push gönderme — 'newMessage' websocket olayı
    // zaten tüm katılımcılara iletildi (sohbet anlık açılır/rozet güncellenir).
    await Promise.allSettled(
      users
        .filter((u) => u.pushToken && !this.gateway?.isUserActive(u.id))
        .map((u) =>
          this.pushToUser(
            u.id,
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

  // Push bildirimleri için SİSTEM üretimi metni temizler: emoji/piktograf + variation
  // selector + ZWJ çıkar, satır sonu/fazla boşluğu tek boşluğa indir, trim, uzunluk
  // sınırı. \p{Extended_Pictographic} (u-flag) ⚠️/⏳/✅/❌ gibi sembolleri de yakalar.
  // Kullanıcının yazdığı sohbet içeriğine UYGULANMAZ (oradaki emoji meşrudur).
  cleanPushText(text: string | null | undefined, maxLen = 178): string {
    if (!text) return '';
    return text
      .replace(/\p{Extended_Pictographic}/gu, '') // emoji/piktograf
      .replace(/️/g, '') // variation selector (örn. ⚠️'deki görünmez parça)
      .replace(/‍/g, '') // zero-width joiner (bileşik emoji)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLen);
  }

  // Sohbet sistem mesajları {{STADIUM}} / [ICON:name] token'ları içerir (uygulama
  // içinde SVG'ye çevrilir). Push'a düz metin gitmesi için bunları temizler;
  // kullanıcının yazdığı emoji'ye DOKUNMAZ.
  private stripChatMarkers(text: string): string {
    if (!text) return '';
    return text
      .replace(/(\{\{\w+\}\}|\[ICON:\w+\])/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // FCM gönder + kalıcı geçersiz token'ı DB'den temizle (öz-iyileşme + teşhis).
  // where'e token de konur → yarışta yeni kaydolan token yanlışlıkla silinmez.
  private async pushToUser(
    userId: string,
    token: string,
    title: string,
    body: string,
    data: Record<string, string>,
    badge = 1,
  ): Promise<void> {
    const r = await this.firebaseService.sendToDevice(
      token,
      title,
      body,
      data,
      badge,
    );
    if (r.invalidToken) {
      await this.usersRepository.query(
        'UPDATE "user" SET "pushToken" = NULL WHERE id = $1 AND "pushToken" = $2',
        [userId, token],
      );
      this.logger.warn(`Geçersiz push token temizlendi (user=${userId})`);
    }
  }

  private async pushToOwner(
    ownerId: string,
    token: string,
    title: string,
    body: string,
    data: Record<string, string>,
    badge = 1,
  ): Promise<void> {
    const r = await this.firebaseService.sendToDevice(
      token,
      title,
      body,
      data,
      badge,
    );
    if (r.invalidToken) {
      await this.businessOwnerRepository.query(
        'UPDATE "business_owner" SET "pushToken" = NULL WHERE id = $1 AND "pushToken" = $2',
        [ownerId, token],
      );
      this.logger.warn(`Geçersiz push token temizlendi (owner=${ownerId})`);
    }
  }
}
