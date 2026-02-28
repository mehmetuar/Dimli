import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { Reservation } from './entities/reservation.entity';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatChannel } from '../chat/chat-channel.entity';
import { Pitch } from '../pitches/entities/pitch.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Reservation, ChatChannel, Pitch, BusinessOwner, MatchAnnouncement]),
        ChatModule,
        NotificationsModule
    ],
    controllers: [ReservationsController],
    providers: [ReservationsService],
    exports: [ReservationsService],
})
export class ReservationsModule { }
