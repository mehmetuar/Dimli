import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule'; // Import Cron
import { MatchAnnouncement } from './match-announcement.entity';
import { User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service'; // Import NotificationsService

@Injectable()
export class MatchAnnouncementsService {
    constructor(
        @InjectRepository(MatchAnnouncement)
        private matchAnnouncementsRepository: Repository<MatchAnnouncement>,
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private notificationsService: NotificationsService, // Inject Service
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



        // Validate date and time - 🆕 IMPROVED: Reject past times strictly
        if (!data.date || !data.time) {
            throw new HttpException('Tarih ve saat gereklidir', HttpStatus.BAD_REQUEST);
        }

        const now = new Date();
        const [hours, minutes] = data.time.split(':').map(Number);

        // Construct announcement date object
        const announcementDate = new Date(data.date);
        announcementDate.setHours(hours, minutes, 0, 0);

        // 🆕 Strictly check if the slot time is in the past
        if (announcementDate < now) {
            throw new HttpException(
                'Geçmiş bir saat için ilan oluşturamazsınız. Lütfen gelecek bir tarih ve saat seçin.',
                HttpStatus.BAD_REQUEST
            );
        }

        // 🆕 Check maximum date - 30 days in the future
        const maxAllowedDate = new Date(now);
        maxAllowedDate.setDate(maxAllowedDate.getDate() + 30);

        if (announcementDate > maxAllowedDate) {
            throw new HttpException(
                'En fazla 30 gün ilerisi için ilan oluşturabilirsiniz.',
                HttpStatus.BAD_REQUEST
            );
        }


        // Optional: Also ensure a minimum buffer (e.g., at least 15 minutes from now)
        // const minAllowedTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 min buffer
        // if (announcementDate < minAllowedTime) {
        //     throw new HttpException(
        //         'İlan en az 15 dakika sonrası için oluşturulmalıdır',
        //         HttpStatus.BAD_REQUEST
        //     );
        // }

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

    // Run every hour to check for expired announcements
    // Using EVERY_MINUTE for testing purposes if needed, but EVERY_HOUR is safer for production unless real-time is critical.
    @Cron(CronExpression.EVERY_HOUR, { name: 'cleanup_expired_announcements' })
    async handleCron() {
        console.log('⏰ Running cleanup cron job...');

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        const currentHour = now.getHours();

        // 1. Find all PENDING announcements
        const announcements = await this.matchAnnouncementsRepository.find({
            where: { status: 'PENDING' },
            relations: ['team', 'team.captain'] // Need captain to notify
        });

        for (const announcement of announcements) {
            let isExpired = false;

            // Check if date is in the past
            if (announcement.date < todayStr) {
                isExpired = true;
            }
            // Check if date is today but time has passed
            else if (announcement.date === todayStr) {
                const [announcementHour] = (announcement.time || '00:00').split(':').map(Number);
                if (announcementHour < currentHour) {
                    isExpired = true;
                }
            }

            if (isExpired) {
                console.log(`🗑️ Expired announcement found: ${announcement.id} (Date: ${announcement.date}, Time: ${announcement.time})`);

                // Notify Captain
                if (announcement.team?.captain) {
                    try {
                        // Cast captain to any to avoid type issues if captainId vs object not perfectly typed in entity
                        const captainId = (announcement.team.captain as any).id || announcement.team.captain;

                        await this.notificationsService.create({
                            userId: captainId,
                            type: 'SYSTEM',
                            read: false,
                            message: 'Maç ilanınızın tarihi geçti. Yeni bir maç oluşturmaya ne dersiniz?',
                            metadata: {
                                type: 'ANNOUNCEMENT_EXPIRED',
                                announcementId: announcement.id
                            }
                        });
                        console.log(`🔔 Notification sent to captain: ${captainId}`);
                    } catch (err) {
                        console.error('❌ Failed to send notification', err);
                    }
                }

                // Delete or Mark Expired
                await this.matchAnnouncementsRepository.remove(announcement);
                // Alternatively: announcement.status = 'EXPIRED'; await repo.save(announcement);
                console.log('✅ Announcement removed.');
            }
        }
    }

    private async deleteExpired(): Promise<void> {
        // Keeping this for redundancy or immediate cleanup on GET requests if cron fails
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        // Delete announcements where date is less than today
        await this.matchAnnouncementsRepository
            .createQueryBuilder()
            .delete()
            .from(MatchAnnouncement)
            .where('date < :today', { today: todayStr })
            .andWhere('status = :status', { status: 'PENDING' })
            .execute();
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

    async delete(id: string, userId: string): Promise<void> {
        const announcement = await this.matchAnnouncementsRepository.findOne({
            where: { id },
            relations: ['team']
        });

        if (!announcement) {
            throw new HttpException('İlan bulunamadı', HttpStatus.NOT_FOUND);
        }

        // Verify ownership (user must be in the team that created the announcement)
        const user = await this.usersRepository.findOne({
            where: { id: userId },
            relations: ['team']
        });

        if (!user?.team || user.team.id !== announcement.teamId) {
            throw new HttpException('Bu ilanı silme yetkiniz yok', HttpStatus.FORBIDDEN);
        }

        await this.matchAnnouncementsRepository.remove(announcement);
    }
}
