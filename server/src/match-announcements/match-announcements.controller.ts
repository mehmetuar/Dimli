import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { MatchAnnouncementsService } from './match-announcements.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('match-announcements')
export class MatchAnnouncementsController {
    constructor(private readonly matchAnnouncementsService: MatchAnnouncementsService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Body() createDto: any, @Request() req) {
        return this.matchAnnouncementsService.create(createDto, req.user.userId);
    }

    @Get()
    findAll(@Query('date') date?: string, @Query('pitchId') pitchId?: string) {
        return this.matchAnnouncementsService.findAll({ date, pitchId });
    }

    @Get('pitch/:pitchId')
    findByPitch(@Param('pitchId') pitchId: string) {
        return this.matchAnnouncementsService.findByPitch(pitchId);
    }
}
