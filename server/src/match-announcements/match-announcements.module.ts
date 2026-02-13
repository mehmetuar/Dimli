import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchAnnouncement } from './match-announcement.entity';
import { User } from '../users/user.entity';
import { MatchAnnouncementsService } from './match-announcements.service';
import { MatchAnnouncementsController } from './match-announcements.controller';

import { NotificationsModule } from '../notifications/notifications.module';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
    imports: [TypeOrmModule.forFeature([MatchAnnouncement, User]), NotificationsModule, ReservationsModule],
    controllers: [MatchAnnouncementsController],
    providers: [MatchAnnouncementsService],
    exports: [MatchAnnouncementsService],
})
export class MatchAnnouncementsModule { }
