import 'dotenv/config';

// `pg` sürücüsü "timestamp without time zone" kolonlarını YAZARKEN açık UTC
// ofseti ekliyor (her zaman doğru), ama OKURKEN ofsetsiz ham string'i process'in
// yerel saatiyle (bu TZ değişkeni) yorumluyor — bu yüzden TZ, Postgres oturum
// saat dilimiyle (doğrulandı: UTC) AYNI olmak ZORUNDA, aksi halde @CreateDateColumn()/
// CURRENT_TIMESTAMP ile yazılan her şey (chat createdAt, lastActivityAt, lastReadAt
// dahil) okunurken saatlerce kayar. İstanbul yerel saatine ihtiyaç duyan kod
// (match-announcements, chat'teki maç durumu hesaplamaları) bu değişkene
// bakmıyor — sabit +3 saatlik epoch aritmetiği kullanıyor (Türkiye'de DST yok).
process.env.TZ = 'UTC';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as crypto from 'crypto';

// Polyfill for Node < 19
if (!global.crypto) {
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: () => crypto.randomUUID(),
    },
  });
}
import { ValidationPipe } from '@nestjs/common';
import { DuplicateRequestInterceptor } from './common/duplicate-request.interceptor';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Render proxy'si arkasında req.ip'nin X-Forwarded-For'daki gerçek istemci IP'sini
  // göstermesi için şart (IP throttler + DuplicateRequestInterceptor anahtarları).
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.enableCors();
  app.useWebSocketAdapter(new IoAdapter(app));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Uygulama geneli: kullanıcı asla İngilizce "Internal server error" görmesin →
  // HttpException'lar (Türkçe mesajlar) geçer, yakalanmamış hatalar Türkçe genel mesaja düşer.
  app.useGlobalFilters(new AllExceptionsFilter());
  // Uygulama geneli: aynı kullanıcının hızlı çift-tıklaması → tek istek/tek bildirim.
  app.useGlobalInterceptors(new DuplicateRequestInterceptor());
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();
