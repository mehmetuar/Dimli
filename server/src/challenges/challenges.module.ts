import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from './challenge.entity';
import { ChallengesService } from './challenges.service';
import { ChallengesController } from './challenges.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { MatchAnnouncementsModule } from '../match-announcements/match-announcements.module';
import { TeamsModule } from '../teams/teams.module';
import { ChatModule } from '../chat/chat.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Challenge]),
        NotificationsModule,
        MatchAnnouncementsModule,
        TeamsModule,
        ChatModule
    ],
    controllers: [ChallengesController],
    providers: [ChallengesService],
    exports: [ChallengesService],
})
export class ChallengesModule { }
