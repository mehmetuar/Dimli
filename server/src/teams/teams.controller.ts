import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Delete,
  Patch,
  HttpException,
  InternalServerErrorException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/user.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { ChatService } from '../chat/chat.service';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('teams')
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly chatService: ChatService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Requester'ın takımda yönetici yetkisi olduğunu doğrula.
  // viceAllowed=false → yalnız kaptan (rol değişiklikleri); true → kaptan veya yardımcı.
  // Servis metodları requester almadığından (addPlayer/updatePlayerRole/updateViceCaptains)
  // yetki kontrolü burada yapılır — UI zaten kapılı, bu guard yetkisiz RAW istekleri keser.
  private async assertTeamManager(
    teamId: string,
    requesterId: string,
    viceAllowed: boolean,
  ): Promise<void> {
    const team = await this.teamsService.findOne(teamId);
    if (!team) throw new NotFoundException('Takım bulunamadı.');
    const isCaptain =
      (team.captain && team.captain.id === requesterId) ||
      team.captainId === requesterId;
    const isVice = !!team.viceCaptainIds?.includes(requesterId);
    if (!(isCaptain || (viceAllowed && isVice))) {
      throw new ForbiddenException('Bu işlem için yetkiniz yok.');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() createTeamDto: CreateTeamDto,
    @Request() req: { user: Express.User },
  ) {
    try {
      return await this.teamsService.create(
        createTeamDto,
        req.user as unknown as User,
      );
    } catch (error: unknown) {
      // Türkçe HttpException'ları (ör. 'Zaten bir takımın kaptanısınız...') olduğu gibi ilet;
      // beklenmeyen hatada ham/İngilizce metin veya stack SIZDIRMA → Türkçe genel mesaj.
      if (error instanceof HttpException) throw error;
      console.error('🔥 TEAM CREATION ERROR 🔥', error);
      throw new InternalServerErrorException(
        'Takım oluşturulamadı. Lütfen tekrar deneyin.',
      );
    }
  }

  @Get()
  findAll() {
    return this.teamsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Get('search/:term')
  searchByTerm(@Param('term') term: string) {
    return this.teamsService.searchByTerm(term);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/players')
  async addPlayer(
    @Param('id') id: string,
    @Body('userId') userId: string,
    @Request() req: { user: Express.User },
  ) {
    await this.assertTeamManager(id, req.user.id, true);
    const team = await this.teamsService.addPlayer(id, userId);
    // Eklenen oyuncuya haber ver — client'ın global team-event dinleyicisi
    // currentUserStore'u tazeler. Best-effort: bildirim hatası eklemeyi düşürmez.
    // (Katılım isteği kabul yolu servisi DOĞRUDAN çağırır ve kendi
    // JOIN_REQUEST_ACCEPTED bildirimini gönderir — çifte bildirim olmaz.)
    void this.notificationsService
      .createPlayerAddedNotification(id, userId)
      .catch(() => {});
    return team;
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join-via-invite')
  joinViaInvite(
    @Param('id') id: string,
    @Request() req: { user: Express.User },
  ) {
    return this.teamsService.joinTeamViaInvite(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/players/:playerId')
  async removePlayer(
    @Param('id') id: string,
    @Param('playerId') playerId: string,
    @Request() req: { user: Express.User },
  ) {
    const result = await this.teamsService.removePlayer(
      id,
      playerId,
      req.user.id,
    );
    await this.chatService.removeUserFromTeamActiveMatchChannels(playerId, id);
    await this.notificationsService.createPlayerRemovedNotification(
      id,
      playerId,
    );
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/players/:playerId/role')
  async updatePlayerRole(
    @Param('id') id: string,
    @Param('playerId') playerId: string,
    @Body('role') role: 'CAPTAIN' | 'VICE',
    @Request() req: { user: Express.User },
  ) {
    // Rol değişikliği (kaptanlık devri dahil) yalnız kaptanın yetkisi.
    await this.assertTeamManager(id, req.user.id, false);
    const team = await this.teamsService.updatePlayerRole(id, playerId, role);
    void this.notificationsService
      .createRoleChangedNotification(id, playerId, role)
      .catch(() => {});
    return team;
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/vice-captains')
  async updateViceCaptains(
    @Param('id') id: string,
    @Body() dto: { add?: string; remove?: string },
    @Request() req: { user: Express.User },
  ) {
    await this.assertTeamManager(id, req.user.id, false);
    const team = await this.teamsService.updateViceCaptains(
      id,
      dto.add,
      dto.remove,
    );
    if (dto.add) {
      void this.notificationsService
        .createRoleChangedNotification(id, dto.add, 'VICE')
        .catch(() => {});
    }
    if (dto.remove) {
      void this.notificationsService
        .createRoleChangedNotification(id, dto.remove, 'MEMBER')
        .catch(() => {});
    }
    return team;
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/home-pitch')
  updateHomePitch(
    @Param('id') id: string,
    @Body('homePitchId') homePitchId: string,
  ) {
    return this.teamsService.updateHomePitch(id, homePitchId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/home-business')
  updateHomeBusiness(
    @Param('id') id: string,
    @Body('homeBusinessId') homeBusinessId: string,
  ) {
    return this.teamsService.updateHomeBusiness(id, homeBusinessId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/description')
  updateDescription(
    @Param('id') id: string,
    @Body('description') description: string,
  ) {
    return this.teamsService.updateDescription(id, description);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  updateTeam(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teamsService.updateTeam(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/leave')
  async leaveTeam(
    @Param('id') id: string,
    @Request() req: { user: Express.User },
  ) {
    const result = await this.teamsService.leaveTeam(id, req.user.id);
    await this.chatService.removeUserFromTeamActiveMatchChannels(
      req.user.id,
      id,
    );
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteTeam(
    @Param('id') id: string,
    @Request() req: { user: Express.User },
  ) {
    // Silmeden ÖNCE ad + üye listesi yakalanır (silme sonrası findOne null döner).
    // Kaptan guard'ı serviste ('Sadece kaptan takımı silebilir') — burada tekrar yok.
    const team = await this.teamsService.findOne(id);
    const teamName = team?.name;
    const memberIds = (team?.players ?? [])
      .map((p) => p.id)
      .filter((pid) => pid !== req.user.id);
    const result = await this.teamsService.deleteTeam(id, req.user.id);
    // Kalan üyelere haber ver (client tek-üyeli takımda sunar → liste çoğunlukla boş;
    // raw API ile çok-üyeli silme de kapsanır). Best-effort.
    if (teamName && memberIds.length > 0) {
      void this.notificationsService
        .createTeamDeletedNotification(teamName, memberIds)
        .catch(() => {});
    }
    return result;
  }
}
