import { Controller, Post, Patch, Body, Get, Param, Request, Query, UseGuards } from '@nestjs/common';
import { BusinessOwnerService } from './business-owner.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('business-owner')
export class BusinessOwnerController {
    constructor(
        private readonly businessOwnerService: BusinessOwnerService,
        private readonly notificationsService: NotificationsService,
    ) { }

    @UseGuards(JwtAuthGuard)
    @Patch('push-token')
    async updatePushToken(@Request() req: any, @Body('token') token: string) {
        if (!token) return { success: false };
        await this.businessOwnerService.updatePushToken(req.user.id, token);
        return { success: true };
    }

    @Get('notifications')
    async getNotifications(@Query('ownerId') ownerId: string) {
        return this.notificationsService.findByOwner(ownerId);
    }

    @Get('notifications/unread-count')
    async getUnreadCount(@Query('ownerId') ownerId: string) {
        const count = await this.notificationsService.getUnreadCountForOwner(ownerId);
        return { count };
    }

    @Post('notifications/mark-all-read')
    async markAllRead(@Body('ownerId') ownerId: string) {
        await this.notificationsService.markAllAsReadForOwner(ownerId);
        return { success: true };
    }

    @Get('dashboard')
    async getDashboard(@Request() req, @Query('date') date: string, @Query('ownerId') ownerId: string) {
        return this.businessOwnerService.getDashboardSlots(ownerId, date);
    }

    // GET /business-owner/stats?ownerId=xxx
    // Tanımlama sırası önemli: :id parametreli route'tan ÖNCE olmalı
    @Get('stats')
    async getStats(@Query('ownerId') ownerId: string) {
        return this.businessOwnerService.getStats(ownerId);
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
