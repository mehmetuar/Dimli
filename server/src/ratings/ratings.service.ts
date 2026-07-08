import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  In,
  LessThan,
  MoreThanOrEqual,
  And,
  FindOperator,
} from 'typeorm';
import { Rating } from './rating.entity';
import {
  Reservation,
  ReservationStatus,
} from '../reservations/entities/reservation.entity';
import { Business } from '../business/entities/business.entity';
import { Team } from '../teams/team.entity';
import { User } from '../users/user.entity';
import { ChatChannel } from '../chat/chat-channel.entity';
import { ChatParticipant } from '../chat/chat-participant.entity';
import { ChatMessage } from '../chat/chat-message.entity';
import { CreateRatingDto } from './dto/create-rating.dto';

export interface PendingRating {
  reservationId: string;
  slotTime: string;
  pitchName: string;
  businessName: string;
  businessId: string;
  businessDeleted: boolean;
  needsBusinessRating: boolean;
  needsFairPlayRating: boolean;
  opponentTeamId: string | null;
  opponentTeamName: string | null;
  /** Rakip takım silinmiş — skor verilemez, "Bu takım artık mevcut değil" gösterilir */
  opponentTeamDeleted: boolean;
}

export interface MatchHistoryItem {
  reservationId: string;
  slotTime: string;
  pitchName: string;
  businessName: string;
  businessId: string;
  businessDeleted: boolean;
  opponentTeamId: string | null;
  opponentTeamName: string | null;
  opponentTeamDeleted: boolean;
  isBusinessRated: boolean;
  isFairPlayRated: boolean;
  businessScore: number | null;
  fairPlayScore: number | null;
  needsBusinessRating: boolean;
  needsFairPlayRating: boolean;
}

/** Kullanıcının JOKER olarak oynadığı bir maç (Hesap › Joker Geçmişi). */
export interface JokerMatchHistoryItem extends MatchHistoryItem {
  /** Joker'in o maçta adına oynadığı takım (davet eden takım). */
  invitingTeamId: string | null;
  invitingTeamName: string | null;
}

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Rating)
    private ratingRepo: Repository<Rating>,
    @InjectRepository(Reservation)
    private reservationRepo: Repository<Reservation>,
    @InjectRepository(Business)
    private businessRepo: Repository<Business>,
    @InjectRepository(Team)
    private teamRepo: Repository<Team>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(ChatChannel)
    private chatChannelRepo: Repository<ChatChannel>,
    @InjectRepository(ChatParticipant)
    private chatParticipantRepo: Repository<ChatParticipant>,
    @InjectRepository(ChatMessage)
    private chatMessageRepo: Repository<ChatMessage>,
  ) {}

  /**
   * Kullanıcının bakış açısından RAKİBİ çözer. Rakip = maçın kullanıcının takımı OLMAYAN
   * tarafı. O taraf silindiyse (canlı ref null ama snapshot var) → opponentTeamDeleted=true
   * ve snapshot'lanan ad ("Bu takım artık mevcut değil" bilgilendirmesi). Gerçek kendi_aramizda
   * maçında (ikisi de yok) hadOpponent=false. `team` + `opponentTeam` relation'ları yüklü olmalı.
   */
  private resolveOpponent(
    reservation: Reservation,
    userTeamId: string,
  ): {
    hadOpponent: boolean;
    opponentTeamId: string | null;
    opponentTeamName: string | null;
    opponentTeamDeleted: boolean;
  } {
    const hadOpponent =
      !!reservation.opponentTeamId || !!reservation.deletedTeamName;
    if (!hadOpponent) {
      return {
        hadOpponent: false,
        opponentTeamId: null,
        opponentTeamName: null,
        opponentTeamDeleted: false,
      };
    }
    // Kullanıcı opponentTeam tarafındaysa rakip = ev sahibi (team); değilse rakip = opponentTeam.
    const userIsOpponentSide = reservation.opponentTeamId === userTeamId;
    const liveId = userIsOpponentSide
      ? reservation.teamId
      : reservation.opponentTeamId;
    const liveName = userIsOpponentSide
      ? reservation.team?.name
      : reservation.opponentTeam?.name;
    if (liveId) {
      return {
        hadOpponent: true,
        opponentTeamId: liveId,
        opponentTeamName: liveName ?? null,
        opponentTeamDeleted: false,
      };
    }
    // Rakip tarafın canlı ref'i yok → silinmiş takım
    return {
      hadOpponent: true,
      opponentTeamId: null,
      opponentTeamName: reservation.deletedTeamName ?? 'Silinmiş takım',
      opponentTeamDeleted: true,
    };
  }

  /**
   * slotTime için where operatörü kurar. Üst sınır (before) her zaman uygulanır;
   * teamJoinedAt doluysa alt sınır da eklenir → oyuncu yalnız katıldıktan sonra oynanan
   * maçları görür. null (eski üye) ise yalnız üst sınır uygulanır (geriye dönük uyumlu).
   */
  private buildSlotFilter(
    before: Date,
    teamJoinedAt: Date | null | undefined,
  ): FindOperator<Date> {
    return teamJoinedAt
      ? And(LessThan(before), MoreThanOrEqual(teamJoinedAt))
      : LessThan(before);
  }

  async getPendingRatings(userId: string): Promise<PendingRating[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.teamId) return [];

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Yeni katılan oyuncu, katılmadan ÖNCE oynanan maçları değerlendiremez:
    // teamJoinedAt doluysa slotTime hem <oneHourAgo hem >=teamJoinedAt olmalı.
    // null (eski üye) ise yalnız <oneHourAgo — mevcut davranış korunur.
    const slotFilter = this.buildSlotFilter(oneHourAgo, user.teamJoinedAt);

    // Find played APPROVED reservations: filter slotTime at DB level
    const played = await this.reservationRepo.find({
      where: [
        {
          status: ReservationStatus.APPROVED,
          teamId: user.teamId,
          slotTime: slotFilter,
        },
        {
          status: ReservationStatus.APPROVED,
          opponentTeamId: user.teamId,
          slotTime: slotFilter,
        },
      ],
      relations: ['pitch', 'pitch.business', 'team', 'opponentTeam'],
    });

    if (played.length === 0) return [];

    // Deduplicate (same reservation may appear in both OR branches)
    const seen = new Set<string>();
    const uniquePlayed = played.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    const reservationIds = uniquePlayed.map((r) => r.id);

    // Load existing ratings by this user for these reservations
    const existingRatings = await this.ratingRepo.find({
      where: {
        ratedByUserId: userId,
        reservationId: In(reservationIds),
      },
    });

    const doneSet = new Set(
      existingRatings.map((r) => `${r.reservationId}_${r.type}`),
    );

    const results: PendingRating[] = [];

    for (const reservation of uniquePlayed) {
      if (!reservation.pitch?.business) continue;

      const opp = this.resolveOpponent(reservation, user.teamId);
      // İşletme hesabı silinmişse artık yeni bir işletme değerlendirmesi teklif edilmez
      const needsBusinessRating =
        !reservation.pitch.business.deletedAt &&
        !doneSet.has(`${reservation.id}_BUSINESS`);
      // Rakip silinmişse fair-play skoru istenmez (opponentTeamDeleted) — "Bu takım artık
      // mevcut değil" bilgisi maç geçmişinde gösterilir.
      const needsFairPlayRating =
        opp.hadOpponent &&
        !opp.opponentTeamDeleted &&
        !doneSet.has(`${reservation.id}_FAIRPLAY`);

      if (!needsBusinessRating && !needsFairPlayRating) continue;

      results.push({
        reservationId: reservation.id,
        slotTime: reservation.slotTime.toISOString(),
        pitchName: reservation.pitch.name,
        businessName: reservation.pitch.business.name,
        businessId: reservation.pitch.business.id,
        businessDeleted: !!reservation.pitch.business.deletedAt,
        needsBusinessRating,
        needsFairPlayRating,
        opponentTeamId: opp.opponentTeamId,
        opponentTeamName: opp.opponentTeamName,
        opponentTeamDeleted: opp.opponentTeamDeleted,
      });
    }

    results.sort(
      (a, b) => new Date(a.slotTime).getTime() - new Date(b.slotTime).getTime(),
    );
    return results;
  }

  async submitRating(userId: string, dto: CreateRatingDto): Promise<void> {
    if (!dto.score || dto.score < 1 || dto.score > 5) {
      throw new BadRequestException('Puan 1 ile 5 arasında olmalıdır.');
    }

    // Check for duplicate
    const existing = await this.ratingRepo.findOne({
      where: {
        reservationId: dto.reservationId,
        ratedByUserId: userId,
        type: dto.type,
      },
    });
    if (existing) {
      throw new ConflictException('Bu maç için zaten değerlendirme yapıldı.');
    }

    // Katılım doğrulaması (otoriter): çağıran bu maçta gerçekten yer almış olmalı.
    // Aksi halde yeni katılan/ayrılmış bir oyuncu ya da bayat/kötü niyetli bir istek
    // oynamadığı maça puan üretemez. İki geçerli yol: (1) takım üyesi ve maç katılıştan
    // sonra oynanmış, (2) o maça joker olarak katılmış.
    const reservation = await this.reservationRepo.findOne({
      where: { id: dto.reservationId },
    });
    if (!reservation) {
      throw new NotFoundException('Maç bulunamadı.');
    }
    const rater = await this.userRepo.findOne({ where: { id: userId } });
    const isTeamMember =
      !!rater?.teamId &&
      (reservation.teamId === rater.teamId ||
        reservation.opponentTeamId === rater.teamId) &&
      (!rater.teamJoinedAt ||
        reservation.slotTime.getTime() >= rater.teamJoinedAt.getTime());
    if (!isTeamMember) {
      const wasJoker = await this.wasJokerInMatch(userId, reservation);
      if (!wasJoker) {
        throw new ForbiddenException(
          'Bu maçta yer almadığınız için değerlendirme yapamazsınız.',
        );
      }
    }

    // Fair-play hedefi takım SİLİNMİŞSE değerlendirme kabul edilmez (öksüz rating oluşmasın).
    // Rakip artık mevcut değil → bayat client submit'i temiz reddedilir.
    if (dto.type === 'FAIRPLAY') {
      const targetTeam = dto.targetTeamId
        ? await this.teamRepo.findOne({ where: { id: dto.targetTeamId } })
        : null;
      if (!targetTeam) {
        throw new NotFoundException('Bu takım artık mevcut değil.');
      }
    }

    // Save the rating row directly (no transaction — simpler and avoids DataSource injection issues)
    const rating = new Rating();
    rating.reservationId = dto.reservationId;
    rating.ratedByUserId = userId;
    rating.type = dto.type;
    rating.targetBusinessId = dto.targetBusinessId || null;
    rating.targetTeamId = dto.targetTeamId || null;
    rating.score = dto.score;
    await this.ratingRepo.save(rating);

    // Update the target entity's average score using DB-level aggregation
    if (dto.type === 'BUSINESS' && dto.targetBusinessId) {
      const { avg, count } = await this.ratingRepo
        .createQueryBuilder('r')
        .select('AVG(r.score)', 'avg')
        .addSelect('COUNT(*)', 'count')
        .where('r.type = :type', { type: 'BUSINESS' })
        .andWhere('r.targetBusinessId = :id', { id: dto.targetBusinessId })
        .getRawOne();
      await this.businessRepo.update(dto.targetBusinessId, {
        rating: Math.round(parseFloat(avg as string) * 10) / 10,
        ratingCount: parseInt(count as string, 10),
      });
    }

    if (dto.type === 'FAIRPLAY' && dto.targetTeamId) {
      const { avg, count } = await this.ratingRepo
        .createQueryBuilder('r')
        .select('AVG(r.score)', 'avg')
        .addSelect('COUNT(*)', 'count')
        .where('r.type = :type', { type: 'FAIRPLAY' })
        .andWhere('r.targetTeamId = :id', { id: dto.targetTeamId })
        .getRawOne();
      await this.teamRepo.update(dto.targetTeamId, {
        fairPlayScore: Math.round(parseFloat(avg as string) * 10) / 10,
        fairPlayRatingCount: parseInt(count as string, 10),
      });
    }
  }

  async getMatchHistory(userId: string): Promise<MatchHistoryItem[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.teamId) return [];

    const now = new Date();

    // Yeni katılan oyuncu, katılmadan ÖNCE oynanan maçları görmez/değerlendiremez.
    const slotFilter = this.buildSlotFilter(now, user.teamJoinedAt);

    // Geçmiş tüm APPROVED rezervasyonları getir (hem ev sahibi hem misafir olarak)
    const played = await this.reservationRepo.find({
      where: [
        {
          status: ReservationStatus.APPROVED,
          teamId: user.teamId,
          slotTime: slotFilter,
        },
        {
          status: ReservationStatus.APPROVED,
          opponentTeamId: user.teamId,
          slotTime: slotFilter,
        },
      ],
      relations: ['pitch', 'pitch.business', 'team', 'opponentTeam'],
    });

    if (played.length === 0) return [];

    // Duplikatları temizle
    const seen = new Set<string>();
    const uniquePlayed = played.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    const reservationIds = uniquePlayed.map((r) => r.id);

    // Bu kullanıcının bu rezervasyonlar için yaptığı tüm rating'leri getir
    const existingRatings = await this.ratingRepo.find({
      where: {
        ratedByUserId: userId,
        reservationId: In(reservationIds),
      },
    });

    const ratingMap = new Map<string, { type: string; score: number }[]>();
    for (const r of existingRatings) {
      if (!ratingMap.has(r.reservationId)) ratingMap.set(r.reservationId, []);
      ratingMap.get(r.reservationId)!.push({ type: r.type, score: r.score });
    }

    const results: MatchHistoryItem[] = [];

    for (const reservation of uniquePlayed) {
      if (!reservation.pitch?.business) continue;

      const opp = this.resolveOpponent(reservation, user.teamId);
      const ratings = ratingMap.get(reservation.id) || [];
      const businessRating = ratings.find((r) => r.type === 'BUSINESS');
      const fairPlayRating = ratings.find((r) => r.type === 'FAIRPLAY');

      const isBusinessRated = !!businessRating;
      const isFairPlayRated = !!fairPlayRating;

      results.push({
        reservationId: reservation.id,
        slotTime: reservation.slotTime.toISOString(),
        pitchName: reservation.pitch.name,
        businessName: reservation.pitch.business.name,
        businessId: reservation.pitch.business.id,
        businessDeleted: !!reservation.pitch.business.deletedAt,
        opponentTeamId: opp.opponentTeamId,
        opponentTeamName: opp.opponentTeamName,
        opponentTeamDeleted: opp.opponentTeamDeleted,
        isBusinessRated,
        isFairPlayRated,
        businessScore: businessRating?.score ?? null,
        fairPlayScore: fairPlayRating?.score ?? null,
        needsBusinessRating:
          !reservation.pitch.business.deletedAt && !isBusinessRated,
        // Rakip silinmişse fair-play skoru istenmez (opponentTeamDeleted)
        needsFairPlayRating:
          opp.hadOpponent && !opp.opponentTeamDeleted && !isFairPlayRated,
      });
    }

    // En yeniden eskiye sırala
    results.sort(
      (a, b) => new Date(b.slotTime).getTime() - new Date(a.slotTime).getTime(),
    );
    return results;
  }

  /**
   * Bir maçın MATCH_GROUP kanalını bulur (relatedMatchId = maç ilanı id). Joker katılımı
   * bu kanal üzerinden takip edilir. Rezervasyonun maç ilanı yoksa (ör. direkt/kendi aramızda)
   * joker olamaz → null.
   */
  private async findMatchGroupChannel(
    reservation: Reservation,
  ): Promise<ChatChannel | null> {
    if (!reservation.matchAnnouncementId) return null;
    return this.chatChannelRepo.findOne({
      where: {
        relatedMatchId: reservation.matchAnnouncementId,
        type: 'MATCH_GROUP',
      },
    });
  }

  /**
   * Kullanıcı bu maça JOKER olarak katıldı mı? Joker = maçın MATCH_GROUP sohbetine katılmış
   * ama teamId'si maçın iki takımından biri OLMAYAN kullanıcı. (Takım üyeleri de kanalda olur;
   * onları teamId eşleşmesiyle eleriz.) Çıkarılmış olsa da (deletedAt dolu) maçta yer aldığı
   * için katılım geçerli sayılır.
   */
  private async wasJokerInMatch(
    userId: string,
    reservation: Reservation,
  ): Promise<boolean> {
    const channel = await this.findMatchGroupChannel(reservation);
    if (!channel) return false;
    const participant = await this.chatParticipantRepo.findOne({
      where: { channelId: channel.id, userId },
    });
    if (!participant) return false;
    // Takım üyesiyse joker değildir (o maç zaten takım geçmişinde ele alınır).
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const isMember =
      !!user?.teamId &&
      (reservation.teamId === user.teamId ||
        reservation.opponentTeamId === user.teamId);
    return !isMember;
  }

  /**
   * Kullanıcının JOKER olarak oynadığı geçmiş maçlar (Hesap › Joker Geçmişi). Joker,
   * oynadığı sahayı (işletme) ve adına oynadığı takımın RAKİBİNİ (fair-play) puanlayabilir.
   */
  async getJokerMatchHistory(userId: string): Promise<JokerMatchHistoryItem[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return [];

    // Kullanıcının katılımcı olduğu tüm kanallar → MATCH_GROUP olanları çöz.
    const participations = await this.chatParticipantRepo.find({
      where: { userId },
    });
    const channelIds = [...new Set(participations.map((p) => p.channelId))];
    if (channelIds.length === 0) return [];

    const channels = await this.chatChannelRepo.find({
      where: { id: In(channelIds), type: 'MATCH_GROUP' },
    });
    // relatedMatchId (maç ilanı id) → kanal eşlemesi
    const matchIdToChannel = new Map<string, ChatChannel>();
    for (const c of channels) {
      if (c.relatedMatchId) matchIdToChannel.set(c.relatedMatchId, c);
    }
    const matchAnnouncementIds = [...matchIdToChannel.keys()];
    if (matchAnnouncementIds.length === 0) return [];

    const now = new Date();
    // Bu maç ilanlarına bağlı oynanmış (APPROVED, geçmiş) rezervasyonlar
    const reservations = await this.reservationRepo.find({
      where: {
        matchAnnouncementId: In(matchAnnouncementIds),
        status: ReservationStatus.APPROVED,
        slotTime: LessThan(now),
      },
      relations: ['pitch', 'pitch.business', 'team', 'opponentTeam'],
    });
    if (reservations.length === 0) return [];

    // Kullanıcı bu maçlarda JOKER mı (takım üyesiyse takım geçmişine ait, buraya girmez)
    const jokerReservations = reservations.filter((r) => {
      if (!r.pitch?.business) return false;
      const isMember =
        !!user.teamId &&
        (r.teamId === user.teamId || r.opponentTeamId === user.teamId);
      return !isMember;
    });
    if (jokerReservations.length === 0) return [];

    const reservationIds = jokerReservations.map((r) => r.id);

    // Kullanıcının bu rezervasyonlar için mevcut puanları
    const existingRatings = await this.ratingRepo.find({
      where: { ratedByUserId: userId, reservationId: In(reservationIds) },
    });
    const doneSet = new Set(
      existingRatings.map((r) => `${r.reservationId}_${r.type}`),
    );
    const scoreMap = new Map<string, { type: string; score: number }[]>();
    for (const r of existingRatings) {
      if (!scoreMap.has(r.reservationId)) scoreMap.set(r.reservationId, []);
      scoreMap.get(r.reservationId)!.push({ type: r.type, score: r.score });
    }

    // Joker'in her maçta adına oynadığı takımı JOKER_JOINED sistem mesajından çöz
    const channelIdsForMatches = jokerReservations
      .map((r) => matchIdToChannel.get(r.matchAnnouncementId)?.id)
      .filter((id): id is string => !!id);
    const jokerJoinedMsgs = channelIdsForMatches.length
      ? await this.chatMessageRepo.find({
          where: {
            channelId: In(channelIdsForMatches),
            isSystemMessage: true,
          },
        })
      : [];
    // channelId → invitingTeamId (bu joker için)
    const invitingTeamByChannel = new Map<string, string>();
    for (const msg of jokerJoinedMsgs) {
      if (
        msg.metadata?.type === 'JOKER_JOINED' &&
        msg.metadata?.jokerId === userId &&
        msg.metadata?.invitingTeamId
      ) {
        invitingTeamByChannel.set(
          msg.channelId,
          msg.metadata.invitingTeamId as string,
        );
      }
    }

    const results: JokerMatchHistoryItem[] = [];
    for (const reservation of jokerReservations) {
      const business = reservation.pitch.business;
      const channel = matchIdToChannel.get(reservation.matchAnnouncementId);
      const invitingTeamId = channel
        ? (invitingTeamByChannel.get(channel.id) ?? null)
        : null;

      // Adına oynadığı takım bilinmiyorsa rakip belirlenemez → yalnız işletme puanı sunulur.
      const opp = invitingTeamId
        ? this.resolveOpponent(reservation, invitingTeamId)
        : {
            hadOpponent: false,
            opponentTeamId: null,
            opponentTeamName: null,
            opponentTeamDeleted: false,
          };

      const invitingTeamName =
        invitingTeamId === reservation.teamId
          ? (reservation.team?.name ?? null)
          : invitingTeamId === reservation.opponentTeamId
            ? (reservation.opponentTeam?.name ?? null)
            : null;

      const ratings = scoreMap.get(reservation.id) || [];
      const businessRating = ratings.find((r) => r.type === 'BUSINESS');
      const fairPlayRating = ratings.find((r) => r.type === 'FAIRPLAY');
      const isBusinessRated = !!businessRating;
      const isFairPlayRated = !!fairPlayRating;

      results.push({
        reservationId: reservation.id,
        slotTime: reservation.slotTime.toISOString(),
        pitchName: reservation.pitch.name,
        businessName: business.name,
        businessId: business.id,
        businessDeleted: !!business.deletedAt,
        opponentTeamId: opp.opponentTeamId,
        opponentTeamName: opp.opponentTeamName,
        opponentTeamDeleted: opp.opponentTeamDeleted,
        invitingTeamId,
        invitingTeamName,
        isBusinessRated,
        isFairPlayRated,
        businessScore: businessRating?.score ?? null,
        fairPlayScore: fairPlayRating?.score ?? null,
        needsBusinessRating:
          !business.deletedAt && !doneSet.has(`${reservation.id}_BUSINESS`),
        needsFairPlayRating:
          opp.hadOpponent &&
          !opp.opponentTeamDeleted &&
          !doneSet.has(`${reservation.id}_FAIRPLAY`),
      });
    }

    // En yeniden eskiye sırala
    results.sort(
      (a, b) => new Date(b.slotTime).getTime() - new Date(a.slotTime).getTime(),
    );
    return results;
  }

  async getTeamMatchCount(teamId: string): Promise<number> {
    const now = new Date();
    return this.reservationRepo
      .createQueryBuilder('r')
      .where('r.status = :status', { status: ReservationStatus.APPROVED })
      .andWhere('r.slotTime < :now', { now })
      .andWhere('(r.teamId = :teamId OR r.opponentTeamId = :teamId)', {
        teamId,
      })
      .getCount();
  }

  async getTeamPlayerCount(teamId: string | null): Promise<number> {
    if (!teamId) return 0;
    return this.userRepo.count({ where: { teamId } });
  }

  // ── Batch: birden çok takımın oynanmış (APPROVED, geçmiş) maç sayısı — tek yerine
  //    iki GROUP BY sorgusu (getTeamMatchCount ×N yerine). teamId VEYA opponentTeamId. ──
  async getTeamMatchCounts(teamIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (!teamIds.length) return counts;
    const now = new Date();
    const add = (rows: { teamId: string; count: string }[]) => {
      for (const r of rows) {
        if (!r.teamId) continue;
        counts.set(r.teamId, (counts.get(r.teamId) ?? 0) + Number(r.count));
      }
    };
    add(
      await this.reservationRepo
        .createQueryBuilder('r')
        .select('r.teamId', 'teamId')
        .addSelect('COUNT(*)', 'count')
        .where('r.status = :status', { status: ReservationStatus.APPROVED })
        .andWhere('r.slotTime < :now', { now })
        .andWhere('r.teamId IN (:...ids)', { ids: teamIds })
        .groupBy('r.teamId')
        .getRawMany(),
    );
    add(
      await this.reservationRepo
        .createQueryBuilder('r')
        .select('r.opponentTeamId', 'teamId')
        .addSelect('COUNT(*)', 'count')
        .where('r.status = :status', { status: ReservationStatus.APPROVED })
        .andWhere('r.slotTime < :now', { now })
        .andWhere('r.opponentTeamId IN (:...ids)', { ids: teamIds })
        .groupBy('r.opponentTeamId')
        .getRawMany(),
    );
    return counts;
  }

  // ── Batch: birden çok takımın oyuncu sayısı — tek GROUP BY (getTeamPlayerCount ×N yerine).
  //    user.teamId indexli (§26). ──
  async getTeamPlayerCounts(teamIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (!teamIds.length) return counts;
    const rows: { teamId: string; count: string }[] = await this.userRepo
      .createQueryBuilder('u')
      .select('u.teamId', 'teamId')
      .addSelect('COUNT(*)', 'count')
      .where('u.teamId IN (:...ids)', { ids: teamIds })
      .groupBy('u.teamId')
      .getRawMany();
    for (const r of rows) {
      if (r.teamId) counts.set(r.teamId, Number(r.count));
    }
    return counts;
  }
}
