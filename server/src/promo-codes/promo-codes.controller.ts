import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PromoCodesService } from './promo-codes.service';
import { ValidatePromoCodeDto } from './dto/validate-promo-code.dto';
import { RedeemPromoCodeDto } from './dto/redeem-promo-code.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PromoThrottlerGuard } from '../common/promo-throttler.guard';

@Controller('promo-codes')
export class PromoCodesController {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  // Auth'suz — yalnız kodun geçerliliğini bildirir (kayıt akışı ön-doğrulaması).
  // IP başına dakikada 10 (PromoThrottlerGuard); otp/upload named throttler'ları
  // bu uç için atlanır.
  @UseGuards(PromoThrottlerGuard)
  @SkipThrottle({ 'otp-minute': true, 'otp-hour': true, upload: true })
  @Post('validate')
  async validate(@Body() body: ValidatePromoCodeDto) {
    return this.promoCodesService.validate(body.code);
  }

  // Mevcut işletme davet kodu kullanır. ownerId token'dan (IDOR koruması).
  @UseGuards(JwtAuthGuard)
  @Post('redeem')
  async redeem(
    @Request() req: { user: Express.User },
    @Body() body: RedeemPromoCodeDto,
  ) {
    return this.promoCodesService.redeemForExistingOwner(
      req.user.id,
      body.code,
    );
  }
}
