import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './team.entity';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [TypeOrmModule.forFeature([Team]), UsersModule],
    providers: [TeamsService],
    controllers: [TeamsController],
    exports: [TeamsService],
})
export class TeamsModule { }
