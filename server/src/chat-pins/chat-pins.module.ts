import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PinnedMessage } from './pinned-message.entity';
import { ChatParticipant } from '../chat/chat-participant.entity';
import { ChatChannel } from '../chat/chat-channel.entity';
import { ChatMessage } from '../chat/chat-message.entity';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { RecurringClosure } from '../reservations/entities/recurring-closure.entity';
import { User } from '../users/user.entity';
import { ChatPinsService } from './chat-pins.service';
import { ChatPinsController } from './chat-pins.controller';
import { ChatModule } from '../chat/chat.module';
import { GatewayModule } from '../gateway/gateway.module';

// Bağımlılık tek yönlü (chat-pins → chat) — forwardRef gerekmez (polls emsali).
@Module({
  imports: [
    TypeOrmModule.forFeature([
      PinnedMessage,
      ChatParticipant,
      ChatChannel,
      ChatMessage,
      MatchAnnouncement,
      Reservation,
      RecurringClosure,
      User,
    ]),
    ChatModule,
    GatewayModule,
  ],
  controllers: [ChatPinsController],
  providers: [ChatPinsService],
  exports: [ChatPinsService],
})
export class ChatPinsModule {}
