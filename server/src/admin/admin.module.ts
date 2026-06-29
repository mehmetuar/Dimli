import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminJwtStrategy } from './admin-jwt.strategy';
import { AdminUser } from './entities/admin-user.entity';
import { Business } from '../business/entities/business.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { Subscription } from '../subscription/entities/subscription.entity';
import { Pitch } from '../pitches/entities/pitch.entity';
import { TimeSlot } from '../pitches/entities/time-slot.entity';
import { PitchChangeRequest } from '../pitches/entities/pitch-change-request.entity';
import { Notification } from '../notifications/notification.entity';
import { AccountDeletion } from '../account-deletions/account-deletion.entity';
import { User } from '../users/user.entity';
import { UserReport } from '../user-reports/user-report.entity';
import { FacilitiesModule } from '../facilities/facilities.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([
      AdminUser,
      Business,
      BusinessOwner,
      Subscription,
      Pitch,
      TimeSlot,
      PitchChangeRequest,
      Notification,
      AccountDeletion,
      User,
      UserReport,
    ]),
    FacilitiesModule,
    NotificationsModule,
    JwtModule.register({
      secret: process.env.ADMIN_JWT_SECRET || 'ADMIN_SECRET_KEY',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminJwtStrategy],
  exports: [AdminService],
})
export class AdminModule {}
