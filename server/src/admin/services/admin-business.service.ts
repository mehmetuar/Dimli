import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { Business, ReviewEvent } from '../../business/entities/business.entity';
import { BusinessOwner } from '../../business-owner/entities/business-owner.entity';
import { Subscription } from '../../subscription/entities/subscription.entity';
import { Pitch } from '../../pitches/entities/pitch.entity';
import { TimeSlot } from '../../pitches/entities/time-slot.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Paginated, paginate } from '../../common/dto/paginated';
import { AdminStatsCacheService } from './admin-stats-cache.service';
import { applySearch } from './admin.util';

export type AdminBusinessListItem = Omit<Business, 'owner'> & {
  owner: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  } | null;
  // Satır rozeti için minimal abonelik özeti (EKLEMELİ alan — eski FE yok sayar).
  subscription: {
    status: string;
    planType: string;
    graceUntil: Date | null;
    complimentaryUntil: Date | null;
  } | null;
};

@Injectable()
export class AdminBusinessService {
  constructor(
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(BusinessOwner)
    private businessOwnerRepository: Repository<BusinessOwner>,
    @InjectRepository(Pitch)
    private pitchRepository: Repository<Pitch>,
    @InjectRepository(TimeSlot)
    private timeSlotRepository: Repository<TimeSlot>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    private readonly notificationsService: NotificationsService,
    private readonly statsCache: AdminStatsCacheService,
  ) {}

  /**
   * İşletme listeleme çekirdeği — getApplications / getAllBusinesses /
   * getDeletedBusinesses bunu kullanır. Sayfalama + arama + owner JOIN (N+1 giderildi).
   *
   * TypeORM tuzağı: COUNT sorgusu OneToMany (b.pitches) JOIN etmez (satır çoğaltır,
   * total'ı şişirir). ITEMS sorgusu skip/take (offset/limit DEĞİL) ile sayfalanır —
   * join'li OneToMany'de offset/limit ham satırı keser, yanlış sayıda işletme döner.
   */
  private async listBusinesses(opts: {
    status?: string;
    page: number;
    limit: number;
    search?: string;
    deleted?: boolean;
    defaultPendingWhenNoStatus?: boolean;
  }): Promise<Paginated<AdminBusinessListItem>> {
    const { status, page, limit, search, deleted = false } = opts;
    const skip = (page - 1) * limit;
    const searchCols = ['b.name', 'b.city', 'owner.fullName', 'owner.email'];

    const applyWhere = (qb: SelectQueryBuilder<Business>) => {
      qb.where(deleted ? 'b.deletedAt IS NOT NULL' : 'b.deletedAt IS NULL');
      const effectiveStatus =
        status ?? (opts.defaultPendingWhenNoStatus ? 'pending' : undefined);
      if (effectiveStatus)
        qb.andWhere('b.status = :status', { status: effectiveStatus });
    };

    // COUNT: owner sadece arama gerekiyorsa join'lenir (OneToOne → satır çoğaltmaz);
    // b.pitches ASLA join'lenmez.
    const countQb = this.businessRepository.createQueryBuilder('b');
    applyWhere(countQb);
    if (search?.trim()) countQb.leftJoin('b.owner', 'owner');
    applySearch(countQb, search, searchCols);
    const total = await countQb.getCount();

    // ITEMS: owner (OneToOne) + pitches (OneToMany) join'lenir; skip/take ile sayfalanır.
    // Liste yalnız pitches.length + facilities kullandığı için timeSlots YÜKLENMEZ
    // (QueryBuilder eager ilişkiyi otomatik çekmez).
    const itemsQb = this.businessRepository
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.owner', 'owner')
      .leftJoinAndSelect('b.pitches', 'p');
    applyWhere(itemsQb);
    applySearch(itemsQb, search, searchCols);
    itemsQb
      .orderBy(deleted ? 'b.deletedAt' : 'b.createdAt', 'DESC')
      .skip(skip)
      .take(limit);
    const businesses = await itemsQb.getMany();

    // Satır rozeti için abonelik özetleri — sayfadaki owner'lar için tek toplu
    // sorgu (N+1 yok). ownerId varchar kolonuna string uuid değerleriyle IN.
    const ownerIds = businesses
      .map((b) => b.owner?.id)
      .filter((id): id is string => !!id);
    const subs = ownerIds.length
      ? await this.subscriptionRepository.find({
          where: { ownerId: In(ownerIds) },
        })
      : [];
    const subByOwner = new Map(subs.map((s) => [s.ownerId, s]));

    const items = businesses.map((b) => {
      const sub = b.owner ? subByOwner.get(b.owner.id) : undefined;
      return {
        ...b,
        owner: b.owner
          ? {
              id: b.owner.id,
              fullName: b.owner.fullName,
              email: b.owner.email,
              phone: b.owner.phone,
            }
          : null,
        subscription: sub
          ? {
              status: sub.status,
              planType: sub.planType,
              graceUntil: sub.graceUntil,
              complimentaryUntil: sub.complimentaryUntil,
            }
          : null,
      };
    });

    return paginate(items, total, page, limit);
  }

  getApplications(status: string | undefined, p: PaginationQueryDto) {
    return this.listBusinesses({
      status,
      page: p.page,
      limit: p.limit,
      search: p.search,
      deleted: false,
      defaultPendingWhenNoStatus: true,
    });
  }

  async getApplicationDetail(businessId: string) {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
      relations: ['pitches', 'pitches.timeSlots'],
    });
    if (!business) throw new NotFoundException('İşletme bulunamadı.');

    const owner = await this.businessOwnerRepository.findOne({
      where: { business: { id: businessId } },
    });

    return {
      ...business,
      owner: owner
        ? {
            id: owner.id,
            fullName: owner.fullName,
            email: owner.email,
            phone: owner.phone,
          }
        : null,
    };
  }

  async approveApplication(businessId: string, adminId: string) {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('İşletme bulunamadı.');

    business.status = 'active';
    business.reviewedAt = new Date();
    business.rejectionReason = null;
    this.appendReview(business, {
      action: 'approved',
      at: new Date().toISOString(),
      by: adminId,
    });
    await this.businessRepository.save(business);
    this.statsCache.bust('statistics');

    await this.notifyOwnerOfApplicationResult(
      businessId,
      'BUSINESS_APPLICATION_APPROVED',
      'Başvurunuz Onaylandı',
      'İşletme başvurunuz onaylandı. Artık rezervasyon almaya başlayabilirsiniz.',
    );

    return { success: true, message: 'İşletme onaylandı.' };
  }

  async rejectApplication(businessId: string, adminId: string, reason: string) {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('İşletme bulunamadı.');

    business.status = 'rejected';
    business.reviewedAt = new Date();
    business.rejectionReason = reason;
    this.appendReview(business, {
      action: 'rejected',
      at: new Date().toISOString(),
      reason,
      by: adminId,
    });
    await this.businessRepository.save(business);
    this.statsCache.bust('statistics');

    await this.notifyOwnerOfApplicationResult(
      businessId,
      'BUSINESS_APPLICATION_REJECTED',
      'Başvurunuz Reddedildi',
      `İşletme başvurunuz reddedildi. Nedeni: ${reason}. Lütfen düzeltmeleri yapıp tekrar onaya gönderin.`,
    );

    return { success: true, message: 'İşletme reddedildi.' };
  }

  /**
   * İnceleme geçmişine (audit) olay ekler. Geçmiş boşsa önce `createdAt` ile bir
   * 'submitted' olayı seed edilir → timeline her zaman başvuruyla başlar. Mutasyonu
   * çağıran metodun `save()` çağrısı kalıcılaştırır.
   */
  private appendReview(business: Business, event: ReviewEvent): void {
    const history = business.reviewHistory ?? [];
    if (history.length === 0) {
      history.push({
        action: 'submitted',
        at: new Date(business.createdAt).toISOString(),
      });
    }
    history.push(event);
    business.reviewHistory = history;
  }

  /**
   * İşletme başvurusu onay/red sonucunu sahibe bildirir.
   * `notificationsService.create()` üzerinden gider → DB + websocket + FCM push
   * (pitch onay/red akışındaki private sendOwnerNotification yalnızca DB'ye
   * yazıyor; bilinçli olarak tam-teslimatlı yolu kullanıyoruz).
   */
  private async notifyOwnerOfApplicationResult(
    businessId: string,
    type: 'BUSINESS_APPLICATION_APPROVED' | 'BUSINESS_APPLICATION_REJECTED',
    title: string,
    message: string,
  ): Promise<void> {
    const owner = await this.businessOwnerRepository.findOne({
      where: { business: { id: businessId } },
    });
    if (!owner) return;

    await this.notificationsService.create({
      userId: owner.id,
      type,
      title,
      message,
      relatedId: businessId,
      read: false,
    });
  }

  getAllBusinesses(status: string | undefined, p: PaginationQueryDto) {
    return this.listBusinesses({
      status,
      page: p.page,
      limit: p.limit,
      search: p.search,
      deleted: false,
      defaultPendingWhenNoStatus: false,
    });
  }

  async suspendBusiness(businessId: string) {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('İşletme bulunamadı.');
    business.status = 'suspended';
    await this.businessRepository.save(business);
    this.statsCache.bust('statistics');
    return { success: true };
  }

  async activateBusiness(businessId: string) {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('İşletme bulunamadı.');
    business.status = 'active';
    await this.businessRepository.save(business);
    this.statsCache.bust('statistics');
    return { success: true };
  }

  // İşletmeyi geri yükle (soft-delete'i geri al). Sadece işletme verisi geri gelir;
  // sahip self-delete ettiyse owner/subscription yok (response'ta belirtilir).
  async restoreBusiness(businessId: string, adminId: string) {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('İşletme bulunamadı.');
    if (!business.deletedAt) {
      throw new BadRequestException('Bu işletme zaten silinmemiş.');
    }

    // Status'a dokunma — silme status'u değiştirmemişti, eski status korunuyor.
    business.deletedAt = null;
    business.restoredAt = new Date();
    business.restoredBy = adminId;
    await this.businessRepository.save(business);

    // İşletmenin sahalarını da geri yükle.
    await this.pitchRepository.update(
      { businessId },
      { deletedAt: null, isActive: true },
    );

    this.statsCache.bust('statistics');

    const ownerExists = await this.businessOwnerRepository.findOne({
      where: { business: { id: businessId } },
    });
    return {
      success: true,
      ownerMissing: !ownerExists,
      message: ownerExists
        ? 'İşletme geri yüklendi.'
        : 'İşletme geri yüklendi. Sahip hesabı silinmiş olduğundan sahibin yeniden kayıt olması gerekir.',
    };
  }

  // ─── Update Application ───────────────────────────────────────────────────

  async updateApplication(
    businessId: string,
    body: {
      business?: Partial<
        Pick<
          Business,
          | 'name'
          | 'city'
          | 'district'
          | 'address'
          | 'phone'
          | 'openTime'
          | 'closeTime'
        >
      >;
      owner?: Partial<Pick<BusinessOwner, 'fullName' | 'email' | 'phone'>>;
      pitches?: Array<{
        id: string;
        name?: string;
        type?: string;
        pricePerHour?: number;
        facilities?: string[];
        imageUrl?: string;
        timeSlots?: Array<{
          id?: string;
          startTime: string;
          endTime: string;
          isActive: boolean;
          _delete?: boolean;
        }>;
      }>;
    },
  ) {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('İşletme bulunamadı.');

    if (body.business) {
      Object.assign(business, body.business);
      await this.businessRepository.save(business);
    }

    if (body.owner) {
      const owner = await this.businessOwnerRepository.findOne({
        where: { business: { id: businessId } },
      });
      if (owner) {
        Object.assign(owner, body.owner);
        await this.businessOwnerRepository.save(owner);
      }
    }

    if (body.pitches && body.pitches.length > 0) {
      for (const pitchUpdate of body.pitches) {
        const pitch = await this.pitchRepository.findOne({
          where: { id: pitchUpdate.id, businessId },
        });
        if (!pitch) continue;

        if (pitchUpdate.name !== undefined) pitch.name = pitchUpdate.name;
        if (pitchUpdate.type !== undefined) pitch.type = pitchUpdate.type;
        if (pitchUpdate.pricePerHour !== undefined)
          pitch.pricePerHour = pitchUpdate.pricePerHour;
        if (pitchUpdate.facilities !== undefined)
          pitch.facilities = pitchUpdate.facilities;
        if (pitchUpdate.imageUrl !== undefined)
          pitch.imageUrl = pitchUpdate.imageUrl;
        await this.pitchRepository.save(pitch);

        // Saat slotları
        if (pitchUpdate.timeSlots && pitchUpdate.timeSlots.length > 0) {
          for (const slotUpdate of pitchUpdate.timeSlots) {
            if (slotUpdate.id && slotUpdate._delete) {
              // Mevcut slotu sil
              await this.timeSlotRepository.delete({
                id: slotUpdate.id,
                pitchId: pitch.id,
              });
            } else if (slotUpdate.id) {
              // Mevcut slotu güncelle
              const slot = await this.timeSlotRepository.findOne({
                where: { id: slotUpdate.id, pitchId: pitch.id },
              });
              if (slot) {
                slot.startTime = slotUpdate.startTime;
                slot.endTime = slotUpdate.endTime;
                slot.isActive = slotUpdate.isActive;
                await this.timeSlotRepository.save(slot);
              }
            } else {
              // Yeni slot oluştur
              const newSlot = this.timeSlotRepository.create({
                pitchId: pitch.id,
                startTime: slotUpdate.startTime,
                endTime: slotUpdate.endTime,
                isActive: slotUpdate.isActive,
              });
              await this.timeSlotRepository.save(newSlot);
            }
          }
        }
      }
    }

    return this.getApplicationDetail(businessId);
  }

  getDeletedBusinesses(p: PaginationQueryDto) {
    return this.listBusinesses({
      page: p.page,
      limit: p.limit,
      search: p.search,
      deleted: true,
    });
  }
}
