import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatChannel } from './chat-channel.entity';
import { ChatMessage } from './chat-message.entity';
import { ChatParticipant } from './chat-participant.entity';
import { User } from '../users/user.entity';
import { Reservation } from '../reservations/entities/reservation.entity'; // Assuming user.entity

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ChatChannel,
            ChatMessage,
            ChatParticipant,
            User,
            Reservation // Add Reservation entity here
        ]),
    ],
    controllers: [ChatController],
    providers: [ChatService],
    exports: [ChatService]
})
export class ChatModule { }
