import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  PitchChangeRequest,
  PitchChangeData,
} from '../pitches/entities/pitch-change-request.entity';
import { Pitch } from '../pitches/entities/pitch.entity';
import { Business } from '../business/entities/business.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { Notification } from '../notifications/notification.entity';

export type PendingChangeRequestListItem = Pick<
  PitchChangeRequest,
  | 'id'
  | 'type'
  | 'status'
  | 'requestedData'
  | 'currentData'
  | 'createdAt'
  | 'pitchId'
  | 'businessId'
> & {
  pitchName: string | undefined;
  businessName: string | undefined;
};

@Injectable()
export class PitchChangeRequestsService {
  constructor(
    @InjectRepository(PitchChangeRequest)
    private changeRequestRepository: Repository<PitchChangeRequest>,
    @InjectRepository(Pitch)
    private pitchRepository: Repository<Pitch>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(BusinessOwner)
    private businessOwnerRepository: Repository<BusinessOwner>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  // Sahiplik doğrulaması (pitches.service assertBusinessOwnedBy deseni): guard'sız
  // uçların IDOR'unu kapatır — çağıran, ilgili işletmenin sahibi değilse 403.
  private async assertBusinessOwnedBy(
    businessId: string,
    ownerId: string,
  ): Promise<void> {
    const owner = await this.businessOwnerRepository.findOne({
      where: { business: { id: businessId } },
      relations: ['business'],
    });
    if (!owner || owner.id !== ownerId) {
      throw new ForbiddenException('Bu işletme üzerinde yetkiniz yok.');
    }
  }

  async createRequest(
    pitchId: string,
    ownerId: string,
    type: 'CUSTOM_FACILITY' | 'PHOTO_UPDATE',
    requestedData: PitchChangeData,
  ): Promise<PitchChangeRequest> {
    const pitch = await this.pitchRepository.findOne({
      where: { id: pitchId },
    });
    if (!pitch) throw new NotFoundException('Saha bulunamadı.');

    // GÜVENLİK: businessId artık body'den DEĞİL, sahanın gerçek işletmesinden
    // türetilir; çağıran o işletmenin sahibi olmalı (aksi halde 403).
    await this.assertBusinessOwnedBy(pitch.businessId, ownerId);
    const businessId = pitch.businessId;

    // Cancel any existing pending request of same type for this pitch
    await this.changeRequestRepository.update(
      { pitchId, type, status: 'pending' },
      {
        status: 'rejected',
        rejectionReason: 'Yeni istek ile değiştirildi',
        reviewedAt: new Date(),
      },
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

  async getPendingForPitch(
    pitchId: string,
    ownerId: string,
  ): Promise<PitchChangeRequest[]> {
    const pitch = await this.pitchRepository.findOne({
      where: { id: pitchId },
    });
    if (!pitch) throw new NotFoundException('Saha bulunamadı.');
    await this.assertBusinessOwnedBy(pitch.businessId, ownerId);
    return this.changeRequestRepository.find({
      where: { pitchId, status: 'pending' },
      order: { createdAt: 'DESC' },
    });
  }

  // İşletme kapak fotoğrafı (businesses.coverImageUrl) değişikliği — saha akışıyla
  // aynı yaşam döngüsü, pitch_id NULL taşır.
  async createBusinessPhotoRequest(
    businessId: string,
    ownerId: string,
    requestedData: PitchChangeData,
  ): Promise<PitchChangeRequest> {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('İşletme bulunamadı.');
    // GÜVENLİK: çağıran bu işletmenin sahibi olmalı (IDOR kapalı).
    await this.assertBusinessOwnedBy(businessId, ownerId);

    await this.changeRequestRepository.update(
      {
        businessId,
        pitchId: IsNull(),
        type: 'BUSINESS_PHOTO_UPDATE',
        status: 'pending',
      },
      {
        status: 'rejected',
        rejectionReason: 'Yeni istek ile değiştirildi',
        reviewedAt: new Date(),
      },
    );

    const request = this.changeRequestRepository.create({
      pitchId: null,
      businessId,
      type: 'BUSINESS_PHOTO_UPDATE',
      status: 'pending',
      requestedData,
      currentData: { imageUrl: business.coverImageUrl },
    });

    return this.changeRequestRepository.save(request);
  }

  async getPendingForBusiness(
    businessId: string,
    ownerId: string,
  ): Promise<PitchChangeRequest[]> {
    await this.assertBusinessOwnedBy(businessId, ownerId);
    return this.changeRequestRepository.find({
      where: { businessId, pitchId: IsNull(), status: 'pending' },
      order: { createdAt: 'DESC' },
    });
  }

  async getAllPending(): Promise<PendingChangeRequestListItem[]> {
    const requests = await this.changeRequestRepository.find({
      where: { status: 'pending' },
      relations: ['pitch', 'pitch.business'],
      order: { createdAt: 'DESC' },
    });

    return requests.map((r) => ({
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
    if (request.type === 'CUSTOM_FACILITY' && request.pitchId) {
      const pitch = await this.pitchRepository.findOne({
        where: { id: request.pitchId },
      });
      const currentFacilities = pitch?.facilities || [];
      if (
        !currentFacilities.includes(request.requestedData.facility as string)
      ) {
        await this.pitchRepository.update(request.pitchId, {
          facilities: [
            ...currentFacilities,
            request.requestedData.facility as string,
          ],
        });
      }
    } else if (request.type === 'PHOTO_UPDATE' && request.pitchId) {
      await this.pitchRepository.update(request.pitchId, {
        imageUrl: request.requestedData.imageUrl,
      });
    } else if (request.type === 'BUSINESS_PHOTO_UPDATE') {
      await this.businessRepository.update(request.businessId, {
        coverImageUrl: request.requestedData.imageUrl,
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

  async rejectRequest(
    requestId: string,
    reason: string,
  ): Promise<{ success: boolean }> {
    const request = await this.changeRequestRepository.findOne({
      where: { id: requestId },
    });
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
      title:
        type === 'PITCH_CHANGE_APPROVED'
          ? 'Değişiklik Onaylandı'
          : 'Değişiklik Reddedildi',
      message,
      relatedId,
      read: false,
    });
    await this.notificationRepository.save(notification);
  }
}
