import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JoinRequest } from './join-request.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class JoinRequestsService {
    constructor(
        @InjectRepository(JoinRequest)
        private joinRequestsRepository: Repository<JoinRequest>,
        private notificationsService: NotificationsService,
    ) { }

    async create(userId: string, teamId: string, message?: string): Promise<JoinRequest> {
        const joinRequest = this.joinRequestsRepository.create({
            userId,
            teamId,
            message,
            status: 'PENDING',
        });
        const saved = await this.joinRequestsRepository.save(joinRequest);

        // Create notification for team captain
        await this.notificationsService.createJoinRequestNotification(teamId, saved.id, userId);

        return saved;
    }

    async findByTeam(teamId: string): Promise<JoinRequest[]> {
        return this.joinRequestsRepository.find({
            where: { teamId, status: 'PENDING' },
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });
    }

    async findById(id: string): Promise<JoinRequest> {
        const request = await this.joinRequestsRepository.findOne({
            where: { id },
            relations: ['user', 'team'],
        });
        if (!request) {
            throw new Error('Join request not found');
        }
        return request;
    }

    async updateStatus(id: string, status: 'ACCEPTED' | 'REJECTED'): Promise<JoinRequest> {
        await this.joinRequestsRepository.update(id, { status });
        return this.findById(id);
    }
}
