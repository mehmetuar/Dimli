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
import { FilesModule } from '../files/files.module';
import { GatewayModule } from '../gateway/gateway.module';
import { FirebaseService } from '../firebase/firebase.service';

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
    FilesModule,
    // Kaptanlık devri bildirimi (notifyNewCaptain) için socket + push.
    // NotificationsModule DEĞİL: Users→Notifications→Teams→Users döngüsü olurdu;
    // GatewayModule ve FirebaseService bağımsız → döngü yok.
    GatewayModule,
  ],
  providers: [UsersService, FirebaseService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
