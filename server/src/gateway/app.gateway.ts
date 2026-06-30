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

  // userId → ön planda (foreground) aktif soket id'leri. SAYAÇ değil SET: tüm
  // operasyonlar idempotent (her socket.id kendi disconnect'inde silinir) → kaçan/
  // çift event ile sayaç "takılı kalma" riski YOK. Push baskılama bunu okur.
  private foregroundSockets = new Map<string, Set<string>>();

  constructor(private jwtService: JwtService) {}

  // Kullanıcı uygulamayı ön planda açık tutuyor mu? Aktifse OS push gönderilmez
  // (uygulama-içi websocket olayı zaten iletildi). gateway enjekte edilmemişse
  // çağıran tarafı `?.` ile "aktif değil" sayar → push gönderilir (güvenli varsayılan).
  isUserActive(userId: string): boolean {
    const set = this.foregroundSockets.get(userId);
    return !!set && set.size > 0;
  }

  private addForeground(userId: string, socketId: string) {
    let set = this.foregroundSockets.get(userId);
    if (!set) {
      set = new Set<string>();
      this.foregroundSockets.set(userId, set);
    }
    set.add(socketId);
  }

  private removeForeground(userId: string, socketId: string) {
    const set = this.foregroundSockets.get(userId);
    if (!set) return;
    set.delete(socketId);
    if (set.size === 0) this.foregroundSockets.delete(userId);
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

      const userId = payload.sub as string;
      socket.data.userId = userId;
      socket.data.username = payload.username;
      // Bağlantı = uygulama ön planda kabul edilir (yeni açıldı/öne geldi).
      this.addForeground(userId, socket.id);

      await socket.join(userId);
      this.logger.log(`Client connected: ${userId}`);
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const userId = socket.data.userId as string | undefined;
    if (userId) {
      // Koşulsuz: Set.delete idempotent → kaçan decrement / takılı kalma imkânsız.
      this.removeForeground(userId, socket.id);
      this.logger.log(`Client disconnected: ${userId}`);
    }
  }

  // Client, uygulama öne gelince 'presence:active', arka plana alınınca
  // 'presence:inactive' gönderir (App.tsx appStateChange). Soket id bazında eklenir/
  // silinir; idempotent olduğundan tekrar eden event zarar vermez.
  @SubscribeMessage('presence:active')
  handlePresenceActive(@ConnectedSocket() socket: Socket) {
    const userId = socket.data.userId as string | undefined;
    if (userId) this.addForeground(userId, socket.id);
  }

  @SubscribeMessage('presence:inactive')
  handlePresenceInactive(@ConnectedSocket() socket: Socket) {
    const userId = socket.data.userId as string | undefined;
    if (userId) this.removeForeground(userId, socket.id);
  }

  @SubscribeMessage('ping')
  handlePing() {
    return 'pong';
  }
}
