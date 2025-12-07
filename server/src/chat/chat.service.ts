import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatChannel } from './chat-channel.entity';
import { ChatMessage } from './chat-message.entity';
import { ChatParticipant } from './chat-participant.entity';
import { User } from '../users/user.entity';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(ChatChannel)
        private chatChannelRepository: Repository<ChatChannel>,
        @InjectRepository(ChatMessage)
        private chatMessageRepository: Repository<ChatMessage>,
        @InjectRepository(ChatParticipant)
        private chatParticipantRepository: Repository<ChatParticipant>,
    ) { }

    async createChannel(type: 'DM' | 'MATCH_GROUP' | 'TEAM_INTERNAL', name: string, participants: User[], relatedMatchId?: string): Promise<ChatChannel> {
        const channel = this.chatChannelRepository.create({
            type,
            name,
            relatedMatchId
        });
        const savedChannel = await this.chatChannelRepository.save(channel);

        // Create participants
        for (const user of participants) {
            const participant = this.chatParticipantRepository.create({
                channelId: savedChannel.id,
                userId: user.id
            });
            await this.chatParticipantRepository.save(participant);
        }

        return savedChannel;
    }

    async getUserChannels(userId: string): Promise<any[]> {
        // Find channels where user is a participant
        const participations = await this.chatParticipantRepository.find({
            where: { userId },
            relations: ['channel', 'channel.messages', 'channel.messages.sender', 'channel.participants', 'channel.participants.user'],
            order: { channel: { lastActivityAt: 'DESC' } }
        });

        return participations.map(p => {
            const channel = p.channel;
            // Calculate unread count
            const unreadCount = channel.messages.filter(m =>
                m.createdAt > p.lastReadAt && m.senderId !== userId
            ).length;

            const lastMessage = channel.messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

            return {
                ...channel,
                lastMessage,
                unreadCount
            };
        });
    }

    async sendMessage(channelId: string, senderId: string, content: string, isSystemMessage = false): Promise<ChatMessage> {
        const message = this.chatMessageRepository.create({
            channelId,
            senderId,
            content,
            isSystemMessage
        });

        await this.chatMessageRepository.save(message);

        // Update last activity
        await this.chatChannelRepository.update(channelId, { lastActivityAt: new Date() });

        // Update sender's lastReadAt to now (since they sent it)
        await this.chatParticipantRepository.update(
            { channelId, userId: senderId },
            { lastReadAt: new Date() }
        );

        const savedMessage = await this.chatMessageRepository.findOne({
            where: { id: message.id },
            relations: ['sender']
        });

        if (!savedMessage) throw new Error('Failed to create message');
        return savedMessage;
    }

    async getChannelMessages(channelId: string): Promise<ChatMessage[]> {
        return this.chatMessageRepository.find({
            where: { channelId },
            relations: ['sender'],
            order: { createdAt: 'ASC' }
        });
    }

    async markAsRead(channelId: string, userId: string): Promise<void> {
        await this.chatParticipantRepository.update(
            { channelId, userId },
            { lastReadAt: new Date() }
        );
    }

    async getUnreadCount(userId: string): Promise<number> {
        const participations = await this.chatParticipantRepository.find({
            where: { userId },
            relations: ['channel', 'channel.messages']
        });

        let totalUnread = 0;
        for (const p of participations) {
            const count = p.channel.messages.filter(m =>
                m.createdAt > p.lastReadAt && m.senderId !== userId
            ).length;
            totalUnread += count;
        }
        return totalUnread;
    }
}
