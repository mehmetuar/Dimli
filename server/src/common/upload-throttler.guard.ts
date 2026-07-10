import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

// POST /files/upload'a özel IP throttler'ı. Bu uç KAYIT (register) akışında
// token'sız çağrıldığı için JwtAuthGuard EKLENEMEZ; anonim Cloudinary yükleme
// suistimalini (spam/maliyet) rate-limit ile sınırlar. OtpThrottlerGuard ile aynı
// Türkçe 429 gövdesi. Yalnız 'upload' named throttler'ı uygulanır (endpoint'te
// otp-minute/otp-hour @SkipThrottle ile atlanır).
@Injectable()
export class UploadThrottlerGuard extends ThrottlerGuard {
  protected throwThrottlingException(
    _context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message:
          'Çok fazla yükleme isteği gönderdiniz. Lütfen kısa bir süre bekleyip tekrar deneyin.',
        retryAfter: Math.max(1, throttlerLimitDetail.timeToBlockExpire),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
