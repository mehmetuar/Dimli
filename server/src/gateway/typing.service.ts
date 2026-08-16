import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Server } from 'socket.io';
import { ChatParticipant } from '../chat/chat-participant.entity';
import { User } from '../users/user.entity';

// "Yazıyor..." göstergesi — DURUMSUZ röle. Sunucu typing durumu tutmaz;
// yalnız yetki (katılımcı mı?) + zenginleştirme (isim/avatar/takım) + fan-out
// yapar. Süre aşımı tamamen alıcı istemcide (6sn TTL). Kanal odası yok —
// kanonik per-user-room deseni (chat.service.ts sendMessage fan-out'u) kullanılır.

interface CachedMembers {
  userIds: Set<string>;
  fetchedAt: number;
}

interface CachedUserInfo {
  name: string;
  avatarUrl: string | null;
  teamId: string | null;
  fetchedAt: number;
}

export interface UserTypingPayload {
  channelId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  teamId: string | null;
  isTyping: boolean;
}

@Injectable()
export class TypingService {
  // Kısa TTL'li bellek içi önbellekler — typing her ~2.5sn'de bir gelir, her
  // event DB'ye gitmesin. Tek instance varsayımı (agent.md §16); ölçeklenirse
  // Redis adapter'la birlikte bu cache'ler de instance-yerel kalabilir
  // (yalnız kozmetik bayatlık, ≤TTL).
  private membershipCache = new Map<string, CachedMembers>();
  private userInfoCache = new Map<string, CachedUserInfo>();
  private static readonly MEMBERSHIP_TTL_MS = 30_000;
  private static readonly USER_TTL_MS = 300_000;
  private static readonly MAX_MEMBERSHIP_ENTRIES = 500;
  private static readonly MAX_USER_ENTRIES = 1000;

  constructor(
    @InjectRepository(ChatParticipant)
    private readonly participantRepository: Repository<ChatParticipant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private async getMemberIds(channelId: string): Promise<Set<string>> {
    const cached = this.membershipCache.get(channelId);
    if (
      cached &&
      Date.now() - cached.fetchedAt < TypingService.MEMBERSHIP_TTL_MS
    ) {
      return cached.userIds;
    }
    const rows = await this.participantRepository.find({
      where: { channelId, deletedAt: IsNull() },
      select: ['userId'],
    });
    const userIds = new Set(rows.map((r) => r.userId));
    // delete+set = Map sonuna taşı (insertion-order tahliye, LRU-vari)
    this.membershipCache.delete(channelId);
    this.membershipCache.set(channelId, { userIds, fetchedAt: Date.now() });
    if (this.membershipCache.size > TypingService.MAX_MEMBERSHIP_ENTRIES) {
      // İlk anahtar = en eski girdi (insertion order); iterator .next().value
      // `any` sızdırdığından for..of + break kullanılır (§68 sıfır-any)
      for (const oldest of this.membershipCache.keys()) {
        this.membershipCache.delete(oldest);
        break;
      }
    }
    return userIds;
  }

  private async getUserInfo(userId: string): Promise<CachedUserInfo | null> {
    const cached = this.userInfoCache.get(userId);
    if (cached && Date.now() - cached.fetchedAt < TypingService.USER_TTL_MS) {
      return cached;
    }
    // Projeksiyon = temizlik: parola hash'i vb. hiç yüklenmez
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'full_name', 'username', 'avatarUrl', 'teamId'],
    });
    if (!user) return null;
    const info: CachedUserInfo = {
      name: user.full_name || user.username,
      avatarUrl: user.avatarUrl ?? null,
      teamId: user.teamId ?? null,
      fetchedAt: Date.now(),
    };
    this.userInfoCache.delete(userId);
    this.userInfoCache.set(userId, info);
    if (this.userInfoCache.size > TypingService.MAX_USER_ENTRIES) {
      for (const oldest of this.userInfoCache.keys()) {
        this.userInfoCache.delete(oldest);
        break;
      }
    }
    return info;
  }

  async relayTyping(
    server: Server,
    channelId: string,
    senderId: string,
    isTyping: boolean,
  ): Promise<void> {
    const members = await this.getMemberIds(channelId);
    // Katılımcı değil → sessizce düş (WS'de 403 muadili yok; markAsRead emsali)
    if (!members.has(senderId)) return;
    const info = await this.getUserInfo(senderId);
    if (!info) return;
    const payload: UserTypingPayload = {
      channelId,
      userId: senderId,
      name: info.name,
      avatarUrl: info.avatarUrl,
      teamId: info.teamId,
      isTyping,
    };
    for (const uid of members) {
      // Gönderenin kendisi hariç: kendi diğer cihazı kendi "yazıyor"unu görmesin
      if (uid === senderId) continue;
      server.to(uid).emit('userTyping', payload);
    }
  }
}
