import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

// OTP endpoint'lerine özel IP throttler'ı (auth.controller.ts'deki 8 send/verify
// endpoint'i). Varsayılan İngilizce ThrottlerException yerine telefon bazlı
// limitlerle aynı 429 gövdesini döner: { statusCode, message, retryAfter }.
// timeToBlockExpire @nestjs/throttler'da saniye cinsindendir.
@Injectable()
export class OtpThrottlerGuard extends ThrottlerGuard {
  protected throwThrottlingException(
    _context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message:
          'Çok fazla istek gönderdiniz. Lütfen kısa bir süre bekleyip tekrar deneyin.',
        retryAfter: Math.max(1, throttlerLimitDetail.timeToBlockExpire),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
