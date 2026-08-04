import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Poll } from './poll.entity';
import { PollOption } from './poll-option.entity';
import { PollVote } from './poll-vote.entity';
import { ChatParticipant } from '../chat/chat-participant.entity';
import { ChatChannel } from '../chat/chat-channel.entity';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { User } from '../users/user.entity';
import { PollsService } from './polls.service';
import { PollsController } from './polls.controller';
import { ChatModule } from '../chat/chat.module';
import { GatewayModule } from '../gateway/gateway.module';

// Bağımlılık tek yönlü (polls → chat) — forwardRef gerekmez.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Poll,
      PollOption,
      PollVote,
      ChatParticipant,
      ChatChannel,
      MatchAnnouncement,
      Reservation,
      User,
    ]),
    ChatModule,
    GatewayModule,
  ],
  controllers: [PollsController],
  providers: [PollsService],
  exports: [PollsService],
})
export class PollsModule {}
