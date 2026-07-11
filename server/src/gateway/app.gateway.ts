import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { DefaultEventsMap } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import type { JwtPayload } from '../auth/types';

// socket.data sözleşmesi — handleConnection doldurur, presence/disconnect okur.
interface SocketData {
  userId?: string;
  username?: string;
}

type AppSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;

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

  async handleConnection(socket: AppSocket) {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.query?.token as string);

      if (!token) {
        socket.disconnect();
        return;
      }

      const payload = this.jwtService.verify<JwtPayload>(token as string, {
        secret: process.env.JWT_SECRET || 'SECRET_KEY',
      });

      const userId = payload.sub;
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

  handleDisconnect(socket: AppSocket) {
    const userId = socket.data.userId;
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
  handlePresenceActive(@ConnectedSocket() socket: AppSocket) {
    const userId = socket.data.userId;
    if (userId) this.addForeground(userId, socket.id);
  }

  @SubscribeMessage('presence:inactive')
  handlePresenceInactive(@ConnectedSocket() socket: AppSocket) {
    const userId = socket.data.userId;
    if (userId) this.removeForeground(userId, socket.id);
  }

  @SubscribeMessage('ping')
  handlePing() {
    return 'pong';
  }
}
