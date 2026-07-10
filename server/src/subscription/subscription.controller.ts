import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Request,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import type { RevenueCatWebhookPayload } from './dto/revenuecat-webhook';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  getPlans() {
    return this.subscriptionService.getPlans();
  }

  // GÜVENLİK: kimlik token'dan (req.user.id = owner.id) — URL'deki `:ownerId`
  // YOK SAYILIR (IDOR: başka işletmenin billing verisi). İstemci zaten kendi
  // ownerId'sini gönderiyordu → davranış değişmez. Guard ile anonim erişim kapanır.
  @UseGuards(JwtAuthGuard)
  @Get('owner/:ownerId')
  findByOwner(@Request() req: { user: Express.User }) {
    return this.subscriptionService.findByOwner(req.user.id);
  }

  // Satın alma başarısız olduğunda veya RC webhook'u gelmediğinde frontend tarafından çağrılır.
  // GÜVENLİK: ownerId body yerine token'dan → ödeme doğrulaması olmadan başka işletmeye
  // plan/entitlement verilemez (eski hali: herkes body ile aboneliği ACTIVE yapabiliyordu).
  @UseGuards(JwtAuthGuard)
  @Post('confirm-purchase')
  async confirmPurchase(
    @Request() req: { user: Express.User },
    @Body() body: { planType: string; rcCustomerId: string },
  ) {
    if (!body.planType) throw new BadRequestException('planType zorunludur.');
    return this.subscriptionService.confirmPurchase(
      req.user.id,
      body.planType,
      body.rcCustomerId ?? '',
    );
  }

  // Plan düşürme — saha seçimi tamamlandıktan sonra çağrılır, değişiklik bir sonraki yenilemede geçerli olur
  @UseGuards(JwtAuthGuard)
  @Post('schedule-downgrade')
  async scheduleDowngrade(
    @Request() req: { user: Express.User },
    @Body() body: { planType: string; rcCustomerId: string },
  ) {
    if (!body.planType) throw new BadRequestException('planType zorunludur.');
    return this.subscriptionService.scheduleDowngrade(
      req.user.id,
      body.planType,
      body.rcCustomerId ?? '',
    );
  }

  // RevenueCat webhook — abonelik durumu değişikliklerini dinler
  @Post('webhook/revenuecat')
  async revenuecatWebhook(
    @Body() body: RevenueCatWebhookPayload,
    @Headers('authorization') authHeader: string,
  ) {
    const expectedSecret = process.env.REVENUECAT_WEBHOOK_SECRET || '';
    if (expectedSecret && authHeader !== expectedSecret) {
      throw new UnauthorizedException('Geçersiz webhook isteği.');
    }
    await this.subscriptionService.handleWebhook(body.event || body);
    return { received: true };
  }
}
