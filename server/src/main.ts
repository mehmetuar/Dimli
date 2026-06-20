import 'dotenv/config';

// Sunucu süreci bazı ortamlarda (örn. Render) yerel saat dilimiyle (Europe/Istanbul,
// UTC+3) çalışıyor. TypeORM'un Repository.update() ile yazılan "timestamp without
// time zone" alanları (örn. lastReadAt, lastActivityAt) bu yerel saatle yazılırken,
// @CreateDateColumn() ile yazılan alanlar (örn. createdAt) doğru şekilde UTC kalıyor —
// bu da iki zaman damgası arasında sabit +3 saatlik bir kaymaya yol açıyordu. Süreci
// her ortamda UTC'ye sabitleyerek bu sınıf hatayı kökünden gideriyoruz.
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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useWebSocketAdapter(new IoAdapter(app));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();
