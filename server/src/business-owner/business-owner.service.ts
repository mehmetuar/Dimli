import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, IsNull, In, MoreThanOrEqual } from 'typeorm';
import { BusinessOwner } from './entities/business-owner.entity';
import { ReservationsService } from '../reservations/reservations.service';
import { Pitch } from '../pitches/entities/pitch.entity';
import { Reservation, ReservationStatus } from '../reservations/entities/reservation.entity';
import { Business } from '../business/entities/business.entity';
import { RatingsService } from '../ratings/ratings.service';
import { Subscription } from '../subscription/entities/subscription.entity';
import { TimeSlot } from '../pitches/entities/time-slot.entity';

@Injectable()
export class BusinessOwnerService {
    constructor(
        @InjectRepository(BusinessOwner)
        private businessOwnerRepository: Repository<BusinessOwner>,
        @InjectRepository(Pitch)
        private pitchRepository: Repository<Pitch>,
        @InjectRepository(Reservation)
        private reservationRepository: Repository<Reservation>,
        @InjectRepository(Business)
        private businessRepository: Repository<Business>,
        private reservationsService: ReservationsService,
        private ratingsService: RatingsService,
    ) { }

    async create(createBusinessOwnerDto: any): Promise<BusinessOwner> {
        const owner = this.businessOwnerRepository.create(createBusinessOwnerDto);
        const saved = await this.businessOwnerRepository.save(owner);
        return Array.isArray(saved) ? saved[0] : saved;
    }

    async updatePushToken(id: string, pushToken: string): Promise<void> {
        await this.businessOwnerRepository.update(id, { pushToken });
    }

    async updatePassword(id: string, passwordHash: string): Promise<void> {
        await this.businessOwnerRepository.update(id, { password: passwordHash });
    }

    async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
        const owner = await this.businessOwnerRepository.findOne({ where: { id } });
        if (!owner) {
            throw new NotFoundException('İşletme bulunamadı.');
        }
        const isMatch = await bcrypt.compare(currentPassword, owner.password);
        if (!isMatch) {
            throw new BadRequestException('Mevcut şifre hatalı.');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.updatePassword(id, hashedPassword);
    }

    async findByEmail(email: string): Promise<BusinessOwner | null> {
        return this.businessOwnerRepository.findOne({ where: { email }, relations: ['business'] });
    }

    async findByPhone(phone: string): Promise<BusinessOwner | null> {
        return this.businessOwnerRepository.findOne({ where: { phone } });
    }

    async findOne(id: string): Promise<BusinessOwner | null> {
        return this.businessOwnerRepository.findOne({
            where: { id },
            relations: ['business', 'business.pitches', 'business.pitches.timeSlots'],
        });
    }

    async getDashboardSlots(ownerId: string, dateStr: string) {
        const owner = await this.findOne(ownerId);
        if (!owner || !owner.business) {
            throw new Error('Business not found for this owner');
        }

        const business = owner.business;
        const pitches = business.pitches || [];
        const slotsResponse: any[] = [];

        const selectedDate = new Date(dateStr);
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);

        // Day name for closed-day check (en-US locale gives English names)
        const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });

        for (const pitch of pitches) {
            // Check if pitch is passive or permanently closed on this day
            const isClosed = pitch.isActive === false || (pitch.closedDays && pitch.closedDays.includes(dayName));
            if (isClosed) {
                slotsResponse.push({
                    pitchId: pitch.id,
                    pitchName: pitch.name,
                    hasCustomSlots: false,
                    isClosed: true,
                    closedReason: pitch.isActive === false ? 'PASSIVE' : 'CLOSED_DAY',
                    slots: []
                });
                continue;
            }

            const pitchSlots: any[] = [];
            const hasCustomSlots = pitch.timeSlots && pitch.timeSlots.length > 0;

            if (hasCustomSlots) {
                for (const ts of pitch.timeSlots) {
                    if (!ts.isActive) continue;

                    const [startH, startM] = ts.startTime.split(':').map(Number);
                    const slotTime = new Date(startOfDay);
                    slotTime.setHours(startH, startM, 0, 0);

                    const reservations = await this.reservationsService.findByPitchAndDate(pitch.id, slotTime, slotTime);
                    const slotReservations = reservations.filter((r: any) => {
                        const rTime = new Date(r.slotTime);
                        return Math.abs(rTime.getTime() - slotTime.getTime()) < 60000;
                    });

                    // Enrich reservations with playedMatchCount and playerCount
                    for (const res of slotReservations) {
                        if (res.teamId) {
                            (res.team as any).playedMatchCount = await this.ratingsService.getTeamMatchCount(res.teamId);
                            (res.team as any).playerCount = await this.ratingsService.getTeamPlayerCount(res.teamId);
                        }
                        if (res.opponentTeamId) {
                            (res.opponentTeam as any).playedMatchCount = await this.ratingsService.getTeamMatchCount(res.opponentTeamId);
                            (res.opponentTeam as any).playerCount = await this.ratingsService.getTeamPlayerCount(res.opponentTeamId);
                        }
                    }

                    let status = 'EMPTY';
                    const approved = slotReservations.find((r: any) => r.status === 'APPROVED');
                    const pending = slotReservations.filter((r: any) => r.status === 'PENDING');

                    if (approved) {
                        status = 'FULL';
                    } else if (pending.length > 0) {
                        status = 'PENDING';
                    }

                    pitchSlots.push({
                        time: `${ts.startTime} - ${ts.endTime}`,
                        startTime: ts.startTime,
                        endTime: ts.endTime,
                        iosInfo: slotTime.toISOString(),
                        status,
                        reservations: slotReservations
                    });
                }
            } else {
                const openTime = pitch.openTime || business.openTime || '09:00';
                const closeTime = pitch.closeTime || business.closeTime || '23:00';

                const startHour = parseInt(openTime.split(':')[0]);
                const endHour = parseInt(closeTime.split(':')[0]);

                const hours: number[] = [];
                if (endHour < startHour) {
                    for (let i = startHour; i <= 23; i++) hours.push(i);
                    for (let i = 0; i < endHour; i++) hours.push(i);
                } else {
                    for (let i = startHour; i < endHour; i++) hours.push(i);
                }

                for (const hour of hours) {
                    const slotTime = new Date(startOfDay);
                    slotTime.setHours(hour);

                    if (endHour < startHour && hour < startHour) {
                        slotTime.setDate(slotTime.getDate() + 1);
                    }

                    const reservations = await this.reservationsService.findByPitchAndDate(pitch.id, slotTime, slotTime);
                    const slotReservations = reservations.filter((r: any) => {
                        const rTime = new Date(r.slotTime);
                        return Math.abs(rTime.getTime() - slotTime.getTime()) < 60000;
                    });

                    // Enrich reservations with playedMatchCount and playerCount
                    for (const res of slotReservations) {
                        if (res.teamId) {
                            (res.team as any).playedMatchCount = await this.ratingsService.getTeamMatchCount(res.teamId);
                            (res.team as any).playerCount = await this.ratingsService.getTeamPlayerCount(res.teamId);
                        }
                        if (res.opponentTeamId) {
                            (res.opponentTeam as any).playedMatchCount = await this.ratingsService.getTeamMatchCount(res.opponentTeamId);
                            (res.opponentTeam as any).playerCount = await this.ratingsService.getTeamPlayerCount(res.opponentTeamId);
                        }
                    }

                    let status = 'EMPTY';
                    const approved = slotReservations.find((r: any) => r.status === 'APPROVED');
                    const pending = slotReservations.filter((r: any) => r.status === 'PENDING');

                    if (approved) {
                        status = 'FULL';
                    } else if (pending.length > 0) {
                        status = 'PENDING';
                    }

                    pitchSlots.push({
                        time: `${hour}:00`,
                        startTime: `${hour.toString().padStart(2, '0')}:00`,
                        endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
                        iosInfo: slotTime.toISOString(),
                        status,
                        reservations: slotReservations
                    });
                }
            }

            slotsResponse.push({
                pitchId: pitch.id,
                pitchName: pitch.name,
                hasCustomSlots,
                slots: pitchSlots
            });
        }

        return {
            businessName: business.name,
            date: dateStr,
            pitches: slotsResponse
        };
    }

    async approveReservation(reservationId: string, ownerId: string) {
        return this.reservationsService.approve(reservationId);
    }

    async getStats(ownerId: string) {
        const owner = await this.findOne(ownerId);
        if (!owner || !owner.business) {
            throw new Error('Business not found for this owner');
        }

        const business = await this.businessRepository.findOne({
            where: { id: owner.business.id },
            relations: ['pitches'],
        });

        if (!business) throw new Error('Business not found');

        // Tarih aralıkları
        const now = new Date();

        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const pitchStats: any[] = [];
        let totalTodayConfirmed = 0;
        let totalTodayEarnings = 0;
        let totalTodayManual = 0;
        let totalMonthConfirmed = 0;
        let totalMonthEarnings = 0;
        let totalMonthManual = 0;

        for (const pitch of business.pitches) {
            const pricePerHour = pitch.pricePerHour || 0;

            // Bugün - gerçek maçlar (teamId NOT NULL)
            const todayConfirmedCount = await this.reservationRepository.count({
                where: {
                    pitch: { id: pitch.id },
                    status: ReservationStatus.APPROVED,
                    teamId: Not(IsNull()),
                    slotTime: Between(startOfToday, endOfToday),
                },
            });

            // Bugün - manuel dolu (teamId NULL)
            const todayManualCount = await this.reservationRepository.count({
                where: {
                    pitch: { id: pitch.id },
                    status: ReservationStatus.APPROVED,
                    teamId: IsNull(),
                    slotTime: Between(startOfToday, endOfToday),
                },
            });

            // Bu ay - gerçek maçlar
            const monthConfirmedCount = await this.reservationRepository.count({
                where: {
                    pitch: { id: pitch.id },
                    status: ReservationStatus.APPROVED,
                    teamId: Not(IsNull()),
                    slotTime: Between(startOfMonth, endOfMonth),
                },
            });

            // Bu ay - manuel dolu
            const monthManualCount = await this.reservationRepository.count({
                where: {
                    pitch: { id: pitch.id },
                    status: ReservationStatus.APPROVED,
                    teamId: IsNull(),
                    slotTime: Between(startOfMonth, endOfMonth),
                },
            });

            const todayEarnings = todayConfirmedCount * pricePerHour;
            const monthEarnings = monthConfirmedCount * pricePerHour;

            pitchStats.push({
                pitchId: pitch.id,
                pitchName: pitch.name,
                pricePerHour,
                today: {
                    confirmedCount: todayConfirmedCount,
                    earnings: todayEarnings,
                    manualFillCount: todayManualCount,
                },
                thisMonth: {
                    confirmedCount: monthConfirmedCount,
                    earnings: monthEarnings,
                    manualFillCount: monthManualCount,
                },
            });

            totalTodayConfirmed += todayConfirmedCount;
            totalTodayEarnings += todayEarnings;
            totalTodayManual += todayManualCount;
            totalMonthConfirmed += monthConfirmedCount;
            totalMonthEarnings += monthEarnings;
            totalMonthManual += monthManualCount;
        }

        return {
            businessName: business.name,
            rating: business.rating,
            ratingCount: business.ratingCount,
            pitches: pitchStats,
            totals: {
                today: {
                    confirmedCount: totalTodayConfirmed,
                    earnings: totalTodayEarnings,
                    manualFillCount: totalTodayManual,
                },
                thisMonth: {
                    confirmedCount: totalMonthConfirmed,
                    earnings: totalMonthEarnings,
                    manualFillCount: totalMonthManual,
                },
            },
        };
    }

    async deleteAccount(ownerId: string): Promise<{ success: boolean; message?: string }> {
        const owner = await this.businessOwnerRepository.findOne({
            where: { id: ownerId },
            relations: ['business', 'business.pitches'],
        });

        if (!owner) throw new NotFoundException('İşletme sahibi bulunamadı');

        const now = new Date();
        
        if (owner.business && owner.business.pitches && owner.business.pitches.length > 0) {
            const pitchIds = owner.business.pitches.map(p => p.id);
            const futureReservationsCount = await this.reservationRepository.count({
                where: {
                    pitch: { id: In(pitchIds) },
                    status: ReservationStatus.APPROVED,
                    slotTime: MoreThanOrEqual(now)
                }
            });

            if (futureReservationsCount > 0) {
                throw new BadRequestException('İleri tarihli kesinleşmiş rezervasyonunuz bulunduğu için hesabınızı şu an silemezsiniz.');
            }
        }

        const queryRunner = this.businessOwnerRepository.manager.connection.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            if (owner.business) {
                await queryRunner.manager.delete(Subscription, { ownerId: owner.id });
                
                if (owner.business.pitches && owner.business.pitches.length > 0) {
                    const pitchIds = owner.business.pitches.map(p => p.id);
                    await queryRunner.manager.delete(Reservation, { pitch: { id: In(pitchIds) } });
                    await queryRunner.manager.delete(TimeSlot, { pitchId: In(pitchIds) });
                    await queryRunner.manager.delete(Pitch, { business: { id: owner.business.id } });
                }
                
                await queryRunner.manager.delete(Business, { id: owner.business.id });
            }
            
            await queryRunner.manager.delete(BusinessOwner, { id: owner.id });

            await queryRunner.commitTransaction();
            return { success: true, message: 'Hesap başarıyla silindi.' };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw new InternalServerErrorException('Hesap silinirken bir hata oluştu.');
        } finally {
            await queryRunner.release();
        }
    }
}
