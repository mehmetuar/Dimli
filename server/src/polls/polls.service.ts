import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { Poll } from './poll.entity';
import { PollOption } from './poll-option.entity';
import { PollVote } from './poll-vote.entity';
import { ChatParticipant } from '../chat/chat-participant.entity';
import { ChatChannel } from '../chat/chat-channel.entity';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { User } from '../users/user.entity';
import { ChatService } from '../chat/chat.service';
import { AppGateway } from '../gateway/app.gateway';

// İstemciye giden anket görünümü — REST yanıtı VE pollUpdated socket payload'ı
// aynı serileştirmeden geçer. Oy verenler yalnız 3 alan taşır (ham User asla).
export interface PollVoterView {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface PollOptionView {
  id: string;
  text: string;
  sortOrder: number;
  voteCount: number;
  voters: PollVoterView[];
}

export interface PollView {
  id: string;
  channelId: string;
  title: string;
  allowMultiple: boolean;
  isClosed: boolean;
  createdById: string | null;
  createdAt: Date;
  closedAt: Date | null;
  totalVoters: number;
  options: PollOptionView[];
}

export interface CreatePollInput {
  title?: unknown;
  options?: unknown;
  allowMultiple?: unknown;
}

const MAX_OPTIONS = 10;
const MIN_OPTIONS = 2;

@Injectable()
export class PollsService {
  constructor(
    @InjectRepository(Poll)
    private readonly pollRepository: Repository<Poll>,
    @InjectRepository(PollOption)
    private readonly pollOptionRepository: Repository<PollOption>,
    @InjectRepository(PollVote)
    private readonly pollVoteRepository: Repository<PollVote>,
    @InjectRepository(ChatParticipant)
    private readonly chatParticipantRepository: Repository<ChatParticipant>,
    @InjectRepository(ChatChannel)
    private readonly chatChannelRepository: Repository<ChatChannel>,
    @InjectRepository(MatchAnnouncement)
    private readonly matchAnnouncementRepository: Repository<MatchAnnouncement>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
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

  // Anket yalnız kendi aramızda maç sohbetinde: MATCH_GROUP + bağlı ilanın
  // matchType'ı kendi_aramizda (yapısal işaret; isim-tabanlı kontrol kullanılmaz).
  private async assertKendiAramizdaMatchChannel(
    channelId: string,
  ): Promise<void> {
    const channel = await this.chatChannelRepository.findOne({
      where: { id: channelId },
    });
    if (!channel) throw new NotFoundException('Sohbet bulunamadı.');
    if (channel.type === 'MATCH_GROUP' && channel.relatedMatchId) {
      const announcement = await this.matchAnnouncementRepository.findOne({
        where: { id: channel.relatedMatchId },
      });
      if (announcement?.matchType === 'kendi_aramizda') return;
      // İlan silinmiş olabilir — rezervasyondan yedek kontrol (rakipsiz = kendi aramızda)
      if (!announcement) {
        const reservation = await this.reservationRepository.findOne({
          where: { matchAnnouncementId: channel.relatedMatchId },
        });
        if (reservation && !reservation.opponentTeamId) return;
      }
    }
    throw new BadRequestException(
      'Anket yalnız kendi aranızdaki maç sohbetlerinde oluşturulabilir.',
    );
  }

  private async assertCaptainOrVice(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['team'],
    });
    const team = user?.team;
    const isCaptain = team?.captainId === userId;
    const isViceCaptain = team?.viceCaptainIds?.includes(userId);
    if (!isCaptain && !isViceCaptain) {
      throw new ForbiddenException(
        'Sadece kaptan veya yardımcı kaptan anket oluşturabilir/sonlandırabilir.',
      );
    }
  }

  // Maç bittiyse anket de donar — input kilidiyle aynı koşul (played/unplayed)
  private async assertMatchNotFinished(channelId: string): Promise<void> {
    const statusType =
      await this.chatService.getChannelMatchStatusType(channelId);
    if (statusType === 'played' || statusType === 'unplayed') {
      throw new ForbiddenException(
        'Maç tamamlandığı için anket işlemi yapılamaz.',
      );
    }
  }

  // ── Serileştirme ───────────────────────────────────────────────────────────

  // Toplu serileştirme: N anket için seçenekler TEK sorgu + oylar TEK sorgu
  // (anket başına 2 sorguluk N+1 yerine) — kanal açılışındaki GET buradan geçer.
  private async serializePolls(polls: Poll[]): Promise<PollView[]> {
    if (polls.length === 0) return [];
    const ids = polls.map((p) => p.id);

    const allOptions = await this.pollOptionRepository.find({
      where: { pollId: In(ids) },
    });
    const allVotes = await this.pollVoteRepository.find({
      where: { pollId: In(ids) },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    const optionsByPoll = new Map<string, PollOption[]>();
    for (const option of allOptions) {
      const list = optionsByPoll.get(option.pollId) ?? [];
      list.push(option);
      optionsByPoll.set(option.pollId, list);
    }

    const votersByOption = new Map<string, PollVoterView[]>();
    const voterIdsByPoll = new Map<string, Set<string>>();
    for (const vote of allVotes) {
      const voterIds = voterIdsByPoll.get(vote.pollId) ?? new Set<string>();
      voterIds.add(vote.userId);
      voterIdsByPoll.set(vote.pollId, voterIds);
      const list = votersByOption.get(vote.optionId) ?? [];
      list.push({
        id: vote.userId,
        name: vote.user?.full_name ?? vote.user?.username ?? null,
        avatarUrl: vote.user?.avatarUrl ?? null,
      });
      votersByOption.set(vote.optionId, list);
    }

    return polls.map((poll) => {
      const options = (optionsByPoll.get(poll.id) ?? [])
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((option) => {
          const voters = votersByOption.get(option.id) ?? [];
          return {
            id: option.id,
            text: option.text,
            sortOrder: option.sortOrder,
            voteCount: voters.length,
            voters,
          };
        });
      return {
        id: poll.id,
        channelId: poll.channelId,
        title: poll.title,
        allowMultiple: poll.allowMultiple,
        isClosed: poll.isClosed,
        createdById: poll.createdById,
        createdAt: poll.createdAt,
        closedAt: poll.closedAt,
        totalVoters: (voterIdsByPoll.get(poll.id) ?? new Set()).size,
        options,
      };
    });
  }

  private async serializePoll(pollId: string): Promise<PollView> {
    const poll = await this.pollRepository.findOne({ where: { id: pollId } });
    if (!poll) throw new NotFoundException('Anket bulunamadı.');
    return (await this.serializePolls([poll]))[0];
  }

  // Kanal odası yok — aktif katılımcıların kullanıcı odalarına tek tek yayın
  // (newMessage/messagesRead ile aynı desen; payload'daki channelId ile client filtreler).
  private async emitPollUpdated(view: PollView): Promise<void> {
    if (!this.gateway?.server) return;
    const participants = await this.chatParticipantRepository.find({
      where: { channelId: view.channelId, deletedAt: IsNull() },
      select: ['userId'],
    });
    const payload = { channelId: view.channelId, poll: view };
    participants.forEach((p) =>
      this.gateway.server.to(p.userId).emit('pollUpdated', payload),
    );
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async createPoll(
    channelId: string,
    userId: string,
    input: CreatePollInput,
  ): Promise<PollView> {
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    const rawOptions = Array.isArray(input.options) ? input.options : [];
    const optionTexts = rawOptions
      .map((o) => (typeof o === 'string' ? o.trim() : ''))
      .filter((o) => o.length > 0);
    const allowMultiple = input.allowMultiple === true;

    if (!title || title.length > 200) {
      throw new BadRequestException('Anket başlığı 1-200 karakter olmalı.');
    }
    if (optionTexts.length < MIN_OPTIONS || optionTexts.length > MAX_OPTIONS) {
      throw new BadRequestException(
        `Anket ${MIN_OPTIONS}-${MAX_OPTIONS} seçenek içermeli.`,
      );
    }
    if (optionTexts.some((o) => o.length > 100)) {
      throw new BadRequestException('Seçenekler en fazla 100 karakter olmalı.');
    }

    await this.assertParticipant(channelId, userId);
    await this.assertKendiAramizdaMatchChannel(channelId);
    await this.assertCaptainOrVice(userId);
    await this.assertMatchNotFinished(channelId);

    const poll = await this.pollRepository.save(
      this.pollRepository.create({
        channelId,
        createdById: userId,
        title,
        allowMultiple,
      }),
    );
    await this.pollOptionRepository.save(
      optionTexts.map((text, index) =>
        this.pollOptionRepository.create({
          pollId: poll.id,
          text,
          sortOrder: index,
        }),
      ),
    );

    // Önce pollUpdated: duyurunun newMessage yankısı karta ulaşmadan istemcide
    // anket verisi hazır olsun (fallback: client haritada yoksa GET ile çeker).
    const view = await this.serializePoll(poll.id);
    await this.emitPollUpdated(view);

    // Duyuru sistem mesajı — push, normal sendMessage yolundan otomatik gider.
    // {{POLL}} uygulama-içi özel ikona çevrilir (SystemMessageRenderer);
    // push gövdesinde ve kanal listesinde token strip edilir.
    const message = await this.chatService.sendMessage(
      channelId,
      null,
      `{{POLL}} Anket: ${title}`,
      true,
      { type: 'POLL', pollId: poll.id },
    );
    await this.pollRepository.update(poll.id, { messageId: message.id });

    return view;
  }

  async getPollsForChannel(
    channelId: string,
    userId: string,
  ): Promise<PollView[]> {
    await this.assertParticipant(channelId, userId);
    const polls = await this.pollRepository.find({
      where: { channelId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return this.serializePolls(polls);
  }

  // Deklaratif oy: client istenen TAM seçimi gönderir. [] = geri çekme,
  // teklide [yeniId] = değiştirme, çoklu = güncel küme. Sunucu diff uygular.
  async vote(
    pollId: string,
    userId: string,
    rawOptionIds: unknown,
  ): Promise<PollView> {
    const optionIds = Array.isArray(rawOptionIds)
      ? [
          ...new Set(
            rawOptionIds.filter((o): o is string => typeof o === 'string'),
          ),
        ]
      : null;
    if (!optionIds) {
      throw new BadRequestException('optionIds bir dizi olmalı.');
    }

    const poll = await this.pollRepository.findOne({
      where: { id: pollId },
      relations: ['options'],
    });
    if (!poll) throw new NotFoundException('Anket bulunamadı.');

    await this.assertParticipant(poll.channelId, userId);
    if (poll.isClosed) {
      throw new BadRequestException('Anket sonlandırılmış.');
    }
    await this.assertMatchNotFinished(poll.channelId);

    const validOptionIds = new Set((poll.options ?? []).map((o) => o.id));
    if (optionIds.some((id) => !validOptionIds.has(id))) {
      throw new BadRequestException('Geçersiz anket seçeneği.');
    }
    if (!poll.allowMultiple && optionIds.length > 1) {
      throw new BadRequestException('Bu ankette tek seçenek seçilebilir.');
    }

    const existing = await this.pollVoteRepository.find({
      where: { pollId, userId },
    });
    const existingOptionIds = new Set(existing.map((v) => v.optionId));
    const wanted = new Set(optionIds);

    const toDelete = existing.filter((v) => !wanted.has(v.optionId));
    if (toDelete.length > 0) {
      await this.pollVoteRepository.delete({
        id: In(toDelete.map((v) => v.id)),
      });
    }
    const toInsert = optionIds.filter((id) => !existingOptionIds.has(id));
    for (const optionId of toInsert) {
      try {
        await this.pollVoteRepository.save(
          this.pollVoteRepository.create({ pollId, optionId, userId }),
        );
      } catch {
        // @Unique(['optionId','userId']) yarışı (çift dokunuş) — oy zaten var, yut
      }
    }

    const view = await this.serializePoll(pollId);
    await this.emitPollUpdated(view);
    return view;
  }

  async closePoll(pollId: string, userId: string): Promise<PollView> {
    const poll = await this.pollRepository.findOne({ where: { id: pollId } });
    if (!poll) throw new NotFoundException('Anket bulunamadı.');

    await this.assertParticipant(poll.channelId, userId);
    await this.assertCaptainOrVice(userId);
    if (poll.isClosed) {
      throw new BadRequestException('Anket zaten sonlandırılmış.');
    }

    await this.pollRepository.update(poll.id, {
      isClosed: true,
      closedAt: new Date(),
      closedById: userId,
    });

    const view = await this.serializePoll(pollId);
    await this.emitPollUpdated(view);
    return view;
  }
}
