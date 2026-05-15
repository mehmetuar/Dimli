import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
export class ReservationsController {
    constructor(private readonly reservationsService: ReservationsService) { }

    @Post('manual-fill')
    manualFill(@Body() body: { pitchId: string, slotTime: string }) {
        return this.reservationsService.manualFill(body.pitchId, new Date(body.slotTime));
    }

    @Post()
    create(@Body() createReservationDto: any) {
        return this.reservationsService.create(createReservationDto);
    }

    @Get()
    findAll() {
        return this.reservationsService.findAll();
    }

    @Post(':id/approve')
    approve(@Param('id') id: string, @Body() body: { note?: string }) {
        return this.reservationsService.approve(id, body?.note);
    }

    @Post(':id/reject')
    reject(@Param('id') id: string) {
        return this.reservationsService.rejectByBusiness(id);
    }

    @Post(':id/business-note')
    sendBusinessNote(@Param('id') id: string, @Body() body: { note: string }) {
        return this.reservationsService.sendBusinessNote(id, body.note);
    }

    @Post(':id/revoke')
    revoke(@Param('id') id: string) {
        return this.reservationsService.revokeConfirmation(id);
    }

    @Get('pitch/:id')
    findByPitchAndDate(@Param('id') pitchId: string, @Query('date') date: string) {
        return this.reservationsService.findByPitchAndDateRange(pitchId, date);
    }

    @Get('my-team')
    findByTeam(@Query('teamId') teamId: string) {
        return this.reservationsService.findByTeam(teamId);
    }

    @Get('upcoming')
    findUpcoming(@Query('teamId') teamId: string) {
        return this.reservationsService.findUpcomingByTeam(teamId);
    }

    @Post(':id/cancel')
    cancel(@Param('id') id: string, @Body() body: { teamId: string }) {
        return this.reservationsService.cancel(id, body.teamId);
    }

    @Post(':id/propose-time')
    proposeTime(@Param('id') id: string, @Body() body: { userId: string, newSlotTime: string }) {
        // In real app, userId comes from Token. Here trusting body for now as existing pattern.
        return this.reservationsService.proposeTime(id, body.userId, new Date(body.newSlotTime));
    }

    @Post(':id/accept-proposal')
    acceptProposal(@Param('id') id: string, @Body() body: { userId: string }) {
        return this.reservationsService.acceptProposal(id, body.userId);
    }

    @Post(':id/request-cancel')
    requestCancel(@Param('id') id: string, @Body() body: { teamId: string, userId: string }) {
        return this.reservationsService.requestCancel(id, body.teamId, body.userId);
    }

    @Post(':id/undo-cancel-request')
    undoCancelRequest(@Param('id') id: string, @Body() body: { teamId: string, userId: string }) {
        return this.reservationsService.undoCancelRequest(id, body.teamId, body.userId);
    }

    @Post(':id/accept-cancel-request')
    acceptCancelRequest(@Param('id') id: string) {
        return this.reservationsService.acceptCancelRequest(id);
    }

    @Post(':id/reject-cancel-request')
    rejectCancelRequest(@Param('id') id: string) {
        return this.reservationsService.rejectCancelRequest(id);
    }
}
