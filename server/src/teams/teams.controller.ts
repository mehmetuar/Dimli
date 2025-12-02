import { Controller, Get, Post, Body, Param, UseGuards, Request, Delete, Patch } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('teams')
export class TeamsController {
    constructor(private readonly teamsService: TeamsService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Body() createTeamDto: any, @Request() req) {
        return this.teamsService.create(createTeamDto, req.user);
    }

    @Get()
    findAll() {
        return this.teamsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.teamsService.findOne(id);
    }

    @Get('search/:name')
    searchByName(@Param('name') name: string) {
        return this.teamsService.searchByName(name);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/players')
    addPlayer(@Param('id') id: string, @Body('userId') userId: string) {
        return this.teamsService.addPlayer(id, userId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id/players/:playerId')
    removePlayer(@Param('id') id: string, @Param('playerId') playerId: string) {
        return this.teamsService.removePlayer(id, playerId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/players/:playerId/role')
    updatePlayerRole(
        @Param('id') id: string,
        @Param('playerId') playerId: string,
        @Body('role') role: 'CAPTAIN' | 'VICE'
    ) {
        return this.teamsService.updatePlayerRole(id, playerId, role);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/vice-captains')
    updateViceCaptains(
        @Param('id') id: string,
        @Body() dto: { add?: string; remove?: string }
    ) {
        return this.teamsService.updateViceCaptains(id, dto.add, dto.remove);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/home-pitch')
    updateHomePitch(
        @Param('id') id: string,
        @Body('homePitchId') homePitchId: string
    ) {
        return this.teamsService.updateHomePitch(id, homePitchId);
    }
}
