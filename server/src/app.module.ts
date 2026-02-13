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

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgrespassword',
      database: 'sahapro',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      autoLoadEntities: true,
      synchronize: true, // Auto-create tables (dev only)
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
