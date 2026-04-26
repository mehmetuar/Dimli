import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PitchChangeRequest } from '../pitches/entities/pitch-change-request.entity';
import { Pitch } from '../pitches/entities/pitch.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { Notification } from '../notifications/notification.entity';

@Injectable()
export class PitchChangeRequestsService {
    constructor(
        @InjectRepository(PitchChangeRequest)
        private changeRequestRepository: Repository<PitchChangeRequest>,
        @InjectRepository(Pitch)
        private pitchRepository: Repository<Pitch>,
        @InjectRepository(BusinessOwner)
        private businessOwnerRepository: Repository<BusinessOwner>,
        @InjectRepository(Notification)
        private notificationRepository: Repository<Notification>,
    ) { }

    async createRequest(
        pitchId: string,
        businessId: string,
        type: 'CUSTOM_FACILITY' | 'PHOTO_UPDATE',
        requestedData: any,
    ): Promise<PitchChangeRequest> {
        const pitch = await this.pitchRepository.findOne({ where: { id: pitchId } });
        if (!pitch) throw new NotFoundException('Saha bulunamadı.');

        // Cancel any existing pending request of same type for this pitch
        await this.changeRequestRepository.update(
            { pitchId, type, status: 'pending' },
            { status: 'rejected', rejectionReason: 'Yeni istek ile değiştirildi', reviewedAt: new Date() },
        );

        // Save current data before change
        const currentData =
            type === 'CUSTOM_FACILITY'
                ? { facilities: pitch.facilities }
                : { imageUrl: pitch.imageUrl };

        const request = this.changeRequestRepository.create({
            pitchId,
            businessId,
            type,
            status: 'pending',
            requestedData,
            currentData,
        });

        return this.changeRequestRepository.save(request);
    }

    async getPendingForPitch(pitchId: string): Promise<PitchChangeRequest[]> {
        return this.changeRequestRepository.find({
            where: { pitchId, status: 'pending' },
            order: { createdAt: 'DESC' },
        });
    }

    async getAllPending(): Promise<any[]> {
        const requests = await this.changeRequestRepository.find({
            where: { status: 'pending' },
            relations: ['pitch', 'pitch.business'],
            order: { createdAt: 'DESC' },
        });

        return requests.map(r => ({
            id: r.id,
            type: r.type,
            status: r.status,
            requestedData: r.requestedData,
            currentData: r.currentData,
            createdAt: r.createdAt,
            pitchId: r.pitchId,
            pitchName: r.pitch?.name,
            businessId: r.businessId,
            businessName: r.pitch?.business?.name,
        }));
    }

    async approveRequest(requestId: string): Promise<{ success: boolean }> {
        const request = await this.changeRequestRepository.findOne({
            where: { id: requestId },
            relations: ['pitch'],
        });
        if (!request) throw new NotFoundException('İstek bulunamadı.');

        // Apply the change to the pitch
        if (request.type === 'CUSTOM_FACILITY') {
            const pitch = await this.pitchRepository.findOne({ where: { id: request.pitchId } });
            const currentFacilities = pitch?.facilities || [];
            if (!currentFacilities.includes(request.requestedData.facility)) {
                await this.pitchRepository.update(request.pitchId, {
                    facilities: [...currentFacilities, request.requestedData.facility],
                });
            }
        } else if (request.type === 'PHOTO_UPDATE') {
            await this.pitchRepository.update(request.pitchId, {
                imageUrl: request.requestedData.imageUrl,
            });
        }

        // Mark request as approved
        await this.changeRequestRepository.update(requestId, {
            status: 'approved',
            reviewedAt: new Date(),
        });

        // Send notification to business owner
        await this.sendOwnerNotification(
            request.businessId,
            'PITCH_CHANGE_APPROVED',
            request.type === 'CUSTOM_FACILITY'
                ? `"${request.requestedData.facility}" imkanı onaylandı ve sahanıza eklendi.`
                : 'Saha fotoğrafı değişikliğiniz onaylandı ve yayınlandı.',
            requestId,
        );

        return { success: true };
    }

    async rejectRequest(requestId: string, reason: string): Promise<{ success: boolean }> {
        const request = await this.changeRequestRepository.findOne({ where: { id: requestId } });
        if (!request) throw new NotFoundException('İstek bulunamadı.');

        await this.changeRequestRepository.update(requestId, {
            status: 'rejected',
            rejectionReason: reason,
            reviewedAt: new Date(),
        });

        // Send notification to business owner with rejection reason
        await this.sendOwnerNotification(
            request.businessId,
            'PITCH_CHANGE_REJECTED',
            request.type === 'CUSTOM_FACILITY'
                ? `"${request.requestedData.facility}" imkan isteğiniz reddedildi. Sebep: ${reason}`
                : `Saha fotoğrafı değişiklik isteğiniz reddedildi. Sebep: ${reason}`,
            requestId,
        );

        return { success: true };
    }

    private async sendOwnerNotification(
        businessId: string,
        type: 'PITCH_CHANGE_APPROVED' | 'PITCH_CHANGE_REJECTED',
        message: string,
        relatedId: string,
    ): Promise<void> {
        const owner = await this.businessOwnerRepository.findOne({
            where: { business: { id: businessId } },
            relations: ['business'],
        });
        if (!owner) return;

        const notification = this.notificationRepository.create({
            userId: owner.id,
            type,
            title: type === 'PITCH_CHANGE_APPROVED' ? 'Değişiklik Onaylandı' : 'Değişiklik Reddedildi',
            message,
            relatedId,
            read: false,
        });
        await this.notificationRepository.save(notification);
    }
}
