import {
    Injectable,
    NotFoundException,
    UnauthorizedException,
    ConflictException,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

const PLAN_LABELS: Record<string, string> = {
    '1_pitch': 'Starter',
    '2_pitch': 'Basic',
    '3_pitch': 'Pro',
    '4_pitch': 'Business',
    '5plus_pitch': 'Enterprise',
};

// Saha sayısına göre doğru planı belirle
const PITCH_COUNT_TO_PLAN: Record<number, { planType: string; pitchCount: number; pricePerMonth: number }> = {
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
    ) { }

    // ─── Auth ─────────────────────────────────────────────────────────────────

    async login(email: string, password: string) {
        const admin = await this.adminUserRepository.findOne({ where: { email } });
        if (!admin || !(await bcrypt.compare(password, admin.password))) {
            throw new UnauthorizedException('E-posta veya şifre hatalı.');
        }
        const payload = { email: admin.email, sub: admin.id, role: 'admin', adminRole: admin.role };
        return {
            access_token: this.jwtService.sign(payload),
            adminRole: admin.role,
            email: admin.email,
        };
    }

    async createAdmin(email: string, password: string, role: string = 'reviewer'): Promise<AdminUser> {
        const existing = await this.adminUserRepository.findOne({ where: { email } });
        if (existing) {
            throw new ConflictException('Bu e-posta zaten kayıtlı.');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const admin = this.adminUserRepository.create({ email, password: hashedPassword, role });
        return this.adminUserRepository.save(admin);
    }

    // ─── Applications ─────────────────────────────────────────────────────────

    async getApplications(status?: string) {
        const where: any = {};
        if (status) where.status = status;
        else where.status = 'pending';

        const businesses = await this.businessRepository.find({
            where,
            relations: ['pitches', 'pitches.timeSlots'],
            order: { createdAt: 'DESC' },
        });

        // BusinessOwner bilgisini ekle
        const result = await Promise.all(
            businesses.map(async (business) => {
                const owner = await this.businessOwnerRepository.findOne({
                    where: { business: { id: business.id } },
                    relations: ['business'],
                });
                return { ...business, owner: owner ? { id: owner.id, fullName: owner.fullName, email: owner.email, phone: owner.phone } : null };
            }),
        );

        return result;
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
            owner: owner ? { id: owner.id, fullName: owner.fullName, email: owner.email, phone: owner.phone } : null,
        };
    }

    async approveApplication(businessId: string, _adminId: string) {
        const business = await this.businessRepository.findOne({ where: { id: businessId } });
        if (!business) throw new NotFoundException('İşletme bulunamadı.');

        business.status = 'active';
        business.reviewedAt = new Date();
        business.rejectionReason = null;
        await this.businessRepository.save(business);

        return { success: true, message: 'İşletme onaylandı.' };
    }

    async rejectApplication(businessId: string, _adminId: string, reason: string) {
        const business = await this.businessRepository.findOne({ where: { id: businessId } });
        if (!business) throw new NotFoundException('İşletme bulunamadı.');

        business.status = 'rejected';
        business.reviewedAt = new Date();
        business.rejectionReason = reason;
        await this.businessRepository.save(business);

        return { success: true, message: 'İşletme reddedildi.' };
    }

    async getAllBusinesses(status?: string) {
        const where: any = {};
        if (status) where.status = status;

        const businesses = await this.businessRepository.find({
            where,
            relations: ['pitches'],
            order: { createdAt: 'DESC' },
        });

        const result = await Promise.all(
            businesses.map(async (business) => {
                const owner = await this.businessOwnerRepository.findOne({
                    where: { business: { id: business.id } },
                });
                return { ...business, owner: owner ? { id: owner.id, fullName: owner.fullName, email: owner.email, phone: owner.phone } : null };
            }),
        );

        return result;
    }

    async suspendBusiness(businessId: string) {
        const business = await this.businessRepository.findOne({ where: { id: businessId } });
        if (!business) throw new NotFoundException('İşletme bulunamadı.');
        business.status = 'suspended';
        await this.businessRepository.save(business);
        return { success: true };
    }

    async activateBusiness(businessId: string) {
        const business = await this.businessRepository.findOne({ where: { id: businessId } });
        if (!business) throw new NotFoundException('İşletme bulunamadı.');
        business.status = 'active';
        await this.businessRepository.save(business);
        return { success: true };
    }

    // ─── Update Application ───────────────────────────────────────────────────

    async updateApplication(businessId: string, body: {
        business?: Partial<Pick<Business, 'name' | 'city' | 'district' | 'address' | 'phone' | 'openTime' | 'closeTime'>>;
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
    }) {
        const business = await this.businessRepository.findOne({ where: { id: businessId } });
        if (!business) throw new NotFoundException('İşletme bulunamadı.');

        if (body.business) {
            Object.assign(business, body.business);
            await this.businessRepository.save(business);
        }

        if (body.owner) {
            const owner = await this.businessOwnerRepository.findOne({ where: { business: { id: businessId } } });
            if (owner) {
                Object.assign(owner, body.owner);
                await this.businessOwnerRepository.save(owner);
            }
        }

        if (body.pitches && body.pitches.length > 0) {
            for (const pitchUpdate of body.pitches) {
                const pitch = await this.pitchRepository.findOne({ where: { id: pitchUpdate.id, businessId } });
                if (!pitch) continue;

                if (pitchUpdate.name !== undefined) pitch.name = pitchUpdate.name;
                if (pitchUpdate.type !== undefined) pitch.type = pitchUpdate.type;
                if (pitchUpdate.pricePerHour !== undefined) pitch.pricePerHour = pitchUpdate.pricePerHour;
                if (pitchUpdate.facilities !== undefined) pitch.facilities = pitchUpdate.facilities;
                if (pitchUpdate.imageUrl !== undefined) pitch.imageUrl = pitchUpdate.imageUrl;
                await this.pitchRepository.save(pitch);

                // Saat slotları
                if (pitchUpdate.timeSlots && pitchUpdate.timeSlots.length > 0) {
                    for (const slotUpdate of pitchUpdate.timeSlots) {
                        if (slotUpdate.id && slotUpdate._delete) {
                            // Mevcut slotu sil
                            await this.timeSlotRepository.delete({ id: slotUpdate.id, pitchId: pitch.id });
                        } else if (slotUpdate.id) {
                            // Mevcut slotu güncelle
                            const slot = await this.timeSlotRepository.findOne({ where: { id: slotUpdate.id, pitchId: pitch.id } });
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

    async getChangeRequests(status?: string): Promise<any[]> {
        const where: any = status ? { status } : { status: 'pending' };
        const requests = await this.changeRequestRepository.find({
            where,
            relations: ['pitch', 'pitch.business'],
            order: { createdAt: 'DESC' },
        });

        return requests.map(r => ({
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
    }

    async approveChangeRequest(requestId: string): Promise<{ success: boolean }> {
        const request = await this.changeRequestRepository.findOne({
            where: { id: requestId },
            relations: ['pitch'],
        });
        if (!request) throw new NotFoundException('İstek bulunamadı.');

        if (request.type === 'CUSTOM_FACILITY') {
            const pitch = await this.pitchRepository.findOne({ where: { id: request.pitchId } });
            const currentFacilities = pitch?.facilities || [];
            if (!currentFacilities.includes(request.requestedData.facility)) {
                await this.pitchRepository.update(request.pitchId, {
                    facilities: [...currentFacilities, request.requestedData.facility],
                });
            }
        } else if (request.type === 'PHOTO_UPDATE') {
            const oldImageUrl = request.pitch?.imageUrl;
            await this.pitchRepository.update(request.pitchId, {
                imageUrl: request.requestedData.imageUrl,
            });
            if (oldImageUrl && oldImageUrl.includes('cloudinary.com')) {
                const match = oldImageUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
                if (match) {
                    cloudinary.uploader.destroy(match[1]).catch(err =>
                        console.error('Failed to delete old pitch image from Cloudinary:', err),
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

    async rejectChangeRequest(requestId: string, reason: string): Promise<{ success: boolean }> {
        const request = await this.changeRequestRepository.findOne({ where: { id: requestId } });
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

    // ─── Statistics ───────────────────────────────────────────────────────────

    async getStatistics() {
        // Status sayımları
        const [pending, active, rejected, suspended] = await Promise.all([
            this.businessRepository.count({ where: { status: 'pending' } }),
            this.businessRepository.count({ where: { status: 'active' } }),
            this.businessRepository.count({ where: { status: 'rejected' } }),
            this.businessRepository.count({ where: { status: 'suspended' } }),
        ]);

        // Abonelik istatistikleri
        const allSubscriptions = await this.subscriptionRepository.find({ relations: ['owner'] });
        const activeSubscriptions = allSubscriptions.filter(s => s.status === 'active');
        const trialSubscriptions = allSubscriptions.filter(s => s.status === 'trial');
        // Aktif + trial = toplam gelir potansiyeli (RevenueCat entegrasyonu öncesinde trial'lar da sayılır)
        const billedSubscriptions = [...activeSubscriptions, ...trialSubscriptions];

        const totalMRR = billedSubscriptions.reduce((sum, s) => sum + Number(s.pricePerMonth), 0);

        // Plan bazlı dağılım (aktif + trial)
        const planMap: Record<string, { count: number; monthlyRevenue: number }> = {};
        for (const sub of billedSubscriptions) {
            if (!planMap[sub.planType]) planMap[sub.planType] = { count: 0, monthlyRevenue: 0 };
            planMap[sub.planType].count++;
            planMap[sub.planType].monthlyRevenue += Number(sub.pricePerMonth);
        }
        const byPlan = Object.entries(planMap).map(([planType, data]) => ({
            planType,
            label: PLAN_LABELS[planType] ?? planType,
            count: data.count,
            monthlyRevenue: data.monthlyRevenue,
        }));

        // Son 12 ay aylık büyüme (onaylanan işletmeler)
        const now = new Date();
        const monthlyGrowth: Array<{ month: string; newBusinesses: number; approvedBusinesses: number }> = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = d.getMonth() + 1;
            const monthStr = `${year}-${String(month).padStart(2, '0')}`;

            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0, 23, 59, 59);

            const [newBusinesses, approvedBusinesses] = await Promise.all([
                this.businessRepository
                    .createQueryBuilder('b')
                    .where('b.createdAt >= :start AND b.createdAt <= :end', { start: startOfMonth, end: endOfMonth })
                    .getCount(),
                this.businessRepository
                    .createQueryBuilder('b')
                    .where('b.status = :status AND b.reviewedAt >= :start AND b.reviewedAt <= :end',
                        { status: 'active', start: startOfMonth, end: endOfMonth })
                    .getCount(),
            ]);

            monthlyGrowth.push({ month: monthStr, newBusinesses, approvedBusinesses });
        }

        return {
            counts: { pending, active, rejected, suspended },
            revenue: {
                activeSubscriptions: activeSubscriptions.length,
                trialSubscriptions: trialSubscriptions.length,
                totalMRR,
                byPlan,
            },
            monthlyGrowth,
        };
    }

    // ─── Deletion Report ──────────────────────────────────────────────────────

    async getDeletionReport() {
        const deletions = await this.accountDeletionRepository.find({
            order: { deletedAt: 'DESC' },
        });

        const REASON_LABELS: Record<string, string> = {
            NOT_USING: 'Artık kullanmak istemiyorum',
            PRIVACY: 'Gizlilik endişelerim var',
            DIFFERENT_APP: 'Farklı bir uygulama kullanıyorum',
            NOT_SATISFIED: 'Beklentilerimi karşılamıyor',
            TECHNICAL: 'Teknik sorunlar yaşıyorum',
            OTHER: 'Diğer',
        };

        const reasonBreakdown = Object.entries(
            deletions.reduce((acc, d) => {
                acc[d.reason] = (acc[d.reason] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
        ).map(([key, count]) => ({ key, label: REASON_LABELS[key] || key, count }));

        // Son 6 aylık trend
        const now = new Date();
        const monthlyTrend: { month: string; count: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = d.toISOString().slice(0, 7);
            const count = deletions.filter(del => del.deletedAt.toISOString().slice(0, 7) === monthStr).length;
            monthlyTrend.push({ month: monthStr, count });
        }

        const thisMonth = now.toISOString().slice(0, 7);
        const thisMonthCount = deletions.filter(d => d.deletedAt.toISOString().slice(0, 7) === thisMonth).length;

        return {
            total: deletions.length,
            thisMonth: thisMonthCount,
            reasonBreakdown,
            monthlyTrend,
            recent: deletions.slice(0, 30),
        };
    }

    // ─── User Reports ─────────────────────────────────────────────────────────

    async getReports(status?: ReportStatus) {
        return this.userReportRepository.find({
            where: status ? { status } : {},
            relations: ['reporter', 'reportedUser', 'message'],
            order: { createdAt: 'DESC' },
        });
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

        const notification = this.notificationRepository.create({
            userId,
            type: 'CHAT_BAN',
            title: 'Mesaj Engeliniz Var',
            message: 'Hesabınızda mesaj engeli uygulandı. Lütfen destek ile iletişime geçin.',
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

    async getBannedUsers() {
        const users = await this.userRepository.find({
            where: { isChatBanned: true },
            select: ['id', 'username', 'full_name', 'chatBannedAt', 'chatBanExpiry'],
            order: { chatBannedAt: 'DESC' },
        });
        const now = new Date();
        const expiredIds: string[] = [];
        const active = users.filter(u => {
            if (u.chatBanExpiry && u.chatBanExpiry < now) {
                expiredIds.push(u.id);
                return false;
            }
            return true;
        });
        if (expiredIds.length) {
            await this.userRepository.update(expiredIds, {
                isChatBanned: false, chatBannedAt: null, chatBanExpiry: null,
            });
        }
        return active;
    }

    /**
     * Aboneliği olmayan tüm aktif işletmeler için otomatik trial aboneliği oluşturur.
     * Saha sayısına göre doğru planı belirler. Idempotent (tekrar çalıştırılabilir).
     * Production'da ödeme entegrasyonu öncesi kayıtlı işletmeleri düzeltmek için kullanılır.
     */
    async seedMissingSubscriptions(): Promise<{ created: number; updated: number; skipped: number; details: any[] }> {
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
            if (!business) { skipped++; continue; }

            const pitchCount = business.pitches?.length ?? 0;
            const planKey = Math.min(pitchCount, 4); // 5+ → enterprise
            const plan = pitchCount >= 5
                ? { planType: '5plus_pitch', pitchCount: 5, pricePerMonth: 5399.99 }
                : PITCH_COUNT_TO_PLAN[planKey];

            const existing = await this.subscriptionRepository.findOne({ where: { ownerId: owner.id } });

            if (existing) {
                // Plan tipi saha sayısıyla uyuşmuyorsa güncelle
                const needsUpdate = existing.planType !== plan.planType || existing.pitchCount !== plan.pitchCount;
                if (needsUpdate) {
                    existing.planType = plan.planType;
                    existing.pitchCount = plan.pitchCount;
                    existing.pricePerMonth = plan.pricePerMonth;
                    await this.subscriptionRepository.save(existing);
                    updated++;
                    details.push({ email: owner.email, business: business.name, action: 'updated', plan: plan.planType });
                } else {
                    skipped++;
                    details.push({ email: owner.email, business: business.name, action: 'skipped', plan: plan.planType });
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
                details.push({ email: owner.email, business: business.name, action: 'created', plan: plan.planType });
            }
        }

        return { created, updated, skipped, details };
    }
}
