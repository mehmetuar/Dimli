import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PollsService } from './polls.service';
import type { CreatePollInput } from './polls.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// chat.controller ile aynı 'chat' prefix'i — anket uçları sohbet API'sinin
// doğal uzantısı olarak /chat/... altında yaşar (Nest'te çoklu controller sorunsuz).
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Post('channels/:id/polls')
  createPoll(
    @Param('id') channelId: string,
    @Body() body: CreatePollInput,
    @Request() req: { user: Express.User },
  ) {
    return this.pollsService.createPoll(channelId, req.user.id, body);
  }

  @Get('channels/:id/polls')
  getPollsForChannel(
    @Param('id') channelId: string,
    @Request() req: { user: Express.User },
  ) {
    return this.pollsService.getPollsForChannel(channelId, req.user.id);
  }

  @Post('polls/:pollId/votes')
  vote(
    @Param('pollId') pollId: string,
    @Body('optionIds') optionIds: unknown,
    @Request() req: { user: Express.User },
  ) {
    return this.pollsService.vote(pollId, req.user.id, optionIds);
  }

  @Post('polls/:pollId/close')
  closePoll(
    @Param('pollId') pollId: string,
    @Request() req: { user: Express.User },
  ) {
    return this.pollsService.closePoll(pollId, req.user.id);
  }
}
