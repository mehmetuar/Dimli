import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { ReservationSupportService } from './services/reservation-support.service';
import { ReservationQueryService } from './services/reservation-query.service';
import { ReservationLifecycleService } from './services/reservation-lifecycle.service';
import { ReservationProposalService } from './services/reservation-proposal.service';
import { ReservationRecurringService } from './services/reservation-recurring.service';
import { Reservation } from './entities/reservation.entity';
import { RecurringClosure } from './entities/recurring-closure.entity';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ChatChannel } from '../chat/chat-channel.entity';
import { ChatParticipant } from '../chat/chat-participant.entity';
import { Pitch } from '../pitches/entities/pitch.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reservation,
      RecurringClosure,
      ChatChannel,
      ChatParticipant,
      Pitch,
      BusinessOwner,
      MatchAnnouncement,
      User,
    ]),
    ChatModule,
    NotificationsModule,
    SubscriptionModule,
  ],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    ReservationSupportService,
    ReservationQueryService,
    ReservationLifecycleService,
    ReservationProposalService,
    ReservationRecurringService,
  ],
  exports: [ReservationsService],
})
export class ReservationsModule {}
