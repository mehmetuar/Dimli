import { Injectable, ConflictException, ForbiddenException } from '@nestjs/common';
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
        const existing = await this.joinRequestsRepository.findOne({
            where: { userId, teamId, status: 'PENDING' },
        });
        if (existing) {
            throw new ConflictException('Bu takıma zaten bekleyen bir katılma isteğin var.');
        }

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

    async findPendingByUser(userId: string): Promise<JoinRequest[]> {
        return this.joinRequestsRepository.find({
            where: { userId, status: 'PENDING' },
        });
    }

    async cancelRequest(id: string, userId: string): Promise<void> {
        const request = await this.joinRequestsRepository.findOne({ where: { id } });
        if (!request) throw new Error('Join request not found');
        if (request.userId !== userId) throw new ForbiddenException('Bu isteği iptal etme yetkiniz yok.');
        await this.joinRequestsRepository.update(id, { status: 'CANCELLED' });
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

    async resolveOnTeamJoin(userId: string, joinedTeamId: string): Promise<void> {
        const pending = await this.findPendingByUser(userId);
        if (!pending.length) return;
        for (const request of pending) {
            request.status = request.teamId === joinedTeamId ? 'ACCEPTED' : 'CANCELLED';
        }
        await this.joinRequestsRepository.save(pending);
    }

    async cancelAllPendingExcept(userId: string, exceptId: string): Promise<void> {
        await this.joinRequestsRepository
            .createQueryBuilder()
            .update()
            .set({ status: 'CANCELLED' })
            .where('userId = :userId AND status = :status AND id != :exceptId', {
                userId,
                status: 'PENDING',
                exceptId,
            })
            .execute();
    }
}
