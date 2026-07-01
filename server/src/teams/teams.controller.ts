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
  HttpStatus,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../users/user.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { ChatService } from '../chat/chat.service';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('teams')
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly chatService: ChatService,
    private readonly notificationsService: NotificationsService,
  ) {}

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
      console.error('🔥 TEAM CREATION ERROR 🔥', error);
      const err = error as {
        message?: string;
        detail?: string;
        stack?: string;
      };
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: err.message,
          detail: err.detail,
          stack: err.stack,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
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
  addPlayer(@Param('id') id: string, @Body('userId') userId: string) {
    return this.teamsService.addPlayer(id, userId);
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
  updatePlayerRole(
    @Param('id') id: string,
    @Param('playerId') playerId: string,
    @Body('role') role: 'CAPTAIN' | 'VICE',
  ) {
    return this.teamsService.updatePlayerRole(id, playerId, role);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/vice-captains')
  updateViceCaptains(
    @Param('id') id: string,
    @Body() dto: { add?: string; remove?: string },
  ) {
    return this.teamsService.updateViceCaptains(id, dto.add, dto.remove);
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
  updateTeam(
    @Param('id') id: string,
    @Body()
    dto: {
      name?: string;
      level?: string;
      logoUrl?: string | null;
      primaryColor?: string;
      secondaryColor?: string;
    },
  ) {
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
  deleteTeam(@Param('id') id: string, @Request() req: { user: Express.User }) {
    return this.teamsService.deleteTeam(id, req.user.id);
  }
}
