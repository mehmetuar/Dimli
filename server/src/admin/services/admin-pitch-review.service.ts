import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pitch } from '../../pitches/entities/pitch.entity';
import { PitchChangeRequest } from '../../pitches/entities/pitch-change-request.entity';
import { Notification } from '../../notifications/notification.entity';
import { BusinessOwner } from '../../business-owner/entities/business-owner.entity';
import { FacilitiesService } from '../../facilities/facilities.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Paginated, paginate } from '../../common/dto/paginated';
import { applySearch } from './admin.util';

@Injectable()
export class AdminPitchReviewService {
  constructor(
    @InjectRepository(Pitch)
    private pitchRepository: Repository<Pitch>,
    @InjectRepository(PitchChangeRequest)
    private changeRequestRepository: Repository<PitchChangeRequest>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(BusinessOwner)
    private businessOwnerRepository: Repository<BusinessOwner>,
    private readonly facilitiesService: FacilitiesService,
  ) {}

  // ─── Change Requests ─────────────────────────────────────────────────────

  async getChangeRequests(
    status: string | undefined,
    p: PaginationQueryDto,
  ): Promise<Paginated<any>> {
    const effectiveStatus = status ?? 'pending';
    const skip = (p.page - 1) * p.limit;
    const searchCols = ['pitch.name', 'business.name'];

    // pitch/business ManyToOne → satır çoğaltmaz; yine de tek-tip için ayrı count.
    const countQb = this.changeRequestRepository
      .createQueryBuilder('r')
      .leftJoin('r.pitch', 'pitch')
      .leftJoin('pitch.business', 'business')
      .where('r.status = :status', { status: effectiveStatus });
    applySearch(countQb, p.search, searchCols);
    const total = await countQb.getCount();

    const itemsQb = this.changeRequestRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.pitch', 'pitch')
      .leftJoinAndSelect('pitch.business', 'business')
      .where('r.status = :status', { status: effectiveStatus });
    applySearch(itemsQb, p.search, searchCols);
    itemsQb.orderBy('r.createdAt', 'DESC').skip(skip).take(p.limit);
    const requests = await itemsQb.getMany();

    const items = requests.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      requestedData: r.requestedData,
      currentData: r.currentData,
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
      pitchId: r.pitchId,
      pitchName: r.pitch?.name,
      businessId: r.businessId,
      businessName: r.pitch?.business?.name,
    }));

    return paginate(items, total, p.page, p.limit);
  }

  async approveChangeRequest(requestId: string): Promise<{ success: boolean }> {
    const request = await this.changeRequestRepository.findOne({
      where: { id: requestId },
      relations: ['pitch'],
    });
    if (!request) throw new NotFoundException('İstek bulunamadı.');

    if (request.type === 'CUSTOM_FACILITY') {
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
        await this.facilitiesService.upsertApproved(
          request.requestedData.facility as string,
        );
      }
    } else if (request.type === 'PHOTO_UPDATE') {
      const oldImageUrl = request.pitch?.imageUrl;
      await this.pitchRepository.update(request.pitchId, {
        imageUrl: request.requestedData.imageUrl,
      });
      if (oldImageUrl && oldImageUrl.includes('cloudinary.com')) {
        const match = oldImageUrl.match(
          /\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/,
        );
        if (match) {
          cloudinary.uploader
            .destroy(match[1])
            .catch((err) =>
              console.error(
                'Failed to delete old pitch image from Cloudinary:',
                err,
              ),
            );
        }
      }
    }

    await this.changeRequestRepository.update(requestId, {
      status: 'approved',
      reviewedAt: new Date(),
    });

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

  async rejectChangeRequest(
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
    type:
      | 'PITCH_CHANGE_APPROVED'
      | 'PITCH_CHANGE_REJECTED'
      | 'PITCH_APPROVAL_APPROVED'
      | 'PITCH_APPROVAL_REJECTED',
    message: string,
    relatedId: string,
  ): Promise<void> {
    const owner = await this.businessOwnerRepository.findOne({
      where: { business: { id: businessId } },
      relations: ['business'],
    });
    if (!owner) return;

    const TITLES: Record<string, string> = {
      PITCH_CHANGE_APPROVED: 'Değişiklik Onaylandı',
      PITCH_CHANGE_REJECTED: 'Değişiklik Reddedildi',
      PITCH_APPROVAL_APPROVED: 'Saha Onaylandı',
      PITCH_APPROVAL_REJECTED: 'Saha Reddedildi',
    };

    const notification = this.notificationRepository.create({
      userId: owner.id,
      type,
      title: TITLES[type],
      message,
      relatedId,
      read: false,
    });
    await this.notificationRepository.save(notification);
  }

  // ─── Saha Onayları (Yeni Saha) ──────────────────────────────────────────────

  async getPitchApprovals(
    status: string | undefined,
    p: PaginationQueryDto,
  ): Promise<Paginated<any>> {
    const approvalStatus = status ?? 'pending';
    const skip = (p.page - 1) * p.limit;
    const searchCols = ['pt.name', 'business.name'];

    // COUNT: business join (arama için, ManyToOne güvenli); timeSlots join EDİLMEZ.
    const countQb = this.pitchRepository
      .createQueryBuilder('pt')
      .leftJoin('pt.business', 'business')
      .where('pt.approvalStatus = :st', { st: approvalStatus });
    applySearch(countQb, p.search, searchCols);
    const total = await countQb.getCount();

    // ITEMS: detay kartı timeSlots render ettiği için burada YÜKLENİR.
    const itemsQb = this.pitchRepository
      .createQueryBuilder('pt')
      .leftJoinAndSelect('pt.business', 'business')
      .leftJoinAndSelect('pt.timeSlots', 'ts')
      .where('pt.approvalStatus = :st', { st: approvalStatus });
    applySearch(itemsQb, p.search, searchCols);
    itemsQb.orderBy('pt.createdAt', 'DESC').skip(skip).take(p.limit);
    const pitches = await itemsQb.getMany();

    const items = pitches.map((pt) => ({
      id: pt.id,
      name: pt.name,
      description: pt.description,
      type: pt.type,
      pricePerHour: pt.pricePerHour,
      imageUrl: pt.imageUrl,
      openTime: pt.openTime,
      closeTime: pt.closeTime,
      facilities: pt.facilities,
      closedDays: pt.closedDays,
      timeSlots: pt.timeSlots,
      approvalStatus: pt.approvalStatus,
      rejectionReason: pt.rejectionReason,
      createdAt: pt.createdAt,
      reviewedAt: pt.reviewedAt,
      businessId: pt.businessId,
      businessName: pt.business?.name,
    }));

    return paginate(items, total, p.page, p.limit);
  }

  async approvePitch(pitchId: string): Promise<{ success: boolean }> {
    const pitch = await this.pitchRepository.findOne({
      where: { id: pitchId },
    });
    if (!pitch) throw new NotFoundException('Saha bulunamadı.');

    await this.pitchRepository.update(pitchId, {
      approvalStatus: 'approved',
      rejectionReason: null,
      reviewedAt: new Date(),
    });

    await this.sendOwnerNotification(
      pitch.businessId,
      'PITCH_APPROVAL_APPROVED',
      `Yeni sahanız "${pitch.name}" onaylandı ve yayına alındı.`,
      pitchId,
    );

    return { success: true };
  }

  async rejectPitch(
    pitchId: string,
    reason: string,
  ): Promise<{ success: boolean }> {
    if (!reason?.trim())
      throw new BadRequestException('Red sebebi zorunludur.');

    const pitch = await this.pitchRepository.findOne({
      where: { id: pitchId },
    });
    if (!pitch) throw new NotFoundException('Saha bulunamadı.');

    await this.pitchRepository.update(pitchId, {
      approvalStatus: 'rejected',
      rejectionReason: reason,
      reviewedAt: new Date(),
    });

    await this.sendOwnerNotification(
      pitch.businessId,
      'PITCH_APPROVAL_REJECTED',
      `Yeni saha isteğiniz reddedildi. Sebep: ${reason}`,
      pitchId,
    );

    return { success: true };
  }
}
