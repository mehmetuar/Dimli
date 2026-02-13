import { Controller, Post, Body, Get, Param, UseGuards, Request, Query } from '@nestjs/common';
import { BusinessOwnerService } from './business-owner.service';

@Controller('business-owner')
export class BusinessOwnerController {
    constructor(private readonly businessOwnerService: BusinessOwnerService) { }

    // TODO: Add proper AuthGuard for BusinessOwner
    // @UseGuards(JwtAuthGuard)
    @Get('dashboard')
    async getDashboard(@Request() req, @Query('date') date: string, @Query('ownerId') ownerId: string) {
        // In real app, get ownerId from req.user
        // For development/mock, allow passing ownerId or use a test one
        // const id = req.user?.id || ownerId; 
        return this.businessOwnerService.getDashboardSlots(ownerId, date);
    }

    @Post('approve-reservation/:id')
    approveReservation(@Param('id') reservationId: string, @Body() body: any) {
        return this.businessOwnerService.approveReservation(reservationId, body.ownerId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.businessOwnerService.findOne(id);
    }
}
