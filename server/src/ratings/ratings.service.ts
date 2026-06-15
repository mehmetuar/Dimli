import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import { Rating } from './rating.entity';
import { Reservation, ReservationStatus } from '../reservations/entities/reservation.entity';
import { Business } from '../business/entities/business.entity';
import { Team } from '../teams/team.entity';
import { User } from '../users/user.entity';
import { CreateRatingDto } from './dto/create-rating.dto';

export interface PendingRating {
    reservationId: string;
    slotTime: string;
    pitchName: string;
    businessName: string;
    businessId: string;
    businessDeleted: boolean;
    needsBusinessRating: boolean;
    needsFairPlayRating: boolean;
    opponentTeamId: string | null;
    opponentTeamName: string | null;
}

export interface MatchHistoryItem {
    reservationId: string;
    slotTime: string;
    pitchName: string;
    businessName: string;
    businessId: string;
    businessDeleted: boolean;
    opponentTeamId: string | null;
    opponentTeamName: string | null;
    isBusinessRated: boolean;
    isFairPlayRated: boolean;
    businessScore: number | null;
    fairPlayScore: number | null;
    needsBusinessRating: boolean;
    needsFairPlayRating: boolean;
}

@Injectable()
export class RatingsService {
    constructor(
        @InjectRepository(Rating)
        private ratingRepo: Repository<Rating>,
        @InjectRepository(Reservation)
        private reservationRepo: Repository<Reservation>,
        @InjectRepository(Business)
        private businessRepo: Repository<Business>,
        @InjectRepository(Team)
        private teamRepo: Repository<Team>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
    ) {}

    async getPendingRatings(userId: string): Promise<PendingRating[]> {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user || !user.teamId) return [];

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        // Find played APPROVED reservations: filter slotTime at DB level
        const played = await this.reservationRepo.find({
            where: [
                { status: ReservationStatus.APPROVED, teamId: user.teamId, slotTime: LessThan(oneHourAgo) },
                { status: ReservationStatus.APPROVED, opponentTeamId: user.teamId, slotTime: LessThan(oneHourAgo) },
            ],
            relations: ['pitch', 'pitch.business', 'opponentTeam'],
        });

        if (played.length === 0) return [];

        // Deduplicate (same reservation may appear in both OR branches)
        const seen = new Set<string>();
        const uniquePlayed = played.filter(r => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
        });

        const reservationIds = uniquePlayed.map(r => r.id);

        // Load existing ratings by this user for these reservations
        const existingRatings = await this.ratingRepo.find({
            where: {
                ratedByUserId: userId,
                reservationId: In(reservationIds),
            },
        });

        const doneSet = new Set(existingRatings.map(r => `${r.reservationId}_${r.type}`));

        const results: PendingRating[] = [];

        for (const reservation of uniquePlayed) {
            if (!reservation.pitch?.business) continue;

            // opponentTeamId being null means "kendi aramizda" — no fair play rating needed
            const hasOpponent = !!reservation.opponentTeamId;
            // İşletme hesabı silinmişse artık yeni bir işletme değerlendirmesi teklif edilmez
            const needsBusinessRating = !reservation.pitch.business.deletedAt && !doneSet.has(`${reservation.id}_BUSINESS`);
            const needsFairPlayRating = hasOpponent && !doneSet.has(`${reservation.id}_FAIRPLAY`);

            if (!needsBusinessRating && !needsFairPlayRating) continue;

            // Determine which team is the "opponent" from this user's perspective
            let opponentTeamId: string | null = null;
            let opponentTeamName: string | null = null;
            if (hasOpponent && needsFairPlayRating) {
                if (reservation.opponentTeamId === user.teamId) {
                    // User is in the opponentTeam — they rate the main team
                    const mainTeam = await this.teamRepo.findOne({ where: { id: reservation.teamId } });
                    opponentTeamId = reservation.teamId;
                    opponentTeamName = mainTeam?.name || null;
                } else {
                    // User is in the main team — they rate the opponentTeam
                    opponentTeamId = reservation.opponentTeamId;
                    opponentTeamName = reservation.opponentTeam?.name || null;
                }
            }

            results.push({
                reservationId: reservation.id,
                slotTime: reservation.slotTime.toISOString(),
                pitchName: reservation.pitch.name,
                businessName: reservation.pitch.business.name,
                businessId: reservation.pitch.business.id,
                businessDeleted: !!reservation.pitch.business.deletedAt,
                needsBusinessRating,
                needsFairPlayRating,
                opponentTeamId,
                opponentTeamName,
            });
        }

        results.sort((a, b) => new Date(a.slotTime).getTime() - new Date(b.slotTime).getTime());
        return results;
    }

    async submitRating(userId: string, dto: CreateRatingDto): Promise<void> {
        if (!dto.score || dto.score < 1 || dto.score > 5) {
            throw new BadRequestException('Puan 1 ile 5 arasında olmalıdır.');
        }

        // Check for duplicate
        const existing = await this.ratingRepo.findOne({
            where: {
                reservationId: dto.reservationId,
                ratedByUserId: userId,
                type: dto.type,
            },
        });
        if (existing) {
            throw new ConflictException('Bu maç için zaten değerlendirme yapıldı.');
        }

        // Save the rating row directly (no transaction — simpler and avoids DataSource injection issues)
        const rating = new Rating();
        rating.reservationId = dto.reservationId;
        rating.ratedByUserId = userId;
        rating.type = dto.type;
        rating.targetBusinessId = dto.targetBusinessId || null;
        rating.targetTeamId = dto.targetTeamId || null;
        rating.score = dto.score;
        await this.ratingRepo.save(rating);

        // Update the target entity's average score using DB-level aggregation
        if (dto.type === 'BUSINESS' && dto.targetBusinessId) {
            const { avg, count } = await this.ratingRepo
                .createQueryBuilder('r')
                .select('AVG(r.score)', 'avg')
                .addSelect('COUNT(*)', 'count')
                .where('r.type = :type', { type: 'BUSINESS' })
                .andWhere('r.targetBusinessId = :id', { id: dto.targetBusinessId })
                .getRawOne();
            await this.businessRepo.update(dto.targetBusinessId, {
                rating: Math.round(parseFloat(avg) * 10) / 10,
                ratingCount: parseInt(count, 10),
            });
        }

        if (dto.type === 'FAIRPLAY' && dto.targetTeamId) {
            const { avg, count } = await this.ratingRepo
                .createQueryBuilder('r')
                .select('AVG(r.score)', 'avg')
                .addSelect('COUNT(*)', 'count')
                .where('r.type = :type', { type: 'FAIRPLAY' })
                .andWhere('r.targetTeamId = :id', { id: dto.targetTeamId })
                .getRawOne()
            await this.teamRepo.update(dto.targetTeamId, {
                fairPlayScore: Math.round(parseFloat(avg) * 10) / 10,
                fairPlayRatingCount: parseInt(count, 10),
            });
        }
    }

    async getMatchHistory(userId: string): Promise<MatchHistoryItem[]> {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user || !user.teamId) return [];

        const now = new Date();

        // Geçmiş tüm APPROVED rezervasyonları getir (hem ev sahibi hem misafir olarak)
        const played = await this.reservationRepo.find({
            where: [
                { status: ReservationStatus.APPROVED, teamId: user.teamId, slotTime: LessThan(now) },
                { status: ReservationStatus.APPROVED, opponentTeamId: user.teamId, slotTime: LessThan(now) },
            ],
            relations: ['pitch', 'pitch.business', 'opponentTeam'],
        });

        if (played.length === 0) return [];

        // Duplikatları temizle
        const seen = new Set<string>();
        const uniquePlayed = played.filter(r => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
        });

        const reservationIds = uniquePlayed.map(r => r.id);

        // Bu kullanıcının bu rezervasyonlar için yaptığı tüm rating'leri getir
        const existingRatings = await this.ratingRepo.find({
            where: {
                ratedByUserId: userId,
                reservationId: In(reservationIds),
            },
        });

        const ratingMap = new Map<string, { type: string; score: number }[]>();
        for (const r of existingRatings) {
            if (!ratingMap.has(r.reservationId)) ratingMap.set(r.reservationId, []);
            ratingMap.get(r.reservationId)!.push({ type: r.type, score: r.score });
        }

        const results: MatchHistoryItem[] = [];

        for (const reservation of uniquePlayed) {
            if (!reservation.pitch?.business) continue;

            const hasOpponent = !!reservation.opponentTeamId;
            const ratings = ratingMap.get(reservation.id) || [];
            const businessRating = ratings.find(r => r.type === 'BUSINESS');
            const fairPlayRating = ratings.find(r => r.type === 'FAIRPLAY');

            const isBusinessRated = !!businessRating;
            const isFairPlayRated = !!fairPlayRating;

            // Rakip perspektifini belirle
            let opponentTeamId: string | null = null;
            let opponentTeamName: string | null = null;
            if (hasOpponent) {
                if (reservation.opponentTeamId === user.teamId) {
                    const mainTeam = await this.teamRepo.findOne({ where: { id: reservation.teamId } });
                    opponentTeamId = reservation.teamId;
                    opponentTeamName = mainTeam?.name || null;
                } else {
                    opponentTeamId = reservation.opponentTeamId;
                    opponentTeamName = reservation.opponentTeam?.name || null;
                }
            }

            results.push({
                reservationId: reservation.id,
                slotTime: reservation.slotTime.toISOString(),
                pitchName: reservation.pitch.name,
                businessName: reservation.pitch.business.name,
                businessId: reservation.pitch.business.id,
                businessDeleted: !!reservation.pitch.business.deletedAt,
                opponentTeamId,
                opponentTeamName,
                isBusinessRated,
                isFairPlayRated,
                businessScore: businessRating?.score ?? null,
                fairPlayScore: fairPlayRating?.score ?? null,
                needsBusinessRating: !reservation.pitch.business.deletedAt && !isBusinessRated,
                needsFairPlayRating: hasOpponent && !isFairPlayRated,
            });
        }

        // En yeniden eskiye sırala
        results.sort((a, b) => new Date(b.slotTime).getTime() - new Date(a.slotTime).getTime());
        return results;
    }

    async getTeamMatchCount(teamId: string): Promise<number> {
        const now = new Date();
        return this.reservationRepo
            .createQueryBuilder('r')
            .where('r.status = :status', { status: ReservationStatus.APPROVED })
            .andWhere('r.slotTime < :now', { now })
            .andWhere('(r.teamId = :teamId OR r.opponentTeamId = :teamId)', { teamId })
            .getCount();
    }

    async getTeamPlayerCount(teamId: string | null): Promise<number> {
        if (!teamId) return 0;
        return this.userRepo.count({ where: { teamId } });
    }
}
