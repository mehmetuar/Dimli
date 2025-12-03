import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
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

        console.log('🔍 Creating announcement - User ID:', userId);
        console.log('👤 User found:', { id: user?.id, username: user?.username });
        console.log('🏆 User team:', { id: user?.team?.id, name: user?.team?.name });

        if (!user || !user.team) {
            throw new Error('User must be in a team to create match announcements');
        }

        console.log('✅ Using teamId:', user.team.id);

        // Check for duplicate announcement (same team, pitch, time, date)
        const existingAnnouncement = await this.matchAnnouncementsRepository.findOne({
            where: {
                teamId: user.team.id,
                pitchId: data.pitchId,
                time: data.time,
                date: data.date,
                status: 'PENDING'
            }
        });

        if (existingAnnouncement) {
            throw new HttpException(
                'Bu saat için zaten aktif bir ilanınız var',
                HttpStatus.CONFLICT
            );
        }

        const announcement = this.matchAnnouncementsRepository.create({
            ...data,
            teamId: user.team.id,
            status: 'PENDING'
        });

        const saved = await this.matchAnnouncementsRepository.save(announcement);
        console.log('💾 Saved announcement:', { id: saved.id, teamId: saved.teamId });

        return saved;
    }

    async findAll(filters?: { date?: string; pitchId?: string }): Promise<MatchAnnouncement[]> {
        // Clean up expired announcements first
        await this.deleteExpired();

        const query = this.matchAnnouncementsRepository
            .createQueryBuilder('announcement')
            .leftJoinAndSelect('announcement.team', 'team')
            .leftJoinAndSelect('team.captain', 'captain')
            .leftJoinAndSelect('team.players', 'players') // Added to load all players
            .where('announcement.status = :status', { status: 'PENDING' });

        if (filters?.date) {
            query.andWhere('announcement.date = :date', { date: filters.date });
        }

        if (filters?.pitchId) {
            query.andWhere('announcement.pitchId = :pitchId', { pitchId: filters.pitchId });
        }

        const announcements = await query.orderBy('announcement.date', 'ASC').addOrderBy('announcement.time', 'ASC').getMany();
        console.log(`📢 Found ${announcements.length} announcements`);
        if (announcements.length > 0) {
            console.log('First announcement team:', {
                name: announcements[0].team?.name,
                playersCount: announcements[0].team?.players?.length
            });
        }
        return announcements;
    }

    private async deleteExpired(): Promise<void> {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        // Delete announcements where date is less than today
        // Note: We keep today's announcements even if time has passed, or we could check time too.
        // For now, let's just delete strictly past dates.
        await this.matchAnnouncementsRepository
            .createQueryBuilder()
            .delete()
            .from(MatchAnnouncement)
            .where('date < :today', { today: todayStr })
            .execute();

        console.log('🧹 Cleaned up expired announcements before', todayStr);
    }

    async findByPitch(pitchId: string): Promise<MatchAnnouncement[]> {
        const announcements = await this.matchAnnouncementsRepository
            .createQueryBuilder('announcement')
            .leftJoinAndSelect('announcement.team', 'team')
            .leftJoinAndSelect('team.captain', 'captain')
            .leftJoinAndSelect('team.players', 'players')  // Load all players for team modal
            .where('announcement.pitchId = :pitchId', { pitchId })
            .andWhere('announcement.status = :status', { status: 'PENDING' })
            .orderBy('announcement.date', 'ASC')
            .addOrderBy('announcement.time', 'ASC')
            .getMany();

        console.log(`📍 Found ${announcements.length} announcements for pitch ${pitchId}`);
        if (announcements.length > 0 && announcements[0].team) {
            console.log('First team:', {
                name: announcements[0].team.name,
                playersCount: announcements[0].team.players?.length,
                playerNames: announcements[0].team.players?.map(p => p.username)
            });
        }

        return announcements;
    }
}
