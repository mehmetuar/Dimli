import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
export class ReservationsController {
    constructor(private readonly reservationsService: ReservationsService) { }

    @Post()
    create(@Body() createReservationDto: any) {
        return this.reservationsService.create(createReservationDto);
    }

    @Get()
    findAll() {
        return this.reservationsService.findAll();
    }

    @Post(':id/approve')
    approve(@Param('id') id: string) {
        return this.reservationsService.approve(id);
    }

    @Get('my-team')
    findByTeam(@Query('teamId') teamId: string) {
        return this.reservationsService.findByTeam(teamId);
    }

    @Post(':id/cancel')
    cancel(@Param('id') id: string, @Body() body: { teamId: string }) {
        return this.reservationsService.cancel(id, body.teamId);
    }

    @Get('pitch/:pitchId')
    findByPitch(@Param('pitchId') pitchId: string, @Query('date') date: string) {
        return this.reservationsService.findByPitchAndDateRange(pitchId, date);
    }
}
