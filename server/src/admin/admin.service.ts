import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Not, Repository, SelectQueryBuilder } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminUser } from './entities/admin-user.entity';
import { Business } from '../business/entities/business.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { Subscription } from '../subscription/entities/subscription.entity';
import { Pitch } from '../pitches/entities/pitch.entity';
import { TimeSlot } from '../pitches/entities/time-slot.entity';
import { PitchChangeRequest } from '../pitches/entities/pitch-change-request.entity';
import { Notification } from '../notifications/notification.entity';
import { AccountDeletion } from '../account-deletions/account-deletion.entity';
import { User } from '../users/user.entity';
import { UserReport, ReportStatus } from '../user-reports/user-report.entity';
import { FacilitiesService } from '../facilities/facilities.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Paginated, paginate } from '../common/dto/paginated';

const PLAN_LABELS: Record<string, string> = {
  '1_pitch': 'Starter',
  '2_pitch': 'Basic',
  '3_pitch': 'Pro',
  '4_pitch': 'Business',
  '5plus_pitch': 'Enterprise',
};

// Saha sayısına göre doğru planı belirle
const PITCH_COUNT_TO_PLAN: Record<
  number,
  { planType: string; pitchCount: number; pricePerMonth: number }
> = {
  0: { planType: '1_pitch', pitchCount: 1, pricePerMonth: 1709.99 },
  1: { planType: '1_pitch', pitchCount: 1, pricePerMonth: 1709.99 },
  2: { planType: '2_pitch', pitchCount: 2, pricePerMonth: 2999.99 },
  3: { planType: '3_pitch', pitchCount: 3, pricePerMonth: 3849.99 },
  4: { planType: '4_pitch', pitchCount: 4, pricePerMonth: 4649.99 },
};

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AdminUser)
    private adminUserRepository: Repository<AdminUser>,
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(BusinessOwner)
    private businessOwnerRepository: Repository<BusinessOwner>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Pitch)
    private pitchRepository: Repository<Pitch>,
    @InjectRepository(TimeSlot)
    private timeSlotRepository: Repository<TimeSlot>,
    @InjectRepository(PitchChangeRequest)
    private changeRequestRepository: Repository<PitchChangeRequest>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(AccountDeletion)
    private accountDeletionRepository: Repository<AccountDeletion>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserReport)
    private userReportRepository: Repository<UserReport>,
    private jwtService: JwtService,
    private readonly facilitiesService: FacilitiesService,
  ) {}

  // ─── Helpers (sayfalama / arama / cache) ────────────────────────────────────

  /**
   * QueryBuilder'a ILIKE arama uygular. Brackets ile OR grubu izole edilir —
   * aksi halde `WHERE status = x AND a ILIKE q OR b ILIKE q` diğer statüleri
   * sızdırır. Boş aramada hiçbir şey yapmaz (no-op).
   */
  private applySearch(
    qb: SelectQueryBuilder<any>,
    search: string | undefined,
    columns: string[],
  ): void {
    if (!search?.trim()) return;
    const term = `%${search.trim()}%`;
    qb.andWhere(
      new Brackets((b) => {
        columns.forEach((col, i) =>
          b.orWhere(`${col} ILIKE :s${i}`, { [`s${i}`]: term }),
        );
      }),
    );
  }

  // Dashboard agregatları için basit in-memory TTL cache (bağımlılıksız,
  // mevcut ad-hoc Map deseniyle uyumlu). Sadece statistics/deletion-report.
  private statsCache = new Map<string, { at: number; data: any }>();
  private readonly STATS_TTL_MS = 60_000;

  private async cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const hit = this.statsCache.get(key);
    if (hit && Date.now() - hit.at < this.STATS_TTL_MS) return hit.data as T;
    const data = await fn();
    this.statsCache.set(key, { at: Date.now(), data });
    return data;
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────

  async login(email: string, password: string) {
    const admin = await this.adminUserRepository.findOne({ where: { email } });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }
    const payload = {
      email: admin.email,
      sub: admin.id,
      role: 'admin',
      adminRole: admin.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
      adminRole: admin.role,
      email: admin.email,
    };
  }

  async createAdmin(
    email: string,
    password: string,
    role: string = 'reviewer',
  ): Promise<AdminUser> {
    const existing = await this.adminUserRepository.findOne({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('Bu e-posta zaten kayıtlı.');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = this.adminUserRepository.create({
      email,
      password: hashedPassword,
      role,
    });
    return this.adminUserRepository.save(admin);
  }

  // ─── Applications ─────────────────────────────────────────────────────────

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
  }): Promise<Paginated<any>> {
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
    this.applySearch(countQb, search, searchCols);
    const total = await countQb.getCount();

    // ITEMS: owner (OneToOne) + pitches (OneToMany) join'lenir; skip/take ile sayfalanır.
    // Liste yalnız pitches.length + facilities kullandığı için timeSlots YÜKLENMEZ
    // (QueryBuilder eager ilişkiyi otomatik çekmez).
    const itemsQb = this.businessRepository
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.owner', 'owner')
      .leftJoinAndSelect('b.pitches', 'p');
    applyWhere(itemsQb);
    this.applySearch(itemsQb, search, searchCols);
    itemsQb
      .orderBy(deleted ? 'b.deletedAt' : 'b.createdAt', 'DESC')
      .skip(skip)
      .take(limit);
    const businesses = await itemsQb.getMany();

    const items = businesses.map((b) => ({
      ...b,
      owner: b.owner
        ? {
            id: b.owner.id,
            fullName: b.owner.fullName,
            email: b.owner.email,
            phone: b.owner.phone,
          }
        : null,
    }));

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

  async approveApplication(businessId: string, _adminId: string) {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('İşletme bulunamadı.');

    business.status = 'active';
    business.reviewedAt = new Date();
    business.rejectionReason = null;
    await this.businessRepository.save(business);
    this.statsCache.delete('statistics');

    return { success: true, message: 'İşletme onaylandı.' };
  }

  async rejectApplication(
    businessId: string,
    _adminId: string,
    reason: string,
  ) {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('İşletme bulunamadı.');

    business.status = 'rejected';
    business.reviewedAt = new Date();
    business.rejectionReason = reason;
    await this.businessRepository.save(business);
    this.statsCache.delete('statistics');

    return { success: true, message: 'İşletme reddedildi.' };
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
    this.statsCache.delete('statistics');
    return { success: true };
  }

  async activateBusiness(businessId: string) {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('İşletme bulunamadı.');
    business.status = 'active';
    await this.businessRepository.save(business);
    this.statsCache.delete('statistics');
    return { success: true };
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
    this.applySearch(countQb, p.search, searchCols);
    const total = await countQb.getCount();

    const itemsQb = this.changeRequestRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.pitch', 'pitch')
      .leftJoinAndSelect('pitch.business', 'business')
      .where('r.status = :status', { status: effectiveStatus });
    this.applySearch(itemsQb, p.search, searchCols);
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
    this.applySearch(countQb, p.search, searchCols);
    const total = await countQb.getCount();

    // ITEMS: detay kartı timeSlots render ettiği için burada YÜKLENİR.
    const itemsQb = this.pitchRepository
      .createQueryBuilder('pt')
      .leftJoinAndSelect('pt.business', 'business')
      .leftJoinAndSelect('pt.timeSlots', 'ts')
      .where('pt.approvalStatus = :st', { st: approvalStatus });
    this.applySearch(itemsQb, p.search, searchCols);
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

  // ─── Statistics ───────────────────────────────────────────────────────────

  // 60sn cache'li; response şekli eskisiyle birebir aynı.
  getStatistics() {
    return this.cached('statistics', () => this.computeStatistics());
  }

  private async computeStatistics() {
    // Status sayımları (silinmiş işletmeler hariç) — mevcut 5 paralel COUNT korunur.
    const [pending, active, rejected, suspended, deleted] = await Promise.all([
      this.businessRepository.count({
        where: { status: 'pending', deletedAt: IsNull() },
      }),
      this.businessRepository.count({
        where: { status: 'active', deletedAt: IsNull() },
      }),
      this.businessRepository.count({
        where: { status: 'rejected', deletedAt: IsNull() },
      }),
      this.businessRepository.count({
        where: { status: 'suspended', deletedAt: IsNull() },
      }),
      this.businessRepository.count({ where: { deletedAt: Not(IsNull()) } }),
    ]);

    // Abonelik: tüm tabloyu çekmek yerine tek GROUP BY (status, planType) + SUM.
    // COUNT/SUM driver'dan string döner → Number() ile sarılır.
    const subRows: Array<{
      status: string;
      planType: string;
      cnt: string;
      sum: string;
    }> = await this.subscriptionRepository
      .createQueryBuilder('s')
      .select('s.status', 'status')
      .addSelect('s.planType', 'planType')
      .addSelect('COUNT(*)', 'cnt')
      .addSelect('COALESCE(SUM(s.pricePerMonth), 0)', 'sum')
      .where("s.status IN ('active', 'trial')")
      .groupBy('s.status')
      .addGroupBy('s.planType')
      .orderBy('s.planType', 'ASC')
      .getRawMany();

    let activeCount = 0;
    let trialCount = 0;
    let totalMRR = 0;
    const planMap: Record<string, { count: number; monthlyRevenue: number }> =
      {};
    for (const r of subRows) {
      const cnt = Number(r.cnt);
      const sum = Number(r.sum);
      if (r.status === 'active') activeCount += cnt;
      if (r.status === 'trial') trialCount += cnt;
      totalMRR += sum;
      if (!planMap[r.planType])
        planMap[r.planType] = { count: 0, monthlyRevenue: 0 };
      planMap[r.planType].count += cnt;
      planMap[r.planType].monthlyRevenue += sum;
    }
    const byPlan = Object.entries(planMap).map(([planType, data]) => ({
      planType,
      label: PLAN_LABELS[planType] ?? planType,
      count: data.count,
      monthlyRevenue: data.monthlyRevenue,
    }));

    // Son 12 ay büyüme: 24 COUNT yerine 2 GROUP BY date_trunc('month').
    // (Render sunucusu UTC; depolanan timestamp UTC → TZ dönüşümü gerekmez.)
    const now = new Date();
    const windowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [newRows, apprRows]: Array<Array<{ m: string; c: string }>> =
      await Promise.all([
        this.businessRepository
          .createQueryBuilder('b')
          .select("to_char(date_trunc('month', b.createdAt), 'YYYY-MM')", 'm')
          .addSelect('COUNT(*)', 'c')
          .where('b.createdAt >= :start', { start: windowStart })
          .groupBy("date_trunc('month', b.createdAt)")
          .getRawMany(),
        this.businessRepository
          .createQueryBuilder('b')
          .select("to_char(date_trunc('month', b.reviewedAt), 'YYYY-MM')", 'm')
          .addSelect('COUNT(*)', 'c')
          .where("b.status = 'active' AND b.reviewedAt >= :start", {
            start: windowStart,
          })
          .groupBy("date_trunc('month', b.reviewedAt)")
          .getRawMany(),
      ]);

    const newMap = new Map(newRows.map((r) => [r.m, Number(r.c)]));
    const apprMap = new Map(apprRows.map((r) => [r.m, Number(r.c)]));

    const monthlyGrowth: Array<{
      month: string;
      newBusinesses: number;
      approvedBusinesses: number;
    }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyGrowth.push({
        month: monthStr,
        newBusinesses: newMap.get(monthStr) ?? 0,
        approvedBusinesses: apprMap.get(monthStr) ?? 0,
      });
    }

    return {
      counts: { pending, active, rejected, suspended, deleted },
      revenue: {
        activeSubscriptions: activeCount,
        trialSubscriptions: trialCount,
        totalMRR,
        byPlan,
      },
      monthlyGrowth,
    };
  }

  // ─── Deleted Businesses ───────────────────────────────────────────────────

  getDeletedBusinesses(p: PaginationQueryDto) {
    return this.listBusinesses({
      page: p.page,
      limit: p.limit,
      search: p.search,
      deleted: true,
    });
  }

  // ─── Deletion Report ──────────────────────────────────────────────────────

  // 60sn cache'li; response şekli eskisiyle birebir aynı.
  getDeletionReport() {
    return this.cached('deletion-report', () => this.computeDeletionReport());
  }

  private async computeDeletionReport() {
    const REASON_LABELS: Record<string, string> = {
      NOT_USING: 'Artık kullanmak istemiyorum',
      PRIVACY: 'Gizlilik endişelerim var',
      DIFFERENT_APP: 'Farklı bir uygulama kullanıyorum',
      NOT_SATISFIED: 'Beklentilerimi karşılamıyor',
      TECHNICAL: 'Teknik sorunlar yaşıyorum',
      OTHER: 'Diğer',
    };

    // total + reason kırılımı + son 6 ay trend → tüm tabloyu çekmeden GROUP BY ile.
    const total = await this.accountDeletionRepository.count();

    const reasonRows: Array<{ reason: string; c: string }> =
      await this.accountDeletionRepository
        .createQueryBuilder('d')
        .select('d.reason', 'reason')
        .addSelect('COUNT(*)', 'c')
        .groupBy('d.reason')
        .getRawMany();
    const reasonBreakdown = reasonRows.map((r) => ({
      key: r.reason,
      label: REASON_LABELS[r.reason] || r.reason,
      count: Number(r.c),
    }));

    // Eski kod toISOString (UTC) kullanıyordu → UTC korunur (Render sunucusu da UTC).
    const now = new Date();
    const windowStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1),
    );
    const monthRows: Array<{ m: string; c: string }> =
      await this.accountDeletionRepository
        .createQueryBuilder('d')
        .select("to_char(date_trunc('month', d.deletedAt), 'YYYY-MM')", 'm')
        .addSelect('COUNT(*)', 'c')
        .where('d.deletedAt >= :start', { start: windowStart })
        .groupBy("date_trunc('month', d.deletedAt)")
        .getRawMany();
    const monthMap = new Map(monthRows.map((r) => [r.m, Number(r.c)]));

    const monthlyTrend: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      const monthStr = d.toISOString().slice(0, 7);
      monthlyTrend.push({
        month: monthStr,
        count: monthMap.get(monthStr) ?? 0,
      });
    }
    const thisMonth = monthlyTrend[monthlyTrend.length - 1].count;

    const recent = await this.accountDeletionRepository.find({
      order: { deletedAt: 'DESC' },
      take: 30,
    });

    return { total, thisMonth, reasonBreakdown, monthlyTrend, recent };
  }

  // ─── User Reports ─────────────────────────────────────────────────────────

  async getReports(
    status: ReportStatus | undefined,
    p: PaginationQueryDto,
  ): Promise<Paginated<UserReport>> {
    const skip = (p.page - 1) * p.limit;
    const searchCols = [
      'reporter.username',
      'reporter.full_name',
      'reported.username',
      'reported.full_name',
    ];

    // COUNT: reporter/reported sadece arama varsa join'lenir (ManyToOne güvenli).
    const countQb = this.userReportRepository.createQueryBuilder('r');
    if (status) countQb.andWhere('r.status = :status', { status });
    if (p.search?.trim()) {
      countQb
        .leftJoin('r.reporter', 'reporter')
        .leftJoin('r.reportedUser', 'reported');
    }
    this.applySearch(countQb, p.search, searchCols);
    const total = await countQb.getCount();

    // ITEMS: nested reporter/reportedUser/message FE'de kullanıldığı için her zaman join.
    const itemsQb = this.userReportRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.reporter', 'reporter')
      .leftJoinAndSelect('r.reportedUser', 'reported')
      .leftJoinAndSelect('r.message', 'message');
    if (status) itemsQb.andWhere('r.status = :status', { status });
    this.applySearch(itemsQb, p.search, searchCols);
    itemsQb.orderBy('r.createdAt', 'DESC').skip(skip).take(p.limit);
    const items = await itemsQb.getMany();

    return paginate(items, total, p.page, p.limit);
  }

  async updateReportStatus(id: string, status: ReportStatus) {
    const report = await this.userReportRepository.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Rapor bulunamadı.');
    report.status = status;
    return this.userReportRepository.save(report);
  }

  async getPendingReportCount(): Promise<number> {
    return this.userReportRepository.count({ where: { status: 'pending' } });
  }

  // ─── Chat Ban ─────────────────────────────────────────────────────────────

  async chatBanUser(userId: string, durationHours?: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');
    user.isChatBanned = true;
    user.chatBannedAt = new Date();
    user.chatBanExpiry = durationHours
      ? new Date(Date.now() + durationHours * 60 * 60 * 1000)
      : null;
    await this.userRepository.save(user);

    const durationLabel = !durationHours
      ? 'süresiz'
      : durationHours < 24
        ? `${durationHours} saatlik`
        : `${Math.round(durationHours / 24)} günlük`;

    const notification = this.notificationRepository.create({
      userId,
      type: 'CHAT_BAN',
      title: 'Mesaj Engeliniz Var',
      message: `Hesabınıza ${durationLabel} mesaj engeli uygulandı. Lütfen destek ile iletişime geçin.`,
      read: false,
    });
    await this.notificationRepository.save(notification);

    return { success: true };
  }

  async chatUnbanUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');
    user.isChatBanned = false;
    user.chatBannedAt = null;
    user.chatBanExpiry = null;
    await this.userRepository.save(user);
    return { success: true };
  }

  async getBannedUsers(p: PaginationQueryDto): Promise<Paginated<any>> {
    const now = new Date();
    const skip = (p.page - 1) * p.limit;
    const searchCols = ['u.username', 'u.full_name'];

    // 1) Süresi dolmuş banları toplu temizle (eski döngü yerine tek bulk UPDATE).
    //    count/fetch ile aynı predicate → sayfalama tutarlı kalır.
    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ isChatBanned: false, chatBannedAt: null, chatBanExpiry: null })
      .where(
        'isChatBanned = true AND chatBanExpiry IS NOT NULL AND chatBanExpiry < :now',
        { now },
      )
      .execute();

    const applyWhere = (qb: SelectQueryBuilder<User>) => {
      qb.where('u.isChatBanned = true').andWhere(
        '(u.chatBanExpiry IS NULL OR u.chatBanExpiry >= :now)',
        { now },
      );
    };

    const countQb = this.userRepository.createQueryBuilder('u');
    applyWhere(countQb);
    this.applySearch(countQb, p.search, searchCols);
    const total = await countQb.getCount();

    const itemsQb = this.userRepository
      .createQueryBuilder('u')
      .select([
        'u.id',
        'u.username',
        'u.full_name',
        'u.chatBannedAt',
        'u.chatBanExpiry',
      ]);
    applyWhere(itemsQb);
    this.applySearch(itemsQb, p.search, searchCols);
    itemsQb.orderBy('u.chatBannedAt', 'DESC').skip(skip).take(p.limit);
    const items = await itemsQb.getMany();

    return paginate(items, total, p.page, p.limit);
  }

  /**
   * Aboneliği olmayan tüm aktif işletmeler için otomatik trial aboneliği oluşturur.
   * Saha sayısına göre doğru planı belirler. Idempotent (tekrar çalıştırılabilir).
   * Production'da ödeme entegrasyonu öncesi kayıtlı işletmeleri düzeltmek için kullanılır.
   */
  async seedMissingSubscriptions(): Promise<{
    created: number;
    updated: number;
    skipped: number;
    details: any[];
  }> {
    const owners = await this.businessOwnerRepository.find({
      relations: ['business', 'business.pitches'],
    });

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 90);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const details: any[] = [];

    for (const owner of owners) {
      const business = owner.business;
      if (!business) {
        skipped++;
        continue;
      }

      const pitchCount = business.pitches?.length ?? 0;
      const planKey = Math.min(pitchCount, 4); // 5+ → enterprise
      const plan =
        pitchCount >= 5
          ? { planType: '5plus_pitch', pitchCount: 5, pricePerMonth: 5399.99 }
          : PITCH_COUNT_TO_PLAN[planKey];

      const existing = await this.subscriptionRepository.findOne({
        where: { ownerId: owner.id },
      });

      if (existing) {
        // Plan tipi saha sayısıyla uyuşmuyorsa güncelle
        const needsUpdate =
          existing.planType !== plan.planType ||
          existing.pitchCount !== plan.pitchCount;
        if (needsUpdate) {
          existing.planType = plan.planType;
          existing.pitchCount = plan.pitchCount;
          existing.pricePerMonth = plan.pricePerMonth;
          await this.subscriptionRepository.save(existing);
          updated++;
          details.push({
            email: owner.email,
            business: business.name,
            action: 'updated',
            plan: plan.planType,
          });
        } else {
          skipped++;
          details.push({
            email: owner.email,
            business: business.name,
            action: 'skipped',
            plan: plan.planType,
          });
        }
      } else {
        const subscription = this.subscriptionRepository.create({
          ownerId: owner.id,
          planType: plan.planType,
          pitchCount: plan.pitchCount,
          pricePerMonth: plan.pricePerMonth,
          status: 'trial' as any,
          trialEndsAt,
        });
        await this.subscriptionRepository.save(subscription);
        created++;
        details.push({
          email: owner.email,
          business: business.name,
          action: 'created',
          plan: plan.planType,
        });
      }
    }

    this.statsCache.delete('statistics');
    return { created, updated, skipped, details };
  }
}
