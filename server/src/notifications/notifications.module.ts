import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { Challenge } from '../challenges/challenge.entity';
import { ChatChannel } from '../chat/chat-channel.entity';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TeamsModule } from '../teams/teams.module';
import { GatewayModule } from '../gateway/gateway.module';
import { FirebaseService } from '../firebase/firebase.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Notification,
            Challenge,
            ChatChannel,
            MatchAnnouncement,
            BusinessOwner,
        ]),
        forwardRef(() => TeamsModule),
        GatewayModule,
    ],
    controllers: [NotificationsController],
    providers: [NotificationsService, FirebaseService],
    exports: [NotificationsService],
})
export class NotificationsModule { }
