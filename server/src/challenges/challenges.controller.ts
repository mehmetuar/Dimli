import { Controller, Post, Get, Patch, Delete, Body, Param } from '@nestjs/common';
import { ChallengesService } from './challenges.service';

@Controller('challenges')
export class ChallengesController {
    constructor(private readonly challengesService: ChallengesService) { }

    @Post()
    async create(@Body() dto: { fromTeamId: string; toMatchId: string; note?: string }) {
        return this.challengesService.create(dto.fromTeamId, dto.toMatchId, dto.note);
    }

    @Get('match/:matchId')
    async getByMatch(@Param('matchId') matchId: string) {
        return this.challengesService.findByMatchId(matchId);
    }

    @Patch(':id/accept')
    async accept(@Param('id') id: string) {
        return this.challengesService.updateStatus(id, 'ACCEPTED');
    }

    @Patch(':id/reject')
    async reject(@Param('id') id: string) {
        return this.challengesService.updateStatus(id, 'REJECTED');
    }

    @Get('team/:teamId')
    async getByTeam(@Param('teamId') teamId: string) {
        return this.challengesService.findByTeamId(teamId);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.challengesService.delete(id);
    }
}
