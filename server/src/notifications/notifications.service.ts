import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { TeamsService } from '../teams/teams.service';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectRepository(Notification)
        private notificationsRepository: Repository<Notification>,
        private teamsService: TeamsService,
    ) { }

    async createJoinRequestNotification(teamId: string, joinRequestId: string, requesterId: string): Promise<Notification> {
        // Get team to find captain
        const team = await this.teamsService.findOne(teamId);
        if (!team) throw new Error('Team not found');

        const notification = this.notificationsRepository.create({
            userId: team.captainId || (team.captain as any).id, // Captain gets notification
            type: 'JOIN_REQUEST',
            relatedId: joinRequestId,
            metadata: { teamId, requesterId },
            read: false,
        });

        return this.notificationsRepository.save(notification);
    }

    async create(data: Partial<Notification>): Promise<Notification> {
        const notification = this.notificationsRepository.create(data);
        return this.notificationsRepository.save(notification);
    }

    async findByUser(userId: string): Promise<Notification[]> {
        return this.notificationsRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    async markAsRead(id: string): Promise<Notification> {
        await this.notificationsRepository.update(id, { read: true });
        const notification = await this.notificationsRepository.findOne({ where: { id } });
        if (!notification) throw new Error('Notification not found');
        return notification;
    }

    async delete(id: string): Promise<void> {
        await this.notificationsRepository.delete(id);
    }

    async getUnreadCount(userId: string): Promise<number> {
        return this.notificationsRepository.count({
            where: { userId, read: false },
        });
    }
}
