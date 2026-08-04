import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { PinnedMessage } from './pinned-message.entity';
import { ChatParticipant } from '../chat/chat-participant.entity';
import { ChatChannel } from '../chat/chat-channel.entity';
import { ChatMessage } from '../chat/chat-message.entity';
import type { ChatMessageMetadata } from '../chat/chat-message.entity';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { RecurringClosure } from '../reservations/entities/recurring-closure.entity';
import { User } from '../users/user.entity';
import { ChatService } from '../chat/chat.service';
import { AppGateway } from '../gateway/app.gateway';

// İstemciye giden sabit mesaj görünümü — REST VE pinUpdated socket payload'ı
// aynı serileştirmeden geçer; message.sender ham User olarak asla taşınmaz.
export interface PinView {
  id: string;
  channelId: string;
  teamId: string;
  messageId: string;
  pinnedById: string | null;
  pinnedAt: Date;
  message: {
    id: string;
    senderId: string | null;
    senderName: string | null;
    content: string;
    isSystemMessage: boolean;
    // Anket sabiti ayrımı için (client bar'da POLL ikonlu özel satır çizer)
    metadata: ChatMessageMetadata | null;
  };
}

// Sabitlemenin izinli olduğu kanal tipleri (DM/TEAM_INTERNAL hariç)
const PINNABLE_TYPES = ['MATCH_GROUP', 'JOKER_NEGOTIATION', 'SUBSCRIPTION'];

@Injectable()
export class ChatPinsService {
  constructor(
    @InjectRepository(PinnedMessage)
    private readonly pinnedMessageRepository: Repository<PinnedMessage>,
    @InjectRepository(ChatParticipant)
    private readonly chatParticipantRepository: Repository<ChatParticipant>,
    @InjectRepository(ChatChannel)
    private readonly chatChannelRepository: Repository<ChatChannel>,
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(MatchAnnouncement)
    private readonly matchAnnouncementRepository: Repository<MatchAnnouncement>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(RecurringClosure)
    private readonly recurringClosureRepository: Repository<RecurringClosure>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly chatService: ChatService,
    @Optional() private gateway: AppGateway,
  ) {}

  // ── Guard'lar ──────────────────────────────────────────────────────────────

  private async assertParticipant(
    channelId: string,
    userId: string,
  ): Promise<void> {
    const me = await this.chatParticipantRepository.findOne({
      where: { channelId, userId, deletedAt: IsNull() },
    });
    if (!me) {
      throw new ForbiddenException('Bu sohbetin katılımcısı değilsiniz.');
    }
  }

  // Kanalın bağlam takımları. Sabitleme yetkisi "KENDİ takımının kaptanı" değil
  // "kanalın BAĞLAM takımlarından birinin kaptanı" ile kurulur — aksi halde
  // ilgisiz bir takımın kaptanı olan joker, Joker DM'de yanlışlıkla yetki alırdı.
  private async resolveContextTeamIds(channel: ChatChannel): Promise<string[]> {
    if (
      (channel.type === 'MATCH_GROUP' ||
        channel.type === 'JOKER_NEGOTIATION') &&
      channel.relatedMatchId
    ) {
      const reservation = await this.reservationRepository.findOne({
        where: { matchAnnouncementId: channel.relatedMatchId },
      });
      if (reservation) {
        return [reservation.teamId, reservation.opponentTeamId].filter(
          (id): id is string => !!id,
        );
      }
      const announcement = await this.matchAnnouncementRepository.findOne({
        where: { id: channel.relatedMatchId },
      });
      return announcement?.teamId ? [announcement.teamId] : [];
    }
    if (channel.type === 'SUBSCRIPTION' && channel.relatedClosureId) {
      const closure = await this.recurringClosureRepository.findOne({
        where: { id: channel.relatedClosureId },
      });
      return closure
        ? [closure.teamId, closure.opponentTeamId].filter(
            (id): id is string => !!id,
          )
        : [];
    }
    return [];
  }

  // Yetki zinciri; başarılıysa çağıranın takım id'sini (slot anahtarı) ve
  // görünen adını döndürür.
  private async assertPinAuthority(
    channelId: string,
    userId: string,
  ): Promise<{ teamId: string; userName: string }> {
    await this.assertParticipant(channelId, userId);

    const channel = await this.chatChannelRepository.findOne({
      where: { id: channelId },
    });
    if (!channel) throw new NotFoundException('Sohbet bulunamadı.');
    if (!PINNABLE_TYPES.includes(channel.type)) {
      throw new BadRequestException(
        'Bu sohbet tipinde mesaj sabitleme desteklenmiyor.',
      );
    }

    const contextTeamIds = await this.resolveContextTeamIds(channel);
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['team'],
    });
    const team = user?.team;
    const isCaptain = team?.captainId === userId;
    const isViceCaptain = team?.viceCaptainIds?.includes(userId);
    if (
      !team ||
      !contextTeamIds.includes(team.id) ||
      (!isCaptain && !isViceCaptain)
    ) {
      throw new ForbiddenException(
        'Sadece maçın takım kaptanı veya yardımcısı mesaj sabitleyebilir.',
      );
    }
    return {
      teamId: team.id,
      userName: user?.full_name ?? user?.username ?? 'Kaptan',
    };
  }

  // Biten maçta sabit donar (anket/mesaj kilidiyle aynı koşul).
  // SUBSCRIPTION'da relatedMatchId yok → status null → hiç kilitlenmez (doğru).
  private async assertMatchNotFinished(channelId: string): Promise<void> {
    const statusType =
      await this.chatService.getChannelMatchStatusType(channelId);
    if (statusType === 'played' || statusType === 'unplayed') {
      throw new ForbiddenException(
        'Maç tamamlandığı için sabitleme işlemi yapılamaz.',
      );
    }
  }

  // ── Serileştirme + yayın ───────────────────────────────────────────────────

  private async serializePins(channelId: string): Promise<PinView[]> {
    const pins = await this.pinnedMessageRepository.find({
      where: { channelId },
      relations: ['message', 'message.sender'],
      order: { pinnedAt: 'ASC' },
    });
    return pins.map((pin) => ({
      id: pin.id,
      channelId: pin.channelId,
      teamId: pin.teamId,
      messageId: pin.messageId,
      pinnedById: pin.pinnedById,
      pinnedAt: pin.pinnedAt,
      message: {
        id: pin.message?.id ?? pin.messageId,
        senderId: pin.message?.senderId ?? null,
        senderName:
          pin.message?.sender?.full_name ??
          pin.message?.sender?.username ??
          null,
        content: (pin.message?.content ?? '').slice(0, 200),
        isSystemMessage: pin.message?.isSystemMessage ?? false,
        metadata: pin.message?.metadata ?? null,
      },
    }));
  }

  // Kanal odası yok — aktif katılımcıların kullanıcı odalarına tam liste yayını
  private async emitPinUpdated(
    channelId: string,
    pins: PinView[],
  ): Promise<void> {
    if (!this.gateway?.server) return;
    const participants = await this.chatParticipantRepository.find({
      where: { channelId, deletedAt: IsNull() },
      select: ['userId'],
    });
    const payload = { channelId, pins };
    participants.forEach((p) =>
      this.gateway.server.to(p.userId).emit('pinUpdated', payload),
    );
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async pin(
    channelId: string,
    userId: string,
    messageId: unknown,
  ): Promise<PinView[]> {
    if (typeof messageId !== 'string' || !messageId) {
      throw new BadRequestException('messageId gerekli.');
    }

    const { teamId, userName } = await this.assertPinAuthority(
      channelId,
      userId,
    );
    await this.assertMatchNotFinished(channelId);

    // Mesaj bu kanala ait olmalı (where'deki channelId kanal-dışı id'leri eler — IDOR)
    const message = await this.chatMessageRepository.findOne({
      where: { id: messageId, channelId },
    });
    if (!message)
      throw new BadRequestException('Sabitlenecek mesaj bulunamadı.');
    // Sistem mesajları sabitlenemez — TEK istisna anket duyurusu ({type:'POLL'}):
    // kaptan anketi tepeye sabitleyip katılımı artırabilsin.
    if (message.isSystemMessage && message.metadata?.type !== 'POLL') {
      throw new BadRequestException('Sistem mesajları sabitlenemez.');
    }

    // Takım slotunu değiştir: eskisini sil, yenisini yaz. Eşzamanlı yarışta
    // unique constraint devreye girer — mevcut durum kazanır, hata yutulur.
    await this.pinnedMessageRepository.delete({ channelId, teamId });
    try {
      await this.pinnedMessageRepository.save(
        this.pinnedMessageRepository.create({
          channelId,
          teamId,
          messageId,
          pinnedById: userId,
        }),
      );
    } catch {
      // @Unique(['channelId','teamId']) yarışı — diğer kaptanın yazımı kazandı
    }

    const pins = await this.serializePins(channelId);
    await this.emitPinUpdated(channelId, pins);

    // Sohbet geçmişine iz — push YOK (bar zaten canlı sinyal, çift bildirim olmasın).
    // {{PINNED}} uygulama-içi özel raptiye ikonuna çevrilir (SystemMessageRenderer).
    await this.chatService.sendMessage(
      channelId,
      null,
      `{{PINNED}} ${userName} bir mesajı sabitledi`,
      true,
      undefined,
      true, // skipPush
    );

    return pins;
  }

  async unpin(channelId: string, userId: string): Promise<PinView[]> {
    const { teamId } = await this.assertPinAuthority(channelId, userId);
    await this.assertMatchNotFinished(channelId);

    // İdempotent: slot boşsa da başarı — güncel liste döner
    await this.pinnedMessageRepository.delete({ channelId, teamId });

    const pins = await this.serializePins(channelId);
    await this.emitPinUpdated(channelId, pins);
    return pins;
  }

  async getPins(channelId: string, userId: string): Promise<PinView[]> {
    await this.assertParticipant(channelId, userId);
    return this.serializePins(channelId);
  }
}
