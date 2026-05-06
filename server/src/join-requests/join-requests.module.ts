import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JoinRequest } from './join-request.entity';
import { JoinRequestsService } from './join-requests.service';
import { JoinRequestsController } from './join-requests.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { TeamsModule } from '../teams/teams.module';
import { ChatModule } from '../chat/chat.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([JoinRequest]),
        forwardRef(() => NotificationsModule),
        forwardRef(() => TeamsModule),
        forwardRef(() => ChatModule),
    ],
    controllers: [JoinRequestsController],
    providers: [JoinRequestsService],
    exports: [JoinRequestsService],
})
export class JoinRequestsModule { }
