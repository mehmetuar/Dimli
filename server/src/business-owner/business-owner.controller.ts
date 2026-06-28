import {
  Controller,
  Post,
  Patch,
  Body,
  Get,
  Param,
  Request,
  Query,
  UseGuards,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { BusinessOwnerService } from './business-owner.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('business-owner')
export class BusinessOwnerController {
  constructor(
    private readonly businessOwnerService: BusinessOwnerService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Patch('push-token')
  async updatePushToken(
    @Request() req: { user: Express.User },
    @Body('token') token: string,
  ) {
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
    const count =
      await this.notificationsService.getUnreadCountForOwner(ownerId);
    return { count };
  }

  @Post('notifications/mark-all-read')
  async markAllRead(@Body('ownerId') ownerId: string) {
    await this.notificationsService.markAllAsReadForOwner(ownerId);
    return { success: true };
  }

  @Get('dashboard')
  async getDashboard(
    @Request() req,
    @Query('date') date: string,
    @Query('ownerId') ownerId: string,
  ) {
    return this.businessOwnerService.getDashboardSlots(ownerId, date);
  }

  // GET /business-owner/stats?ownerId=xxx
  // Tanımlama sırası önemli: :id parametreli route'tan ÖNCE olmalı
  @Get('stats')
  async getStats(@Query('ownerId') ownerId: string) {
    return this.businessOwnerService.getStats(ownerId);
  }

  @Post('approve-reservation/:id')
  approveReservation(
    @Param('id') reservationId: string,
    @Body() body: { ownerId: string },
  ) {
    return this.businessOwnerService.approveReservation(
      reservationId,
      body.ownerId,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.businessOwnerService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(
    @Request() req: { user: Express.User },
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    if (!body.newPassword || body.newPassword.length < 6) {
      throw new BadRequestException('Yeni şifre en az 6 karakter olmalıdır.');
    }
    await this.businessOwnerService.changePassword(
      req.user.id,
      body.currentPassword,
      body.newPassword,
    );
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('account')
  async deleteAccount(
    @Request() req: { user: Express.User },
    @Body('password') password: string,
    @Body('reason') reason?: string,
    @Body('note') note?: string,
  ) {
    if (!password)
      throw new BadRequestException('Şifre doğrulaması gereklidir.');
    return this.businessOwnerService.deleteAccount(
      req.user.id,
      password,
      reason,
      note,
    );
  }
}
