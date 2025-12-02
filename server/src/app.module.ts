import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TeamsModule } from './teams/teams.module';
import { ChallengesModule } from './challenges/challenges.module';
import { JoinRequestsModule } from './join-requests/join-requests.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MatchAnnouncementsModule } from './match-announcements/match-announcements.module';

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
    AuthModule,
    UsersModule,
    TeamsModule,
    ChallengesModule,
    JoinRequestsModule,
    NotificationsModule,
    MatchAnnouncementsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
