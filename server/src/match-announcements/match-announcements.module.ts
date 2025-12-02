import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchAnnouncement } from './match-announcement.entity';
import { MatchAnnouncementsService } from './match-announcements.service';
import { MatchAnnouncementsController } from './match-announcements.controller';

@Module({
    imports: [TypeOrmModule.forFeature([MatchAnnouncement])],
    controllers: [MatchAnnouncementsController],
    providers: [MatchAnnouncementsService],
    exports: [MatchAnnouncementsService],
})
export class MatchAnnouncementsModule { }
