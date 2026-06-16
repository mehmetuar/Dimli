import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from './challenge.entity';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';
import { ChallengesService } from './challenges.service';
import { ChallengesController } from './challenges.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { MatchAnnouncementsModule } from '../match-announcements/match-announcements.module';
import { TeamsModule } from '../teams/teams.module';
import { ChatModule } from '../chat/chat.module';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Challenge, MatchAnnouncement]),
    NotificationsModule,
    MatchAnnouncementsModule,
    TeamsModule,
    ChatModule,
    ReservationsModule,
  ],
  controllers: [ChallengesController],
  providers: [ChallengesService],
  exports: [ChallengesService],
})
export class ChallengesModule {}
