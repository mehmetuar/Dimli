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
import { UpdateBusinessOwnerProfileDto } from './dto/update-business-owner-profile.dto';

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

  // Çıkışta çağrılır: bu işletme sahibinin push token'ını siler.
  @UseGuards(JwtAuthGuard)
  @Delete('push-token')
  async clearPushToken(@Request() req: { user: Express.User }) {
    await this.businessOwnerService.clearPushToken(req.user.id);
    return { success: true };
  }

  // limit verilirse sayfalı {items,total,hasMore}; yoksa legacy limitsiz dizi
  // (yayındaki eski mobil sürümler limit göndermez — sözleşme korunur). Müşteri
  // /notifications ucuyla aynı clamp (1..50, default 20).
  // GÜVENLİK: ownerId query yerine token'dan (req.user.id) → başka işletmenin
  // bildirimlerine IDOR kapalı. İstemci zaten kendi ownerId'sini gönderiyordu.
  @UseGuards(JwtAuthGuard)
  @Get('notifications')
  async getNotifications(
    @Request() req: { user: Express.User },
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const ownerId = req.user.id;
    if (limit !== undefined) {
      return this.notificationsService.findByOwner(ownerId, {
        limit: Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50),
        offset: Math.max(parseInt(offset ?? '0', 10) || 0, 0),
      });
    }
    return this.notificationsService.findByOwner(ownerId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('notifications/unread-count')
  async getUnreadCount(@Request() req: { user: Express.User }) {
    const count = await this.notificationsService.getUnreadCountForOwner(
      req.user.id,
    );
    return { count };
  }

  @UseGuards(JwtAuthGuard)
  @Post('notifications/mark-all-read')
  async markAllRead(@Request() req: { user: Express.User }) {
    await this.notificationsService.markAllAsReadForOwner(req.user.id);
    return { success: true };
  }

  // Reddedilmiş işletmeyi tekrar onaya gönder. Guard'lı: owner JWT'den türetilir
  // (req.user.id = BusinessOwner.id), client status göndermez (self-approve kapalı).
  @UseGuards(JwtAuthGuard)
  @Patch('business/resubmit')
  async resubmitBusiness(@Request() req: { user: Express.User }) {
    return this.businessOwnerService.resubmitBusiness(req.user.id);
  }

  // GÜVENLİK: ownerId query yerine token'dan → başka işletmenin operasyon
  // verisine (slot dolulukları) IDOR kapalı.
  @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  async getDashboard(
    @Request() req: { user: Express.User },
    @Query('date') date: string,
  ) {
    return this.businessOwnerService.getDashboardSlots(req.user.id, date);
  }

  // GET /business-owner/stats — kimlik token'dan (başka işletmenin ciro/finansal
  // verisine IDOR kapalı). Tanımlama sırası önemli: :id parametreli route'tan ÖNCE olmalı.
  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getStats(@Request() req: { user: Express.User }) {
    return this.businessOwnerService.getStats(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('approve-reservation/:id')
  approveReservation(
    @Param('id') reservationId: string,
    @Request() req: { user: Express.User },
  ) {
    return this.businessOwnerService.approveReservation(
      reservationId,
      req.user.id,
    );
  }

  // GÜVENLİK: kimlik token'dan (req.user.id) — URL'deki `:id` YOK SAYILIR (eski hali
  // herhangi bir ownerId ile TAM BusinessOwner = parola hash'i + PII sızdırıyordu).
  // Yanıttan password + pushToken ayıklanır (owner kendi email/telefonunu görebilir).
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Request() req: { user: Express.User }) {
    const owner = await this.businessOwnerService.findOne(req.user.id);
    if (!owner) return owner;
    const { password: _pw, pushToken: _pt, ...safe } = owner;
    return safe;
  }

  // Yetkili (owner) kendi profilini günceller: ad soyad + e-posta. Telefon salt-okunur.
  // Guard'lı → owner = req.user.id (JWT sub); client owner id göndermez.
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @Request() req: { user: Express.User },
    @Body() dto: UpdateBusinessOwnerProfileDto,
  ) {
    return this.businessOwnerService.updateProfile(req.user.id, dto);
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
