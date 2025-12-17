import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { Challenge } from '../challenges/challenge.entity';
import { ChatChannel } from '../chat/chat-channel.entity';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TeamsModule } from '../teams/teams.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Notification,
            Challenge,
            ChatChannel,
            MatchAnnouncement
        ]),
        forwardRef(() => TeamsModule),
    ],
    controllers: [NotificationsController],
    providers: [NotificationsService],
    exports: [NotificationsService],
})
export class NotificationsModule { }
