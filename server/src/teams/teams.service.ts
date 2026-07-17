import {
  Injectable,
  OnModuleInit,
  HttpException,
  HttpStatus,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Team } from './team.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { RatingsService } from '../ratings/ratings.service';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';
import {
  Reservation,
  ReservationStatus,
} from '../reservations/entities/reservation.entity';
import { JoinRequestsService } from '../join-requests/join-requests.service';
import { TeamBansService } from '../team-bans/team-bans.service';
import { CloudinaryService } from '../files/cloudinary.service';

// findOne/searchByTerm dönüşü: takım + oynanan maç sayısı zenginleştirmesi.
export interface TeamWithMatchCount extends Team {
  playedMatchCount: number;
}
import { sanitizeUser } from '../common/sanitize-user.util';

@Injectable()
export class TeamsService implements OnModuleInit {
  constructor(
    @InjectRepository(Team)
    private teamsRepository: Repository<Team>,
    @InjectRepository(MatchAnnouncement)
    private matchAnnouncementsRepository: Repository<MatchAnnouncement>,
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,
    private usersService: UsersService,
    private ratingsService: RatingsService,
    @Inject(forwardRef(() => JoinRequestsService))
    private joinRequestsService: JoinRequestsService,
    private teamBansService: TeamBansService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async onModuleInit() {
    const teams = await this.teamsRepository.find();
    for (const team of teams) {
      if (!team.shortId) {
        team.shortId = await this.generateUniqueShortId();
        await this.teamsRepository.save(team);
      }
    }
  }

  private generateShortId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const digits = '0123456789';
    const letters = Array.from(
      { length: 3 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('');
    const numbers = Array.from(
      { length: 3 },
      () => digits[Math.floor(Math.random() * digits.length)],
    ).join('');
    return `${letters}-${numbers}`;
  }

  private async generateUniqueShortId(): Promise<string> {
    let shortId: string;
    let attempts = 0;
    do {
      shortId = this.generateShortId();
      const existing = await this.teamsRepository.findOne({
        where: { shortId },
      });
      if (!existing) return shortId;
      attempts++;
    } while (attempts < 10);
    throw new Error('Could not generate unique shortId');
  }

  async create(createTeamDto: CreateTeamDto, user: User): Promise<Team> {
    // captainId/fairPlayScore DTO'da yok → ValidationPipe(whitelist) istemciden gelmelerini
    // engeller; captain aşağıda JWT kullanıcısından set edilir.

    // Fetch the managed user entity to ensure TypeORM tracks it for the relationship
    const managedUser = await this.usersService.findById(user.id);
    if (!managedUser) throw new NotFoundException('Kullanıcı bulunamadı.');

    // Preempt the TypeORM duplicate key unique constraint on OneToOne
    const existingLedTeam = await this.teamsRepository.findOne({
      where: { captainId: managedUser.id },
    });
    if (existingLedTeam) {
      throw new ConflictException(
        'Zaten bir takımın kaptanısınız. Yeni takım kurmak için mevcut takımı devretmeli veya silmelisiniz.',
      );
    }

    const shortId = await this.generateUniqueShortId();

    const team = this.teamsRepository.create({
      ...createTeamDto,
      shortId,
      captain: managedUser,
      captainId: managedUser.id,
      players: [managedUser], // This is safe now because managedUser is tracked
    } as unknown as Team);

    const savedTeam = await this.teamsRepository.save(team);

    // Update the user explicitly to point to the newly created team
    managedUser.team = savedTeam;
    // Kaptan takımı kurduğu an katılmış sayılır.
    managedUser.teamJoinedAt = new Date();
    await this.usersService['usersRepository'].save(managedUser);

    // Return the full team with relations
    return this.findOne(savedTeam.id) as Promise<Team>;
  }

  // /teams yanıtlarında oyuncu/kaptan olarak dönen User kayıtlarındaki hassas
  // alanlar istemciye SIZMAMALI (GET /teams, /teams/:id ve /teams/search/:term
  // anonim erişime açık). Hassas alan listesi + sanitize tek kaynak:
  // common/sanitize-user.util.ts (sunucu genelinde ortak).
  private sanitizeUser<T extends object>(user: T): T {
    return sanitizeUser(user);
  }

  // Takım oyuncularını TEK sorguda, yalnız hassas-olmayan kolonlarla yükler:
  // SENSITIVE_USER_FIELDS DB'den hiç ÇEKİLMEZ (sanitizeUser yine de savunma
  // katmanı olarak kalır) ve user.team join'i yok → oyuncu başına gömülü tam
  // takım nesnesi payload'a girmez (players[].team'i okuyan tüketici yok;
  // skaler teamId yeterli).
  private loadTeamPlayers(teamId: string): Promise<User[]> {
    return this.usersService['usersRepository']
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.username',
        'user.full_name',
        'user.position',
        'user.location',
        'user.birthDate',
        'user.secondaryPosition',
        'user.foot',
        'user.nationality',
        'user.favoriteBusinessIds',
        'user.rating',
        'user.avatarUrl',
        'user.teamId',
        'user.teamJoinedAt',
        'user.isJoker',
        'user.sharesFee',
      ])
      .where('user.teamId = :teamId', { teamId })
      .getMany();
  }

  async findAll(): Promise<Team[]> {
    const teams = await this.teamsRepository.find({ relations: ['captain'] });

    for (const team of teams) {
      const players = await this.loadTeamPlayers(team.id);
      team.players = players.map((u) => this.sanitizeUser(u));
      if (team.captain) team.captain = this.sanitizeUser(team.captain);
    }

    return teams;
  }

  async searchByTerm(term: string): Promise<TeamWithMatchCount[]> {
    const shortIdPattern = /^[A-Z]{3}-\d{3}$/;
    let teams: Team[];

    if (shortIdPattern.test(term.toUpperCase())) {
      // Search by shortId
      const team = await this.teamsRepository
        .createQueryBuilder('team')
        .leftJoinAndSelect('team.captain', 'captain')
        .where('UPPER(team.short_id) = :shortId', {
          shortId: term.toUpperCase(),
        })
        .getOne();
      teams = team ? [team] : [];
    } else {
      // Partial name search (ILIKE)
      teams = await this.teamsRepository
        .createQueryBuilder('team')
        .leftJoinAndSelect('team.captain', 'captain')
        .where('LOWER(team.name) LIKE LOWER(:name)', { name: `%${term}%` })
        .limit(10)
        .getMany();
    }

    const results = await Promise.all(
      teams.map(async (team) => {
        const playedMatchCount = await this.ratingsService.getTeamMatchCount(
          team.id,
        );
        return {
          ...team,
          captain: team.captain
            ? this.sanitizeUser(team.captain)
            : team.captain,
          playedMatchCount,
        };
      }),
    );

    return results;
  }

  async findOne(id: string): Promise<TeamWithMatchCount | null> {
    // players relation'ı YÜKLENMEZ — aşağıda loadTeamPlayers zaten dar
    // select'le çekiyor (eski hali aynı oyuncuları iki kez sorguluyordu).
    const team = await this.teamsRepository.findOne({
      where: { id },
      relations: ['captain'],
    });

    if (!team) return null;

    const players = await this.loadTeamPlayers(team.id);

    // Map User entity to Player interface structure (hassas alanlar temizlenir)
    team.players = players.map((user) =>
      this.sanitizeUser({
        ...user,
        id: user.id,
        name: user.full_name || user.username, // vital mapping
        position: user.position,
        avatarUrl:
          user.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=random`,
        rating: user.rating,
        teamId: team.id,
      }),
    );
    if (team.captain) team.captain = this.sanitizeUser(team.captain);

    const playedMatchCount = await this.ratingsService.getTeamMatchCount(
      team.id,
    );
    return { ...team, playedMatchCount };
  }

  async addPlayer(teamId: string, userId: string): Promise<Team> {
    const team = await this.findOne(teamId);
    if (!team) throw new NotFoundException('Takım bulunamadı.');

    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    // Zaten bir takımı olan oyuncu davet edilemez — istemciye düzgün mesaj dön
    // (düz Error olursa NestJS 500 "Internal server error"e çevirir, mesaj gizlenir).
    if (user.team) {
      throw new ConflictException('Bu oyuncunun zaten bir takımı var.');
    }

    // Check max roster size
    if (team.players && team.players.length >= 28) {
      throw new ConflictException('Kadro maksimum 28 kişi olabilir.');
    }

    // Set the team on the user (this is the ManyToOne side, which owns the foreign key)
    user.team = team;
    // Katılış anını damgala → yeni oyuncu yalnız bu tarihten sonraki maçları değerlendirebilir.
    user.teamJoinedAt = new Date();

    // We need to save the user to persist the team relationship
    // Since usersService doesn't have an update method, we'll use the repository
    await this.usersService['usersRepository'].save(user);

    // Kullanıcının bu takıma veya başka takımlara olan bekleyen katılma
    // isteklerini çözümle (kabul edilen takım: ACCEPTED, diğerleri: CANCELLED)
    await this.joinRequestsService.resolveOnTeamJoin(userId, teamId);

    // Kaptan bu kullanıcıyı (tekrar) eklediği için, bu takımdan
    // önceden atılmış olsa bile ban kaydını kaldır
    await this.teamBansService.unbanPlayer(teamId, userId);

    // Reload the team to get the updated players list
    const updatedTeam = await this.findOne(teamId);
    if (!updatedTeam) throw new Error('Team not found after update');

    return updatedTeam;
  }

  // Davet linki üzerinden kullanıcının kendisi tarafından tetiklenen katılım.
  // addPlayer ile aynı kuralları uygular ama hata mesajları istemciye iletilebilsin
  // diye HttpException alt sınıflarını kullanır.
  async joinTeamViaInvite(teamId: string, userId: string): Promise<Team> {
    const team = await this.findOne(teamId);
    if (!team) throw new NotFoundException('Takım bulunamadı.');

    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    if (user.team) {
      throw new ConflictException(
        'Zaten bir takımdasın. Yeni bir takıma katılmak için önce mevcut takımından ayrılmalısın.',
      );
    }

    if (team.players && team.players.length >= 28) {
      throw new ConflictException(
        'Bu takımın kadrosu dolu (maksimum 28 kişi).',
      );
    }

    if (await this.teamBansService.isBanned(teamId, userId)) {
      throw new ForbiddenException(
        'Bu takımdan çıkarıldığın için davet linkiyle tekrar katılamazsın. Takıma katılmak için kaptanın seni tekrar eklemesi gerekir.',
      );
    }

    return this.addPlayer(teamId, userId);
  }

  async removePlayer(
    teamId: string,
    playerId: string,
    requesterId: string,
  ): Promise<Team> {
    const team = await this.findOne(teamId);
    if (!team) throw new NotFoundException('Takım bulunamadı.');

    // Only the captain or a vice-captain can remove players
    const isCaptain = team.captain.id === requesterId;
    const isViceCaptain = team.viceCaptainIds?.includes(requesterId);
    if (!isCaptain && !isViceCaptain) {
      throw new ForbiddenException(
        'Sadece kaptan veya yardımcı kaptan oyuncu atabilir.',
      );
    }

    // Cannot remove captain
    if (team.captain.id === playerId) {
      throw new ForbiddenException('Kaptan takımdan çıkarılamaz.');
    }

    team.players = team.players.filter((p) => p.id !== playerId);

    // If vice captain is removed, remove from viceCaptainIds
    if (team.viceCaptainIds?.includes(playerId)) {
      team.viceCaptainIds = team.viceCaptainIds.filter((id) => id !== playerId);
    }

    const savedTeam = await this.teamsRepository.save(team);

    // Atılan oyuncunun takım bağını ve katılış damgasını kesin olarak temizle
    // (FK User tarafında; OneToMany dizisini süzmek cascade'siz olduğu için tek başına yetmez).
    const removedUser = await this.usersService.findById(playerId);
    if (removedUser) {
      removedUser.team = null;
      removedUser.teamJoinedAt = null;
      await this.usersService['usersRepository'].save(removedUser);
    }

    // Atılan oyuncu, davet linkiyle bu takıma tekrar otomatik katılamasın
    await this.teamBansService.banPlayer(teamId, playerId);

    return savedTeam;
  }

  async updatePlayerRole(
    teamId: string,
    playerId: string,
    role: 'CAPTAIN' | 'VICE',
  ): Promise<Team> {
    const team = await this.findOne(teamId);
    if (!team) throw new NotFoundException('Takım bulunamadı.');

    const player = team.players.find((p) => p.id === playerId);
    if (!player) throw new NotFoundException('Oyuncu takımda bulunamadı.');

    if (role === 'CAPTAIN') {
      // Swap captain; yardımcıyken kaptan yapılan oyuncu hayalet yardımcı
      // slotu işgal etmesin diye viceCaptainIds'ten de düşürülür.
      team.captain = player;
      if (team.viceCaptainIds?.includes(playerId)) {
        team.viceCaptainIds = team.viceCaptainIds.filter(
          (id) => id !== playerId,
        );
      }
    } else if (role === 'VICE') {
      if (!team.viceCaptainIds) team.viceCaptainIds = [];
      // Zaten yardımcıysa idempotent (değişiklik yok); limit doluysa SESSİZCE
      // ATLANMAZ — 409 döner ki client sahte başarı modalı göstermesin.
      if (!team.viceCaptainIds.includes(playerId)) {
        if (team.viceCaptainIds.length >= 2) {
          throw new ConflictException(
            'Bir takımda en fazla 2 yardımcı kaptan olabilir.',
          );
        }
        team.viceCaptainIds.push(playerId);
      }
    }

    // Save dönüşü DEĞİL findOne döndürülür: kaptanlık devrinde save(team)'in
    // döndürdüğü nesnedeki captainId skaleri devir ÖNCESİ değeri taşıyabiliyor
    // (yalnız captain ilişkisi atanıyor). Client bu yanıtı doğrudan
    // currentUserStore'a seed ettiği için yanıt kanonik/taze olmak zorunda.
    await this.teamsRepository.save(team);
    return this.findOne(teamId) as Promise<Team>;
  }

  async updateViceCaptains(
    teamId: string,
    add?: string,
    remove?: string,
  ): Promise<Team> {
    const team = await this.findOne(teamId);
    if (!team) throw new NotFoundException('Takım bulunamadı.');

    if (!team.viceCaptainIds) team.viceCaptainIds = [];

    if (add) {
      // Zaten yardımcıysa idempotent; limit doluysa sessizce atlamak yerine
      // 409 (updatePlayerRole VICE dalıyla parite — sahte başarı önlenir).
      if (!team.viceCaptainIds.includes(add)) {
        if (team.viceCaptainIds.length >= 2) {
          throw new ConflictException(
            'Bir takımda en fazla 2 yardımcı kaptan olabilir.',
          );
        }
        team.viceCaptainIds.push(add);
      }
    }

    if (remove) {
      // Remove vice-captain
      team.viceCaptainIds = team.viceCaptainIds.filter((id) => id !== remove);
    }

    // updatePlayerRole ile aynı gerekçe: yanıt client'a seed edildiği için kanonik olmalı.
    await this.teamsRepository.save(team);
    return this.findOne(teamId) as Promise<Team>;
  }

  async updateHomePitch(teamId: string, homePitchId: string): Promise<Team> {
    const team = await this.findOne(teamId);
    if (!team) throw new NotFoundException('Takım bulunamadı.');

    team.homePitchId = homePitchId;
    // If switching back to pitch, maybe clear business? Or keep both as preference?
    // Let's keep distinct for now.
    return this.teamsRepository.save(team);
  }

  async updateHomeBusiness(
    teamId: string,
    homeBusinessId: string,
  ): Promise<Team> {
    const team = await this.findOne(teamId);
    if (!team) throw new NotFoundException('Takım bulunamadı.');

    team.homeBusinessId = homeBusinessId;
    return this.teamsRepository.save(team);
  }

  async updateDescription(teamId: string, description: string): Promise<Team> {
    const team = await this.findOne(teamId);
    if (!team) throw new NotFoundException('Takım bulunamadı.');

    team.description = description;
    return this.teamsRepository.save(team);
  }

  async updateTeam(
    teamId: string,
    dto: {
      name?: string;
      level?: string;
      logoUrl?: string | null;
      primaryColor?: string;
      secondaryColor?: string;
    },
  ): Promise<Team> {
    const team = await this.findOne(teamId);
    if (!team) throw new NotFoundException('Takım bulunamadı.');

    if (dto.name !== undefined) team.name = dto.name;
    if (dto.level !== undefined) team.level = dto.level;
    if (dto.logoUrl !== undefined) team.logoUrl = dto.logoUrl;
    if (dto.primaryColor !== undefined) team.primaryColor = dto.primaryColor;
    if (dto.secondaryColor !== undefined)
      team.secondaryColor = dto.secondaryColor;

    return this.teamsRepository.save(team);
  }

  async leaveTeam(teamId: string, userId: string): Promise<void> {
    const team = await this.findOne(teamId);
    if (!team) throw new NotFoundException('Takım bulunamadı.');

    const isCaptain = team.captain && team.captain.id === userId;

    // If the captain is leaving and they are the only player, delete the team entirely
    if (isCaptain && team.players && team.players.length === 1) {
      await this.deleteTeam(teamId, userId);
      return;
    }

    if (isCaptain) {
      throw new ForbiddenException(
        'Kaptan takımdan ayrılamaz. Önce kaptanlığı devredin.',
      );
    }

    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    // Remove from vice captains if applicable
    if (team.viceCaptainIds?.includes(userId)) {
      team.viceCaptainIds = team.viceCaptainIds.filter((id) => id !== userId);
      await this.teamsRepository.save(team);
    }

    // Remove teamId from user
    user.team = null;
    // Takımdan ayrılınca katılış damgası da temizlenir (yeniden katılırsa yeniden damgalanır).
    user.teamJoinedAt = null;
    await this.usersService['usersRepository'].save(user);
  }

  async deleteTeam(teamId: string, userId: string): Promise<void> {
    const team = await this.findOne(teamId);
    if (!team) throw new NotFoundException('Takım bulunamadı.');

    const isCaptain =
      (team.captain && team.captain.id === userId) || team.captainId === userId;
    if (!isCaptain)
      throw new ForbiddenException('Sadece kaptan takımı silebilir.');

    // Engel kontrolleri TARİH-BİLİNÇLİ: yalnız GELECEK maçlar silmeyi engeller.
    // Geçmişte kalmış (oynanmış/kaçmış) ama statüsü CONFIRMED/PENDING kalan kayıtlar
    // takımı kilitlemesin ("Mavi şimşekler" vakası — kullanıcı UI'da maç görmüyordu
    // ama geçmiş kayıtlar silmeyi engelliyordu). Sunucu UTC, uygulama TR: gün sınırı
    // toleransı kabul (en fazla ~3 saat geç serbest bırakır, asla erken bırakmaz).
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

    // 1. Kesinleşmiş GELECEK maç kontrolü:
    //    - rakip_araniyor: match_announcement.status = 'CONFIRMED' ve tarihi bugün/ileri
    //    - kendi_aramizda: reservation.status = 'APPROVED' ve slot zamanı ileride
    const confirmedAnnouncementCount =
      await this.matchAnnouncementsRepository.count({
        where: { teamId, status: 'CONFIRMED', date: MoreThanOrEqual(todayStr) },
      });
    const approvedReservationCount = await this.reservationsRepository.count({
      where: [
        {
          teamId,
          status: ReservationStatus.APPROVED,
          slotTime: MoreThan(now),
        },
        {
          opponentTeamId: teamId,
          status: ReservationStatus.APPROVED,
          slotTime: MoreThan(now),
        },
      ],
    });
    const totalConfirmed =
      confirmedAnnouncementCount + approvedReservationCount;
    if (totalConfirmed > 0) {
      throw new HttpException(
        `Bu takımın ${totalConfirmed} adet kesinleşmiş maçı bulunuyor. Kesinleşmiş maçı olan bir takım silinemez.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 2. Onay bekleyen GELECEK maç kontrolü:
    //    - kendi_aramizda: reservation.status = 'PENDING' ve slot zamanı ileride
    const pendingReservationCount = await this.reservationsRepository.count({
      where: [
        { teamId, status: ReservationStatus.PENDING, slotTime: MoreThan(now) },
        {
          opponentTeamId: teamId,
          status: ReservationStatus.PENDING,
          slotTime: MoreThan(now),
        },
      ],
    });
    if (pendingReservationCount > 0) {
      throw new HttpException(
        `Bu takımın ${pendingReservationCount} adet onay bekleyen maçı bulunuyor. Onay aşamasındaki maçlar sonuçlanmadan takım silinemez. Lütfen önce bu maçları iptal edin.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await this.purgeTeam(teamId, team.name);
    } catch (err) {
      // FK ihlali gibi beklenmedik DB hataları 500 olarak sızmasın —
      // kullanıcıya anlamlı Türkçe mesaj dön.
      console.error('purgeTeam failed:', err);
      throw new HttpException(
        'Takım silinirken bağlı kayıtlar nedeniyle bir sorun oluştu. Lütfen tekrar deneyin.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Takım DB'den silindikten SONRA logosunu Cloudinary'den temizle (transaction dışı,
    // referans-sayımlı: aynı görsel başka kayıtta yoksa siler). Hata yutulur — silme
    // başarıyla tamamlandı, foto temizliği best-effort.
    await this.cloudinaryService.safeDestroy(team.logoUrl);
  }

  /**
   * Takıma bağlı TÜM kayıtları koparıp takımı siler — GUARD'SIZ iç temizlik.
   * deleteTeam (guard'lardan sonra) çağırır; hesap silme akışındaki tek üyeli
   * takım temizliği de aynı SQL sırasını uygular (users.service.ts).
   * Tek transaction: yarıda kalırsa hiçbir şey değişmez.
   * FK envanteri: challenges.fromTeamId, join_requests.teamId,
   * match_announcements.team_id, reservation.teamId/opponentTeamId,
   * user.team_id — hiçbirinde CASCADE yok; team_bans CASCADE'li (kendiliğinden).
   * Ayrıca bu takımın maç ilanlarına bağlı chat_channels (MATCH_GROUP/JOKER_NEGOTIATION)
   * ilanlar silinmeden ÖNCE temizlenir (cascade participants+messages) — yoksa öksüz
   * "durumsuz maç" sohbetleri Operasyon Merkezi'nde ölü kalır.
   * teamName: rezervasyon ad-snapshot'ı için (rakip "Bu takım artık mevcut değil"
   * bilgilendirmesi). users.service.ts purgeTeamRaw ile SENKRON TUTULMALI.
   */
  async purgeTeam(teamId: string, teamName: string): Promise<void> {
    await this.teamsRepository.manager.transaction(async (em) => {
      // Meydan okumalar: takımsız anlamsız (toMatchId FK'sı zaten CASCADE)
      await em.query(`DELETE FROM "challenges" WHERE "fromTeamId" = $1`, [
        teamId,
      ]);
      // Katılma istekleri
      await em.query(`DELETE FROM "join_requests" WHERE "teamId" = $1`, [
        teamId,
      ]);
      // Bu takımın maçlarına bağlı sohbet kanalları (maç grubu + joker müzakere) —
      // maç ilanları silinmeden ÖNCE (subquery çözülebilsin diye). relatedMatchId
      // varchar, match_announcements.id uuid → id::text cast şart. chat_channels →
      // participants/messages FK'ları ON DELETE CASCADE olduğundan tek DELETE yeterli.
      await em.query(
        `DELETE FROM "chat_channels"
           WHERE type IN ('MATCH_GROUP','JOKER_NEGOTIATION')
             AND "relatedMatchId" IN (
               SELECT id::text FROM "match_announcements" WHERE "team_id" = $1
             )`,
        [teamId],
      );
      // Maç ilanları: TÜM statüler (geçmiş/iptal dahil) —
      // reservation.matchAnnouncementId FK'sı ON DELETE SET NULL, güvenli
      await em.query(`DELETE FROM "match_announcements" WHERE "team_id" = $1`, [
        teamId,
      ]);
      // Bu takıma verilmiş fair-play değerlendirmeleri artık anlamsız (takım gidiyor)
      await em.query(`DELETE FROM "ratings" WHERE "targetTeamId" = $1`, [
        teamId,
      ]);
      // NULL'lamadan ÖNCE silinen takımın adını snapshot'la (rakip bilgilendirmesi)
      await em.query(
        `UPDATE "reservation" SET "deletedTeamName" = $1
           WHERE ("teamId" = $2 OR "opponentTeamId" = $2) AND "deletedTeamName" IS NULL`,
        [teamName, teamId],
      );
      // Rezervasyon geçmişi işletme takviminde KALIR — yalnız takım bağı koparılır
      await em.query(
        `UPDATE "reservation" SET "teamId" = NULL WHERE "teamId" = $1`,
        [teamId],
      );
      await em.query(
        `UPDATE "reservation" SET "opponentTeamId" = NULL WHERE "opponentTeamId" = $1`,
        [teamId],
      );
      // Üyeleri takımdan çıkar
      await em.query(
        `UPDATE "user" SET "team_id" = NULL WHERE "team_id" = $1`,
        [teamId],
      );
      await em.query(`DELETE FROM "team" WHERE "id" = $1`, [teamId]);
    });
  }
}
