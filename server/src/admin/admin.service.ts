import {
    Injectable,
    NotFoundException,
    UnauthorizedException,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminUser } from './entities/admin-user.entity';
import { Business } from '../business/entities/business.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(AdminUser)
        private adminUserRepository: Repository<AdminUser>,
        @InjectRepository(Business)
        private businessRepository: Repository<Business>,
        @InjectRepository(BusinessOwner)
        private businessOwnerRepository: Repository<BusinessOwner>,
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

    async approveApplication(businessId: string, adminId: string) {
        const business = await this.businessRepository.findOne({ where: { id: businessId } });
        if (!business) throw new NotFoundException('İşletme bulunamadı.');

        business.status = 'active';
        business.reviewedAt = new Date();
        business.rejectionReason = null;
        await this.businessRepository.save(business);

        return { success: true, message: 'İşletme onaylandı.' };
    }

    async rejectApplication(businessId: string, adminId: string, reason: string) {
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
}
