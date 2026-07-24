import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { JoinRequestsService } from './join-requests.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamsService } from '../teams/teams.service';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('join-requests')
export class JoinRequestsController {
  constructor(
    private readonly joinRequestsService: JoinRequestsService,
    private readonly teamsService: TeamsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() dto: { teamId: string; message?: string },
    @Request() req: { user: Express.User },
  ) {
    return this.joinRequestsService.create(
      req.user.id,
      dto.teamId,
      dto.message,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-pending')
  async getMyPending(@Request() req: { user: Express.User }) {
    return this.joinRequestsService.findPendingByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('team/:teamId')
  async getByTeam(
    @Param('teamId') teamId: string,
    @Request() req: { user: Express.User },
  ) {
    // GÜVENLİK: yalnız takımın kaptanı/yardımcı kaptanı başvuranları görebilir
    // (accept/reject ile aynı yetki deseni) — eskiden herhangi bir kullanıcı
    // herhangi bir takımın başvuranlarını (tam User + PII) listeleyebiliyordu.
    const team = await this.teamsService.findOne(teamId);
    const isLeader =
      !!team &&
      (team.captainId === req.user.id ||
        (team.viceCaptainIds || []).includes(req.user.id));
    if (!isLeader) {
      throw new ForbiddenException(
        'Katılma isteklerini yalnızca takım kaptanı veya yardımcı kaptanı görüntüleyebilir.',
      );
    }
    return this.joinRequestsService.findByTeam(teamId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/accept')
  async accept(
    @Param('id') id: string,
    @Request() req: { user: Express.User },
  ) {
    const joinRequest = await this.joinRequestsService.findById(id);

    // Yalnızca kaptan veya yardımcı kaptan kabul edebilir
    const team = await this.teamsService.findOne(joinRequest.teamId);
    const isLeader =
      !!team &&
      (team.captainId === req.user.id ||
        (team.viceCaptainIds || []).includes(req.user.id));
    if (!isLeader) {
      throw new ForbiddenException(
        'Katılma isteğini yalnızca takım kaptanı veya yardımcı kaptanı kabul edebilir.',
      );
    }

    // Chat kanal senkronu artık TeamsService.addPlayer içinde (tüm katılım
    // yolları için tek nokta) — burada ayrıca çağrılmaz.
    await this.teamsService.addPlayer(joinRequest.teamId, joinRequest.userId);
    await this.joinRequestsService.cancelAllPendingExcept(
      joinRequest.userId,
      id,
    );
    await this.notificationsService.createJoinRequestAcceptedNotification(
      id,
      joinRequest.userId,
      joinRequest.teamId,
    );
    return this.joinRequestsService.updateStatus(id, 'ACCEPTED');
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @Request() req: { user: Express.User },
  ) {
    const joinRequest = await this.joinRequestsService.findById(id);

    // Yalnızca kaptan veya yardımcı kaptan reddedebilir
    const team = await this.teamsService.findOne(joinRequest.teamId);
    const isLeader =
      !!team &&
      (team.captainId === req.user.id ||
        (team.viceCaptainIds || []).includes(req.user.id));
    if (!isLeader) {
      throw new ForbiddenException(
        'Katılma isteğini yalnızca takım kaptanı veya yardımcı kaptanı reddedebilir.',
      );
    }

    return this.joinRequestsService.updateStatus(id, 'REJECTED');
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Request() req: { user: Express.User },
  ) {
    return this.joinRequestsService.cancelRequest(id, req.user.id);
  }
}
