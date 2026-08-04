import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ChatPinsService } from './chat-pins.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// chat.controller ile aynı 'chat' prefix'i (polls emsali). Mutasyonlar tam
// PinView listesini döner — client socket yankısını beklemeden replace eder.
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatPinsController {
  constructor(private readonly chatPinsService: ChatPinsService) {}

  @Post('channels/:id/pins')
  pin(
    @Param('id') channelId: string,
    @Body('messageId') messageId: unknown,
    @Request() req: { user: Express.User },
  ) {
    return this.chatPinsService.pin(channelId, req.user.id, messageId);
  }

  @Delete('channels/:id/pins')
  unpin(
    @Param('id') channelId: string,
    @Request() req: { user: Express.User },
  ) {
    return this.chatPinsService.unpin(channelId, req.user.id);
  }

  @Get('channels/:id/pins')
  getPins(
    @Param('id') channelId: string,
    @Request() req: { user: Express.User },
  ) {
    return this.chatPinsService.getPins(channelId, req.user.id);
  }
}
