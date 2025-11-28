import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { TeamsModule } from '../teams/teams.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Notification]),
        forwardRef(() => TeamsModule),
    ],
    controllers: [NotificationsController],
    providers: [NotificationsService],
    exports: [NotificationsService],
})
export class NotificationsModule { }
