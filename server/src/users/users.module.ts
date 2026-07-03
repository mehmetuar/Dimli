import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';
import { AccountDeletion } from '../account-deletions/account-deletion.entity';
import { JoinRequest } from '../join-requests/join-request.entity';
import { Notification } from '../notifications/notification.entity';
import { Team } from '../teams/team.entity';
import { GeoModule } from '../geo/geo.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      AccountDeletion,
      JoinRequest,
      Notification,
      Team,
    ]),
    GeoModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
