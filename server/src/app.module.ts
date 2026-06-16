import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TeamsModule } from './teams/teams.module';
import { ChallengesModule } from './challenges/challenges.module';
import { JoinRequestsModule } from './join-requests/join-requests.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MatchAnnouncementsModule } from './match-announcements/match-announcements.module';
import { ChatModule } from './chat/chat.module';
import { BusinessModule } from './business/business.module';
import { PitchesModule } from './pitches/pitches.module';
import { BusinessOwnerModule } from './business-owner/business-owner.module';
import { ReservationsModule } from './reservations/reservations.module';
import { RatingsModule } from './ratings/ratings.module';
import { FilesModule } from './files/files.module';
import { AdminModule } from './admin/admin.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { PitchChangeRequestsModule } from './pitch-change-requests/pitch-change-requests.module';
import { GatewayModule } from './gateway/gateway.module';
import { UserBlocksModule } from './user-blocks/user-blocks.module';
import { UserReportsModule } from './user-reports/user-reports.module';
import { FacilitiesModule } from './facilities/facilities.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...(process.env.DATABASE_URL
        ? {
            url: process.env.DATABASE_URL,
            ssl: {
              rejectUnauthorized: false,
            },
          }
        : {
            host: 'localhost',
            port: 5432,
            username: 'postgres',
            password: 'postgrespassword',
            database: 'dimli',
          }),
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      autoLoadEntities: true,
      synchronize: true, // Auto-create tables - consider disabling in production later
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    TeamsModule,
    ChallengesModule,
    JoinRequestsModule,
    NotificationsModule,
    MatchAnnouncementsModule,
    ChatModule,
    BusinessModule,
    PitchesModule,
    BusinessOwnerModule,
    ReservationsModule,
    RatingsModule,
    FilesModule,
    AdminModule,
    SubscriptionModule,
    PitchChangeRequestsModule,
    GatewayModule,
    UserBlocksModule,
    UserReportsModule,
    FacilitiesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
