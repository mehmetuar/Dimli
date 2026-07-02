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
import { Repository } from 'typeorm';
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
    if (!managedUser) throw new Error('User not found');

    // Preempt the TypeORM duplicate key unique constraint on OneToOne
    const existingLedTeam = await this.teamsRepository.findOne({
      where: { captainId: managedUser.id },
    });
    if (existingLedTeam) {
      throw new Error(
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
    await this.usersService['usersRepository'].save(managedUser);

    // Return the full team with relations
    return this.findOne(savedTeam.id) as Promise<Team>;
  }

  async findAll(): Promise<Team[]> {
    const teams = await this.teamsRepository.find({ relations: ['captain'] });

    // For each team, manually load players using query builder
    for (const team of teams) {
      team.players = await this.usersService['usersRepository']
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.team', 'team')
        .where('team.id = :teamId', { teamId: team.id })
        .getMany();
    }

    return teams;
  }

  async searchByTerm(term: string): Promise<any[]> {
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
        return { ...team, playedMatchCount };
      }),
    );

    return results;
  }

  async findOne(id: string): Promise<Team | null> {
    const team = await this.teamsRepository.findOne({
      where: { id },
      relations: ['captain', 'players'],
    });

    if (!team) return null;

    // Manually load players using query builder to find all users with this team
    const players = await this.usersService['usersRepository']
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.team', 'team')
      .where('team.id = :teamId', { teamId: team.id })
      .getMany();

    console.log(
      `🔍 DEBUG: Found ${players.length} players for team ${team.name}`,
    );

    // Map User entity to Player interface structure
    team.players = players.map((user) => ({
      ...user,
      id: user.id,
      name: user.full_name || user.username, // vital mapping
      position: user.position,
      avatarUrl:
        user.avatarUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=random`,
      rating: user.rating,
      teamId: team.id,
    }));

    const playedMatchCount = await this.ratingsService.getTeamMatchCount(
      team.id,
    );
    return { ...team, playedMatchCount } as any;
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
    if (!team) throw new Error('Team not found');

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
      throw new Error('Cannot remove captain from the team');
    }

    team.players = team.players.filter((p) => p.id !== playerId);

    // If vice captain is removed, remove from viceCaptainIds
    if (team.viceCaptainIds?.includes(playerId)) {
      team.viceCaptainIds = team.viceCaptainIds.filter((id) => id !== playerId);
    }

    const savedTeam = await this.teamsRepository.save(team);

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
    if (!team) throw new Error('Team not found');

    const player = team.players.find((p) => p.id === playerId);
    if (!player) throw new Error('Player not found in team');

    if (role === 'CAPTAIN') {
      // Swap captain
      team.captain = player;
    } else if (role === 'VICE') {
      // Add to viceCaptainIds if not already present (max 2)
      if (!team.viceCaptainIds) team.viceCaptainIds = [];
      if (
        !team.viceCaptainIds.includes(playerId) &&
        team.viceCaptainIds.length < 2
      ) {
        team.viceCaptainIds.push(playerId);
      }
    }

    return this.teamsRepository.save(team);
  }

  async updateViceCaptains(
    teamId: string,
    add?: string,
    remove?: string,
  ): Promise<Team> {
    const team = await this.findOne(teamId);
    if (!team) throw new Error('Team not found');

    if (!team.viceCaptainIds) team.viceCaptainIds = [];

    if (add) {
      // Add vice-captain (max 2)
      if (
        !team.viceCaptainIds.includes(add) &&
        team.viceCaptainIds.length < 2
      ) {
        team.viceCaptainIds.push(add);
      }
    }

    if (remove) {
      // Remove vice-captain
      team.viceCaptainIds = team.viceCaptainIds.filter((id) => id !== remove);
    }

    return this.teamsRepository.save(team);
  }

  async updateHomePitch(teamId: string, homePitchId: string): Promise<Team> {
    const team = await this.findOne(teamId);
    if (!team) throw new Error('Team not found');

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
    if (!team) throw new Error('Team not found');

    team.homeBusinessId = homeBusinessId;
    return this.teamsRepository.save(team);
  }

  async updateDescription(teamId: string, description: string): Promise<Team> {
    const team = await this.findOne(teamId);
    if (!team) throw new Error('Team not found');

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
    if (!team) throw new Error('Team not found');

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
    if (!team) throw new Error('Team not found');

    const isCaptain = team.captain && team.captain.id === userId;

    // If the captain is leaving and they are the only player, delete the team entirely
    if (isCaptain && team.players && team.players.length === 1) {
      await this.deleteTeam(teamId, userId);
      return;
    }

    if (isCaptain) {
      throw new Error('Kaptan takımdan ayrılamaz. Önce kaptanlığı devredin.');
    }

    const user = await this.usersService.findById(userId);
    if (!user) throw new Error('User not found');

    // Remove from vice captains if applicable
    if (team.viceCaptainIds?.includes(userId)) {
      team.viceCaptainIds = team.viceCaptainIds.filter((id) => id !== userId);
      await this.teamsRepository.save(team);
    }

    // Remove teamId from user
    user.team = null as any;
    await this.usersService['usersRepository'].save(user);
  }

  async deleteTeam(teamId: string, userId: string): Promise<void> {
    const team = await this.findOne(teamId);
    if (!team) throw new Error('Team not found');

    const isCaptain =
      (team.captain && team.captain.id === userId) || team.captainId === userId;
    if (!isCaptain) throw new Error('Sadece kaptan takımı silebilir.');

    // 1. Kesinleşmiş maç kontrolü:
    //    - rakip_araniyor: match_announcement.status = 'CONFIRMED'
    //    - kendi_aramizda: reservation.status = 'APPROVED'
    const confirmedAnnouncementCount =
      await this.matchAnnouncementsRepository.count({
        where: { teamId, status: 'CONFIRMED' },
      });
    const approvedReservationCount = await this.reservationsRepository.count({
      where: [
        { teamId, status: ReservationStatus.APPROVED },
        { opponentTeamId: teamId, status: ReservationStatus.APPROVED },
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

    // 2. Onay bekleyen maç kontrolü:
    //    - kendi_aramizda: reservation.status = 'PENDING'
    const pendingReservationCount = await this.reservationsRepository.count({
      where: [
        { teamId, status: ReservationStatus.PENDING },
        { opponentTeamId: teamId, status: ReservationStatus.PENDING },
      ],
    });
    if (pendingReservationCount > 0) {
      throw new HttpException(
        `Bu takımın ${pendingReservationCount} adet onay bekleyen maçı bulunuyor. Onay aşamasındaki maçlar sonuçlanmadan takım silinemez. Lütfen önce bu maçları iptal edin.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Aktif "Rakip Aranıyor" ilanlarını otomatik sil
    await this.matchAnnouncementsRepository.delete({
      teamId,
      matchType: 'rakip_araniyor',
      status: 'PENDING',
    });

    if (team.players && team.players.length > 0) {
      for (const player of team.players) {
        player.team = null as any;
        await this.usersService['usersRepository'].save(player);
      }
    }

    await this.teamsRepository.delete(teamId);
  }
}
