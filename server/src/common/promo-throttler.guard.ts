import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

// POST /promo-codes/validate'e özel IP throttler'ı. Bu uç auth'suz olduğundan
// kod tahmin/enumeration denemelerini sınırlar. OtpThrottlerGuard ile aynı
// Türkçe 429 gövdesi. Yalnız 'promo' named throttler'ı uygulanır (endpoint'te
// otp/upload @SkipThrottle ile atlanır).
@Injectable()
export class PromoThrottlerGuard extends ThrottlerGuard {
  protected throwThrottlingException(
    _context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message:
          'Çok fazla deneme yaptınız. Lütfen kısa bir süre bekleyip tekrar deneyin.',
        retryAfter: Math.max(1, throttlerLimitDetail.timeToBlockExpire),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
