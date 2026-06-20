import 'dotenv/config';

// lastReadAt/lastActivityAt için chat.service.ts artık DB-taraflı CURRENT_TIMESTAMP
// kullanıyor (Postgres oturum saat dilimi = UTC), bu yüzden process.env.TZ'den
// bağımsız olarak doğru çalışıyor. Ancak match-announcements ve reservations
// modüllerindeki tüm new Date()/.getHours()/.setHours() çağrıları, kullanıcının
// uygulamada seçtiği saatin İstanbul yerel saati olduğunu varsayarak yazılmış.
// Süreci açıkça İstanbul'a sabitleyerek bu modüllerin doğru çalışmasını garanti
// ediyoruz (Render container varsayımına güvenmek yerine).
process.env.TZ = 'Europe/Istanbul';

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
