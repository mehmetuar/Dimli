import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamBan } from './team-ban.entity';
import { TeamBansService } from './team-bans.service';

@Module({
    imports: [TypeOrmModule.forFeature([TeamBan])],
    providers: [TeamBansService],
    exports: [TeamBansService],
})
export class TeamBansModule { }
