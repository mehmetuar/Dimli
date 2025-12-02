import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchAnnouncement } from './match-announcement.entity';

@Injectable()
export class MatchAnnouncementsService {
    constructor(
        @InjectRepository(MatchAnnouncement)
        private matchAnnouncementsRepository: Repository<MatchAnnouncement>,
    ) { }

    async create(data: Partial<MatchAnnouncement>, userId: string): Promise<MatchAnnouncement> {
        // Get user's team
        const announcement = this.matchAnnouncementsRepository.create({
            ...data,
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
