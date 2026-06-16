import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('channels')
  getUserChannels(@Request() req: { user: Express.User }) {
    return this.chatService.getUserChannels(req.user.id);
  }

  @Get('channels/:id/messages')
  getChannelMessages(
    @Param('id') id: string,
    @Request() req: { user: Express.User },
    @Query('before') before?: string,
    @Query('limit') limit = 50,
  ) {
    return this.chatService.getChannelMessages(
      id,
      req.user.id,
      before,
      Number(limit),
    );
  }

  @Post('channels/:id/messages')
  sendMessage(
    @Param('id') id: string,
    @Body('content') content: string,
    @Request() req: { user: Express.User },
  ) {
    return this.chatService.sendMessage(id, req.user.id, content);
  }

  @Post('channels/:id/read')
  markAsRead(@Param('id') id: string, @Request() req: { user: Express.User }) {
    return this.chatService.markAsRead(id, req.user.id);
  }

  @Get('channels/:id/match-details')
  getChannelMatchDetails(@Param('id') id: string) {
    return this.chatService.getChannelMatchDetails(id);
  }

  @Get('unread-count')
  getUnreadCount(@Request() req: { user: Express.User }) {
    return this.chatService.getUnreadCount(req.user.id);
  }

  @Delete('channels/:id')
  deleteChannel(
    @Param('id') id: string,
    @Request() req: { user: Express.User },
  ) {
    return this.chatService.deleteChannel(id, req.user.id);
  }

  @Post('channels/:id/rematch-proposal')
  createRematchProposal(
    @Param('id') channelId: string,
    @Body()
    body: { pitchId: string; date: string; time: string; playerCount: number },
    @Request() req: { user: Express.User },
  ) {
    return this.chatService.createRematchProposal(channelId, req.user.id, body);
  }

  @Post('channels/:id/accept-rematch')
  acceptRematchProposal(
    @Param('id') channelId: string,
    @Body() body: { matchAnnouncementId: string },
    @Request() req: { user: Express.User },
  ) {
    return this.chatService.acceptRematchProposal(channelId, req.user.id, body);
  }

  @Post('joker-negotiation')
  createJokerNegotiation(
    @Body()
    body: { matchId: string; inviterId: string; notificationId: string },
    @Request() req: { user: Express.User },
  ) {
    return this.chatService.createJokerNegotiation(req.user.id, body);
  }

  @Post('channels/:id/invite-joker')
  inviteJokerToMatchGroup(
    @Param('id') channelId: string,
    @Request() req: { user: Express.User },
  ) {
    return this.chatService.inviteJokerToMatchGroup(channelId, req.user.id);
  }

  @Get('channels/:id/jokers')
  getJokersInChannel(
    @Param('id') channelId: string,
    @Request() req: { user: Express.User },
  ) {
    return this.chatService.getJokersInChannel(channelId, req.user.id);
  }

  @Delete('channels/:id/jokers/:jokerId')
  removeJokerFromChannel(
    @Param('id') channelId: string,
    @Param('jokerId') jokerId: string,
    @Request() req: { user: Express.User },
  ) {
    return this.chatService.removeJokerFromChannel(
      channelId,
      jokerId,
      req.user.id,
    );
  }
}
