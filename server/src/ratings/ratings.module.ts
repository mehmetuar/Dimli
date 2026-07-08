import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';
import { Rating } from './rating.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Business } from '../business/entities/business.entity';
import { Team } from '../teams/team.entity';
import { User } from '../users/user.entity';
import { ChatChannel } from '../chat/chat-channel.entity';
import { ChatParticipant } from '../chat/chat-participant.entity';
import { ChatMessage } from '../chat/chat-message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Rating,
      Reservation,
      Business,
      Team,
      User,
      ChatChannel,
      ChatParticipant,
      ChatMessage,
    ]),
  ],
  controllers: [RatingsController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
