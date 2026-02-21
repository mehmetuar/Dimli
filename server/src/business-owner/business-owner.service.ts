import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessOwner } from './entities/business-owner.entity';
import { ReservationsService } from '../reservations/reservations.service';

@Injectable()
export class BusinessOwnerService {
    constructor(
        @InjectRepository(BusinessOwner)
        private businessOwnerRepository: Repository<BusinessOwner>,
        private reservationsService: ReservationsService,
    ) { }

    async create(createBusinessOwnerDto: any): Promise<BusinessOwner> {
        const owner = this.businessOwnerRepository.create(createBusinessOwnerDto);
        const saved = await this.businessOwnerRepository.save(owner);
        return Array.isArray(saved) ? saved[0] : saved;
    }

    async findByEmail(email: string): Promise<BusinessOwner | null> {
        return this.businessOwnerRepository.findOne({ where: { email }, relations: ['business'] });
    }

    async findOne(id: string): Promise<BusinessOwner | null> {
        return this.businessOwnerRepository.findOne({ where: { id }, relations: ['business', 'business.pitches'] });
    }

    async getDashboardSlots(ownerId: string, dateStr: string) {
        const owner = await this.findOne(ownerId);
        if (!owner || !owner.business) {
            throw new Error('Business not found for this owner');
        }

        const business = owner.business;
        const pitches = business.pitches || [];
        const slotsResponse: any[] = [];

        // Parse date
        const selectedDate = new Date(dateStr); // Expecting YYYY-MM-DD
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);

        for (const pitch of pitches) {
            const pitchSlots: any[] = [];
            const hasCustomSlots = pitch.timeSlots && pitch.timeSlots.length > 0;

            if (hasCustomSlots) {
                // ===== DYNAMIC SLOTS MODE =====
                for (const ts of pitch.timeSlots) {
                    if (!ts.isActive) continue;

                    const [startH, startM] = ts.startTime.split(':').map(Number);
                    const slotTime = new Date(startOfDay);
                    slotTime.setHours(startH, startM, 0, 0);

                    // Find reservations matching this slot's start time
                    const reservations = await this.reservationsService.findByPitchAndDate(pitch.id, slotTime, slotTime);
                    const slotReservations = reservations.filter((r: any) => {
                        const rTime = new Date(r.slotTime);
                        return Math.abs(rTime.getTime() - slotTime.getTime()) < 60000;
                    });

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
                // ===== FALLBACK: HOURLY SLOTS MODE =====
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
        // Verify ownership (TODO)
        return this.reservationsService.approve(reservationId);
    }
}
