import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './team.entity';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { UsersModule } from '../users/users.module';
import { RatingsModule } from '../ratings/ratings.module';
import { MatchAnnouncement } from '../match-announcements/match-announcement.entity';
import { Reservation } from '../reservations/entities/reservation.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Team, MatchAnnouncement, Reservation]), UsersModule, RatingsModule],
    providers: [TeamsService],
    controllers: [TeamsController],
    exports: [TeamsService],
})
export class TeamsModule { }
