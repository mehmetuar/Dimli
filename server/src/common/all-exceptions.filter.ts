import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Uygulama-geneli hata filtresi. Amaç: kullanıcı ASLA İngilizce "Internal server error"
 * (veya ham hata metni) görmesin.
 *
 * - HttpException (BadRequest/Conflict/NotFound/Forbidden... — kod içindeki Türkçe mesajlar)
 *   olduğu gibi geçer (status + gövde korunur).
 * - Yakalanmamış diğer hatalar → 500 + Türkçe genel mesaj (ham/İngilizce metin sızmaz,
 *   stack loglanır ama istemciye gönderilmez).
 * - HTTP dışı bağlamlar (WebSocket) bu filtreyle işlenmez → yeniden fırlatılır.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      // WS/RPC bağlamı — bu filtre yalnız HTTP içindir.
      throw exception;
    }

    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      // OTP hız limitleri retryAfter (saniye) taşır → standart Retry-After header'ı
      if (
        status === HttpStatus.TOO_MANY_REQUESTS &&
        typeof body === 'object' &&
        body !== null &&
        typeof (body as { retryAfter?: unknown }).retryAfter === 'number'
      ) {
        response.setHeader(
          'Retry-After',
          String((body as { retryAfter: number }).retryAfter),
        );
      }
      response.status(status).json(body);
      return;
    }

    this.logger.error(
      exception instanceof Error
        ? (exception.stack ?? exception.message)
        : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.',
    });
  }
}
