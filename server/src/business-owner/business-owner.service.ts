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

            // Determine start/end hours for THIS specific pitch
            // Fallback to business hours, then defaults
            const openTime = pitch.openTime || business.openTime || '09:00';
            const closeTime = pitch.closeTime || business.closeTime || '23:00'; // Defaulting to 23:00 if nothing set

            const startHour = parseInt(openTime.split(':')[0]);
            const endHour = parseInt(closeTime.split(':')[0]);

            const hours: number[] = [];
            // Handle next day hours (e.g. closing at 02:00)
            if (endHour < startHour) {
                // Example: 09:00 - 02:00
                // 9, 10 ... 23
                for (let i = startHour; i <= 23; i++) hours.push(i);
                // 0, 1
                for (let i = 0; i < endHour; i++) hours.push(i);
            } else {
                // Example: 09:00 - 23:00
                for (let i = startHour; i < endHour; i++) hours.push(i);
            }

            for (const hour of hours) {
                const slotTime = new Date(startOfDay);
                slotTime.setHours(hour);

                // If we wrapped around to next day (e.g. 01:00 vs 09:00 start)
                if (endHour < startHour && hour < startHour) {
                    slotTime.setDate(slotTime.getDate() + 1);
                }

                // Find reservations
                // Optimization: Fetch all for range once, but for now simplistic approach
                const reservations = await this.reservationsService.findByPitchAndDate(pitch.id, slotTime, slotTime);

                // Filter for this specific hour (since findByPitchAndDate isn't strict yet)
                const slotReservations = reservations.filter((r: any) => {
                    const rTime = new Date(r.slotTime);
                    // Compare timestamps or hours/dates
                    return Math.abs(rTime.getTime() - slotTime.getTime()) < 60000; // within minute
                });

                let status = 'EMPTY'; // GRAY
                const approved = slotReservations.find((r: any) => r.status === 'APPROVED');
                const pending = slotReservations.filter((r: any) => r.status === 'PENDING');

                if (approved) {
                    status = 'FULL'; // RED/GREEN
                } else if (pending.length > 0) {
                    status = 'PENDING'; // ORANGE
                }

                pitchSlots.push({
                    time: `${hour}:00`,
                    iosInfo: slotTime.toISOString(),
                    status,
                    reservations: slotReservations
                });
            }
            slotsResponse.push({
                pitchId: pitch.id,
                pitchName: pitch.name,
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
