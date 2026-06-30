import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Ön plan baskılaması (presence) için: client arka plana alınınca normalde
  // 'presence:inactive' gönderir; ama uygulama zorla kapatılırsa (swipe-kill) bu
  // ulaşmayabilir. Ölü soketi daha hızlı düşürmek için ping aralığı/zaman aşımı
  // kısaltıldı (varsayılan 25s/20s → ~45s pencere; burada ~20s).
  pingInterval: 10000,
  pingTimeout: 10000,
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppGateway.name);

  // userId → ön planda (foreground) aktif soket sayısı. Boolean/Set değil SAYAÇ
  // kullanılır çünkü bir kullanıcının aynı anda birden çok soketi olabilir
  // (reconnect, auth:tokenChanged reconnect, web+native). Push baskılama bunu okur.
  private activeUsers = new Map<string, number>();

  constructor(private jwtService: JwtService) {}

  // Kullanıcı uygulamayı ön planda açık tutuyor mu? Aktifse OS push gönderilmez
  // (uygulama-içi websocket olayı zaten iletildi). gateway enjekte edilmemişse
  // çağıran tarafı `?.` ile "aktif değil" sayar → push gönderilir (güvenli varsayılan).
  isUserActive(userId: string): boolean {
    return (this.activeUsers.get(userId) ?? 0) > 0;
  }

  private adjustPresence(userId: string, delta: number) {
    const next = (this.activeUsers.get(userId) ?? 0) + delta;
    if (next > 0) this.activeUsers.set(userId, next);
    else this.activeUsers.delete(userId);
  }

  async handleConnection(socket: Socket) {
    try {
      const token =
        (socket.handshake.auth as any)?.token ||
        (socket.handshake.query?.token as string);

      if (!token) {
        socket.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token as string, {
        secret: process.env.JWT_SECRET || 'SECRET_KEY',
      });

      const userId = payload.sub;
      socket.data.userId = userId;
      socket.data.username = payload.username;
      // Bağlantı = uygulama ön planda kabul edilir (yeni açıldı/öne geldi).
      socket.data.foreground = true;
      this.adjustPresence(userId as string, +1);

      await socket.join(userId as string);
      this.logger.log(`Client connected: ${userId}`);
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const userId = socket.data.userId as string | undefined;
    if (userId) {
      if (socket.data.foreground) this.adjustPresence(userId, -1);
      this.logger.log(`Client disconnected: ${userId}`);
    }
  }

  // Client, uygulama öne gelince 'presence:active', arka plana alınınca
  // 'presence:inactive' gönderir (App.tsx appStateChange). Soket bazında foreground
  // durumu tutulur; sayaç buna göre güncellenir.
  @SubscribeMessage('presence:active')
  handlePresenceActive(@ConnectedSocket() socket: Socket) {
    const userId = socket.data.userId as string | undefined;
    if (userId && socket.data.foreground !== true) {
      socket.data.foreground = true;
      this.adjustPresence(userId, +1);
    }
  }

  @SubscribeMessage('presence:inactive')
  handlePresenceInactive(@ConnectedSocket() socket: Socket) {
    const userId = socket.data.userId as string | undefined;
    if (userId && socket.data.foreground === true) {
      socket.data.foreground = false;
      this.adjustPresence(userId, -1);
    }
  }

  @SubscribeMessage('ping')
  handlePing() {
    return 'pong';
  }
}
