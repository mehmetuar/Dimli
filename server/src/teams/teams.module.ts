import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './team.entity';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { UsersModule } from '../users/users.module';
import { RatingsModule } from '../ratings/ratings.module';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { JoinRequestsModule } from '../join-requests/join-requests.module';
import { TeamBansModule } from '../team-bans/team-bans.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, MatchAnnouncement, Reservation]),
    UsersModule,
    RatingsModule,
    forwardRef(() => ChatModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => JoinRequestsModule),
    TeamBansModule,
    FilesModule,
  ],
  providers: [TeamsService],
  controllers: [TeamsController],
  exports: [TeamsService],
})
export class TeamsModule {}
