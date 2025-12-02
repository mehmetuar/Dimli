```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchAnnouncement } from './match-announcement.entity';
import { User } from '../users/user.entity';

@Injectable()
export class MatchAnnouncementsService {
    constructor(
        @InjectRepository(MatchAnnouncement)
        private matchAnnouncementsRepository: Repository<MatchAnnouncement>,
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) { }

    async create(data: Partial<MatchAnnouncement>, userId: string): Promise<MatchAnnouncement> {
        // Get user to find their team
        const user = await this.usersRepository.findOne({
            where: { id: userId },
            relations: ['team']
        });

        if (!user || !user.team) {
            throw new Error('User must be in a team to create match announcements');
        }

        const announcement = this.matchAnnouncementsRepository.create({
            ...data,
            teamId: user.team.id,
            status: 'PENDING'
        });
        return this.matchAnnouncementsRepository.save(announcement);
    }

    async findAll(filters?: { date?: string; pitchId?: string }): Promise<MatchAnnouncement[]> {
        const query = this.matchAnnouncementsRepository
            .createQueryBuilder('announcement')
            .leftJoinAndSelect('announcement.team', 'team')
            .leftJoinAndSelect('team.captain', 'captain')
            .where('announcement.status = :status', { status: 'PENDING' });

        if (filters?.date) {
            query.andWhere('announcement.date = :date', { date: filters.date });
        }

        if (filters?.pitchId) {
            query.andWhere('announcement.pitchId = :pitchId', { pitchId: filters.pitchId });
        }

        return query.orderBy('announcement.date', 'ASC').addOrderBy('announcement.time', 'ASC').getMany();
    }

    async findByPitch(pitchId: string): Promise<MatchAnnouncement[]> {
        return this.matchAnnouncementsRepository.find({
            where: { pitchId, status: 'PENDING' },
            relations: ['team', 'team.captain'],
            order: { date: 'ASC', time: 'ASC' }
        });
    }
}
