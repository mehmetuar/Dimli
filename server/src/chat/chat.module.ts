import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatChannel } from './chat-channel.entity';
import { ChatMessage } from './chat-message.entity';
import { ChatParticipant } from './chat-participant.entity';
import { User } from '../users/user.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';
import { Team } from '../teams/team.entity';
import { Pitch } from '../pitches/entities/pitch.entity';
import { Challenge } from '../challenges/challenge.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { TeamsModule } from '../teams/teams.module';
import { RatingsModule } from '../ratings/ratings.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ChatChannel,
            ChatMessage,
            ChatParticipant,
            User,
            Reservation,
            MatchAnnouncement,
            Team,
            Pitch,
            Challenge,
        ]),
        forwardRef(() => NotificationsModule),
        forwardRef(() => ReservationsModule),
        forwardRef(() => TeamsModule),
        RatingsModule,
    ],
    controllers: [ChatController],
    providers: [ChatService],
    exports: [ChatService]
})
export class ChatModule { }
