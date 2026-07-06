import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
  Request,
  Post,
  Body,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAll(@Request() req: { user: Express.User }) {
    return this.notificationsService.findByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('unread-count')
  async getUnreadCount(@Request() req: { user: Express.User }) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.notificationsService.delete(id);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('joker-invite')
  async sendJokerInvite(
    @Request() req: { user: Express.User },
    @Body() body: { jokerId: string; matchId: string; note?: string },
  ) {
    return this.notificationsService.sendJokerInvite(
      body.jokerId,
      body.matchId,
      req.user.id,
      body.note,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('sent-joker-invites/:jokerId')
  async getSentJokerInvites(
    @Request() req: { user: Express.User },
    @Param('jokerId') jokerId: string,
  ) {
    return this.notificationsService.getSentJokerInvites(req.user.id, jokerId);
  }

  // Takım İstekleri ekranı — takımın gelecek maçları için maç-bazlı joker daveti listesi
  // (bekleyen + katılmış). Görüntüleme tüm üyelere açık; iptal cancelJokerInvite'ta yetkilendirilir.
  @UseGuards(JwtAuthGuard)
  @Get('joker-invites/team/:teamId')
  async getTeamJokerInvites(@Param('teamId') teamId: string) {
    return this.notificationsService.getTeamJokerInvites(teamId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('joker-invite/:jokerId/:matchId')
  async cancelJokerInvite(
    @Request() req: { user: Express.User },
    @Param('jokerId') jokerId: string,
    @Param('matchId') matchId: string,
  ) {
    await this.notificationsService.cancelJokerInvite(
      req.user.id,
      jokerId,
      matchId,
    );
    return { success: true };
  }
}
