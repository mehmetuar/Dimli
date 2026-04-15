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
    needsBusinessRating: boolean;
    needsFairPlayRating: boolean;
    opponentTeamId: string | null;
    opponentTeamName: string | null;
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
            const needsBusinessRating = !doneSet.has(`${reservation.id}_BUSINESS`);
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

        // Update the target entity's average score
        if (dto.type === 'BUSINESS' && dto.targetBusinessId) {
            const business = await this.businessRepo.findOne({ where: { id: dto.targetBusinessId } });
            if (business) {
                const currentCount = business.ratingCount || 0;
                const newCount = currentCount + 1;
                const newRating = currentCount === 0
                    ? dto.score
                    : (business.rating * currentCount + dto.score) / newCount;
                await this.businessRepo.update(business.id, {
                    rating: Math.round(newRating * 10) / 10,
                    ratingCount: newCount,
                });
            }
        }

        if (dto.type === 'FAIRPLAY' && dto.targetTeamId) {
            const team = await this.teamRepo.findOne({ where: { id: dto.targetTeamId } });
            if (team) {
                const currentCount = team.fairPlayRatingCount || 0;
                const newCount = currentCount + 1;
                const newScore = currentCount === 0
                    ? dto.score
                    : (team.fairPlayScore * currentCount + dto.score) / newCount;
                await this.teamRepo.update(team.id, {
                    fairPlayScore: Math.round(newScore * 10) / 10,
                    fairPlayRatingCount: newCount,
                });
            }
        }
    }
}
