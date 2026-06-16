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
} from '@nestjs/common';
import { JoinRequestsService } from './join-requests.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TeamsService } from '../teams/teams.service';
import { ChatService } from '../chat/chat.service';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('join-requests')
export class JoinRequestsController {
  constructor(
    private readonly joinRequestsService: JoinRequestsService,
    private readonly teamsService: TeamsService,
    private readonly chatService: ChatService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() dto: { teamId: string; message?: string },
    @Request() req,
  ) {
    return this.joinRequestsService.create(
      req.user.id,
      dto.teamId,
      dto.message,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-pending')
  async getMyPending(@Request() req) {
    return this.joinRequestsService.findPendingByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('team/:teamId')
  async getByTeam(@Param('teamId') teamId: string) {
    return this.joinRequestsService.findByTeam(teamId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/accept')
  async accept(@Param('id') id: string, @Request() req) {
    const joinRequest = await this.joinRequestsService.findById(id);
    await this.teamsService.addPlayer(joinRequest.teamId, joinRequest.userId);
    await this.chatService.addUserToTeamActiveMatchChannels(
      joinRequest.userId,
      joinRequest.teamId,
    );
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
  async reject(@Param('id') id: string) {
    return this.joinRequestsService.updateStatus(id, 'REJECTED');
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id/cancel')
  async cancel(@Param('id') id: string, @Request() req) {
    return this.joinRequestsService.cancelRequest(id, req.user.id);
  }
}
