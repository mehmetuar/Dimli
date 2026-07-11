import { Injectable, Logger } from '@nestjs/common';
import { EntityManager, IsNull } from 'typeorm';
import { ChatService } from '../../chat/chat.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { ChatChannel } from '../../chat/chat-channel.entity';
import { ChatParticipant } from '../../chat/chat-participant.entity';
import { Team } from '../../teams/team.entity';
import type { ChatMessageMetadata } from '../../chat/chat-message.entity';

// Rezervasyon akışlarında paylaşılan yardımcılar: sistem mesajı gönderimi +
// maç iptalinde joker temizliği. Her ikisi de çağıranın transaction `manager`'ını
// alır (kendi transaction'ını açmaz). Lifecycle / Proposal / Recurring servisleri kullanır.
@Injectable()
export class ReservationSupportService {
  private readonly logger = new Logger(ReservationSupportService.name);

  constructor(
    private chatService: ChatService,
    private notificationsService: NotificationsService,
  ) {}

  // Helper to send system message with robust sender fallback and metadata
  async sendSystemMessage(
    manager: EntityManager,
    matchId: string,
    _team: Team,
    content: string,
    metadata?: ChatMessageMetadata,
    skipPush = false,
  ) {
    try {
      // Find channel by relatedMatchId and type MATCH_GROUP
      const channel = await manager.findOne(ChatChannel, {
        where: { relatedMatchId: matchId, type: 'MATCH_GROUP' },
      });

      if (channel) {
        // Sistem mesajının gerçek bir göndereni yok (senderId: null) — bu
        // sayede chatService.sendMessage() hiçbir katılımcının okunmadı
        // durumunu (lastReadAt) sıfırlamaz; eskiden burada "sahte gönderen"
        // olarak takım kaptanı kullanılıyordu, bu da kaptanın o kanaldaki
        // okunmadı sayacının her sistem mesajında silinmesine yol açıyordu.
        await this.chatService.sendMessage(
          channel.id,
          null,
          content,
          true, // isSystemMessage
          metadata, // Pass metadata
          skipPush, // çift push'u önlemek için (ayrı bildirim zaten push atıyorsa)
        );
        this.logger.log(`System message sent to channel ${channel.id}`);
      } else {
        this.logger.warn(
          `⚠️ Cannot send system message: Channel not found for matchId ${matchId}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to send system message:', error);
    }
  }

  /**
   * F4: Bir maç iptal edildiğinde maç grubundaki joker oyuncuları (iki takımdan da
   * olmayan aktif katılımcılar) maç grubundan düşür, kendilerine bildirim gönder ve
   * ilgili JOKER_NEGOTIATION kanallarını temizle. Çağıran transaction (manager)
   * içinde çalışır; hata olsa bile iptali bloklamaz (best-effort).
   */
  async cleanupJokersOnMatchCancel(
    manager: EntityManager,
    matchAnnouncementId: string,
    validTeamIds: (string | null | undefined)[],
    jokerMessage: string,
    reservationId: string,
  ): Promise<void> {
    try {
      const teamIds = validTeamIds.filter(Boolean) as string[];

      const matchChannel = await manager.findOne(ChatChannel, {
        where: { relatedMatchId: matchAnnouncementId, type: 'MATCH_GROUP' },
      });
      if (matchChannel) {
        const participants = await manager.find(ChatParticipant, {
          where: { channelId: matchChannel.id, deletedAt: IsNull() },
          relations: ['user'],
        });
        // Joker = takımı maçtaki iki takımdan biri OLMAYAN katılımcı
        const jokers = participants.filter(
          (p) => !teamIds.includes(p.user?.teamId ?? ''),
        );
        for (const jp of jokers) {
          await manager.update(
            ChatParticipant,
            { id: jp.id },
            { deletedAt: new Date() },
          );
          try {
            await this.notificationsService.create({
              userId: jp.userId,
              type: 'SYSTEM',
              title: 'Maç İptal Edildi',
              message: jokerMessage,
              relatedId: reservationId,
              read: false,
              metadata: { type: 'JOKER_MATCH_CANCELLED', reservationId },
            });
          } catch (e) {
            this.logger.error('Joker iptal bildirimi gönderilemedi:', e);
          }
        }
      }

      // İlgili JOKER_NEGOTIATION kanal(lar)ını da kapat
      const negotiationChannels = await manager.find(ChatChannel, {
        where: {
          relatedMatchId: matchAnnouncementId,
          type: 'JOKER_NEGOTIATION',
        },
      });
      for (const nc of negotiationChannels) {
        await manager.update(
          ChatParticipant,
          { channelId: nc.id, deletedAt: IsNull() },
          { deletedAt: new Date() },
        );
      }
    } catch (e) {
      this.logger.error('İptal sonrası joker temizliği başarısız:', e);
    }
  }
}
