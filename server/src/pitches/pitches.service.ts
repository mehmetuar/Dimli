import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import { Pitch } from './entities/pitch.entity';
import { TimeSlot } from './entities/time-slot.entity';
import {
  Reservation,
  ReservationStatus,
} from '../reservations/entities/reservation.entity';
import { PitchChangeRequest } from './entities/pitch-change-request.entity';
import { Subscription } from '../subscription/entities/subscription.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';

@Injectable()
export class PitchesService {
  constructor(
    @InjectRepository(Pitch)
    private pitchesRepository: Repository<Pitch>,
    @InjectRepository(TimeSlot)
    private timeSlotRepository: Repository<TimeSlot>,
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    @InjectRepository(PitchChangeRequest)
    private changeRequestRepository: Repository<PitchChangeRequest>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(BusinessOwner)
    private businessOwnerRepository: Repository<BusinessOwner>,
  ) {}

  async create(createPitchDto: any) {
    const { timeSlots, ...pitchData } = createPitchDto;

    if (pitchData.businessId) {
      await this.assertPitchLimitAvailable(pitchData.businessId);
    }

    const pitch = this.pitchesRepository.create({
      ...pitchData,
      approvalStatus: 'pending',
      rejectionReason: null,
      reviewedAt: null,
    });
    const result = await this.pitchesRepository.save(pitch);
    const savedPitch = Array.isArray(result) ? result[0] : result;

    // If timeSlots provided during creation, save them
    if (timeSlots && Array.isArray(timeSlots) && timeSlots.length > 0) {
      const slotEntities = timeSlots.map((slot: any) =>
        this.timeSlotRepository.create({
          pitchId: savedPitch.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isActive: true,
        }),
      );
      await this.timeSlotRepository.save(slotEntities);
    }

    return this.findOne(savedPitch.id);
  }

  // ===== SUBSCRIPTION LIMIT CHECK =====

  private async assertPitchLimitAvailable(businessId: string): Promise<void> {
    const owner = await this.businessOwnerRepository.findOne({
      where: { business: { id: businessId } },
      relations: ['business'],
    });
    if (!owner) return;

    const subscription = await this.subscriptionRepository.findOne({
      where: { ownerId: owner.id },
    });
    if (!subscription) return;

    const activeCount = await this.pitchesRepository.count({
      where: [
        { businessId, approvalStatus: 'approved', deletedAt: IsNull() },
        { businessId, approvalStatus: 'pending', deletedAt: IsNull() },
      ],
    });

    if (activeCount >= subscription.pitchCount) {
      throw new ConflictException(
        'Abonelik limitiniz dahilinde yeni saha oluşturamazsınız. Lütfen planınızı yükseltin.',
      );
    }
  }

  // ===== RESUBMIT AFTER REJECTION =====

  async resubmit(pitchId: string, updateData: any) {
    const pitch = await this.pitchesRepository.findOne({
      where: { id: pitchId },
    });
    if (!pitch)
      throw new NotFoundException(`Pitch with ID ${pitchId} not found`);

    const { timeSlots, ...pitchData } = updateData;
    delete pitchData.businessId;

    await this.pitchesRepository.update(pitchId, {
      ...pitchData,
      approvalStatus: 'pending',
      rejectionReason: null,
      reviewedAt: null,
    });

    if (timeSlots && Array.isArray(timeSlots)) {
      await this.timeSlotRepository.delete({ pitchId });
      if (timeSlots.length > 0) {
        const slotEntities = timeSlots.map((slot: any) =>
          this.timeSlotRepository.create({
            pitchId,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isActive: true,
          }),
        );
        await this.timeSlotRepository.save(slotEntities);
      }
    }

    return this.findOne(pitchId);
  }

  async findAll() {
    return await this.pitchesRepository.find({
      where: { deletedAt: IsNull() },
      relations: ['business', 'timeSlots'],
    });
  }

  async findOne(id: string) {
    const pitch = await this.pitchesRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['business', 'timeSlots'],
    });
    if (!pitch) {
      throw new NotFoundException(`Pitch with ID ${id} not found`);
    }

    const pendingRequests = await this.changeRequestRepository.find({
      where: { pitchId: id, status: 'pending' },
      order: { createdAt: 'DESC' },
    });

    return { ...pitch, pendingChangeRequests: pendingRequests };
  }

  async findByBusiness(businessId: string) {
    return await this.pitchesRepository.find({
      where: { businessId, deletedAt: IsNull() },
      relations: ['timeSlots'],
      order: { name: 'ASC' },
    });
  }

  async update(id: string, updateData: any) {
    return await this.pitchesRepository.update(id, updateData);
  }

  async remove(id: string) {
    await this.findOne(id); // yoksa veya zaten silinmişse NotFoundException

    const conflicts = await this.getFutureApprovedConflicts(id);
    if (conflicts.length > 0) {
      throw new ConflictException({
        message: 'Kesinleşmiş maçlar var',
        conflicts,
      });
    }

    await this.pitchesRepository.update(id, {
      isActive: false,
      deletedAt: new Date(),
    });
    return { success: true };
  }

  // ===== STATUS TOGGLE =====

  private async getFutureApprovedConflicts(pitchId: string) {
    const conflicts = await this.reservationRepository.find({
      where: {
        pitchId,
        status: ReservationStatus.APPROVED,
        slotTime: MoreThan(new Date()),
      },
      relations: ['team'],
      order: { slotTime: 'ASC' },
    });
    return conflicts.map((c) => ({
      id: c.id,
      slotTime: c.slotTime,
      teamName: c.team?.name || 'Bilinmiyor',
    }));
  }

  async toggleStatus(pitchId: string) {
    const pitch = await this.findOne(pitchId);

    // Only check for conflicts when trying to deactivate
    if (pitch.isActive) {
      const conflicts = await this.getFutureApprovedConflicts(pitchId);

      if (conflicts.length > 0) {
        throw new ConflictException({
          message: 'Kesinleşmiş maçlar var',
          conflicts,
        });
      }
    }

    await this.pitchesRepository.update(pitchId, { isActive: !pitch.isActive });
    return this.findOne(pitchId);
  }

  // ===== CLOSED DAYS =====

  async updateClosedDays(pitchId: string, closedDays: string[]) {
    await this.findOne(pitchId); // verify exists
    await this.pitchesRepository.update(pitchId, { closedDays });
    return this.findOne(pitchId);
  }

  // ===== TIME SLOT MANAGEMENT =====

  async setTimeSlots(
    pitchId: string,
    slots: { startTime: string; endTime: string }[],
  ) {
    // Verify pitch exists
    await this.findOne(pitchId);

    // Delete existing slots for this pitch
    await this.timeSlotRepository.delete({ pitchId });

    // Create new slots
    if (slots && slots.length > 0) {
      const slotEntities = slots.map((slot) =>
        this.timeSlotRepository.create({
          pitchId,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isActive: true,
        }),
      );
      await this.timeSlotRepository.save(slotEntities);
    }

    return this.getTimeSlots(pitchId);
  }

  async getTimeSlots(pitchId: string) {
    const slots = await this.timeSlotRepository.find({
      where: { pitchId, isActive: true },
    });

    const sortMinutes = (time: string): number => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + (m || 0);
    };

    return slots.sort(
      (a, b) => sortMinutes(a.startTime) - sortMinutes(b.startTime),
    );
  }
}
