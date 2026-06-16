import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { BusinessOwnerService } from '../business-owner/business-owner.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository, MoreThanOrEqual } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { Business } from '../business/entities/business.entity';
import { Pitch } from '../pitches/entities/pitch.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { TimeSlot } from '../pitches/entities/time-slot.entity';
import { OtpCode } from './entities/otp-code.entity';
import { SmsService } from '../sms/sms.service';
import { SubscriptionService } from '../subscription/subscription.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private businessOwnerService: BusinessOwnerService,
    private jwtService: JwtService,
    private dataSource: DataSource,
    private smsService: SmsService,
    private subscriptionService: SubscriptionService,
    @InjectRepository(OtpCode)
    private otpRepository: Repository<OtpCode>,
  ) {}

  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.startsWith('0')) return '90' + cleaned.slice(1);
    if (!cleaned.startsWith('90')) return '90' + cleaned;
    return cleaned;
  }

  // Normalize edilmiş numaranın geçerli bir Türkiye cep telefonu numarası olup olmadığını kontrol eder (905XXXXXXXXX)
  private validatePhoneFormat(phone: string): void {
    const normalized = this.normalizePhone(phone);
    if (!/^905\d{9}$/.test(normalized)) {
      throw new BadRequestException(
        'Lütfen geçerli bir telefon numarası giriniz.',
      );
    }
  }

  private async sendOtpSms(phone: string, message: string): Promise<void> {
    try {
      await this.smsService.sendSms(phone, message);
    } catch {
      throw new BadRequestException(
        'Doğrulama kodu gönderilemedi. Lütfen telefon numaranızı kontrol edip tekrar deneyin.',
      );
    }
  }

  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async checkRateLimit(phone: string, purpose: string): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await this.otpRepository.count({
      where: { phone, purpose, createdAt: MoreThanOrEqual(oneHourAgo) },
    });
    if (recentCount >= 3) {
      throw new HttpException(
        'Çok fazla doğrulama kodu isteğinde bulundunuz. Lütfen 1 saat sonra tekrar deneyin.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async sendOtp(phone: string): Promise<void> {
    this.validatePhoneFormat(phone);
    phone = this.normalizePhone(phone);

    // Telefon zaten kayıtlıysa OTP gönderme (sadece kullanıcı tablosu kontrol edilir)
    const existingUser = await this.usersService.findByPhone(phone);
    if (existingUser) {
      throw new ConflictException(
        'Bu telefon numarası zaten bir kullanıcı hesabına kayıtlıdır. Giriş yapmayı deneyin.',
      );
    }

    // Saatte maksimum 3 OTP isteği (sadece kullanıcı kayıt OTP'leri sayılır)
    await this.checkRateLimit(phone, 'registration');

    // Önceki bekleyen kayıt kodlarını sil
    await this.otpRepository.delete({
      phone,
      verified: false,
      purpose: 'registration',
    });

    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 dakika

    const otp = this.otpRepository.create({
      phone,
      code,
      verified: false,
      expiresAt,
      purpose: 'registration',
      attempts: 0,
    });
    await this.otpRepository.save(otp);

    await this.sendOtpSms(
      phone,
      `Dimli doğrulama kodunuz: ${code}. Kodu kimseyle paylaşmayın.`,
    );
  }

  async verifyOtp(phone: string, code: string): Promise<void> {
    phone = this.normalizePhone(phone);

    const otp = await this.otpRepository.findOne({
      where: { phone, verified: false, purpose: 'registration' },
    });

    if (!otp) {
      throw new BadRequestException('Geçersiz doğrulama kodu.');
    }

    // Deneme sınırı kontrolü
    otp.attempts += 1;
    if (otp.attempts >= 5) {
      await this.otpRepository.delete({ id: otp.id });
      throw new BadRequestException(
        'Çok fazla yanlış deneme. Lütfen yeni kod isteyin.',
      );
    }

    if (otp.code !== code) {
      await this.otpRepository.save(otp);
      throw new BadRequestException('Geçersiz doğrulama kodu.');
    }

    if (new Date() > otp.expiresAt) {
      await this.otpRepository.delete({ id: otp.id });
      throw new BadRequestException(
        'Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin.',
      );
    }

    otp.verified = true;
    await this.otpRepository.save(otp);
  }

  async isPhoneVerified(phone: string): Promise<boolean> {
    phone = this.normalizePhone(phone);
    const otp = await this.otpRepository.findOne({
      where: { phone, verified: true, purpose: 'registration' },
    });
    return !!otp && new Date() < otp.expiresAt;
  }

  async cleanupOtp(phone: string): Promise<void> {
    phone = this.normalizePhone(phone);
    await this.otpRepository.delete({ phone });
  }

  // ─── İşletme Sahibi OTP ─────────────────────────────────────────────────────

  async sendBusinessOwnerOtp(phone: string): Promise<void> {
    this.validatePhoneFormat(phone);
    phone = this.normalizePhone(phone);

    // Telefon başka bir işletme sahibine ait mi? (sadece işletme sahibi tablosu kontrol edilir)
    const existingOwner = await this.businessOwnerService.findByPhone(phone);
    if (existingOwner) {
      throw new ConflictException(
        'Bu telefon numarası zaten bir işletme sahibi hesabına kayıtlıdır. İşletme girişi sayfasından giriş yapabilirsiniz.',
      );
    }

    // Saatte maksimum 3 OTP isteği (sadece işletme kayıt OTP'leri sayılır)
    await this.checkRateLimit(phone, 'business_registration');

    // Önceki bekleyen kodları sil
    await this.otpRepository.delete({
      phone,
      verified: false,
      purpose: 'business_registration',
    });

    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 dakika

    const otp = this.otpRepository.create({
      phone,
      code,
      verified: false,
      expiresAt,
      purpose: 'business_registration',
      attempts: 0,
    });
    await this.otpRepository.save(otp);

    await this.sendOtpSms(
      phone,
      `Dimli doğrulama kodunuz: ${code}. Kodu kimseyle paylaşmayın.`,
    );
  }

  async verifyBusinessOwnerOtp(phone: string, code: string): Promise<void> {
    phone = this.normalizePhone(phone);

    const otp = await this.otpRepository.findOne({
      where: { phone, verified: false, purpose: 'business_registration' },
    });

    if (!otp) {
      throw new BadRequestException('Geçersiz doğrulama kodu.');
    }

    otp.attempts += 1;
    if (otp.attempts >= 5) {
      await this.otpRepository.delete({ id: otp.id });
      throw new BadRequestException(
        'Çok fazla yanlış deneme. Lütfen yeni kod isteyin.',
      );
    }

    if (otp.code !== code) {
      await this.otpRepository.save(otp);
      throw new BadRequestException('Geçersiz doğrulama kodu.');
    }

    if (new Date() > otp.expiresAt) {
      await this.otpRepository.delete({ id: otp.id });
      throw new BadRequestException(
        'Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin.',
      );
    }

    otp.verified = true;
    await this.otpRepository.save(otp);
  }

  async isBusinessOwnerPhoneVerified(phone: string): Promise<boolean> {
    phone = this.normalizePhone(phone);
    const otp = await this.otpRepository.findOne({
      where: { phone, verified: true, purpose: 'business_registration' },
    });
    return !!otp;
  }

  // ─── Şifremi Unuttum Akışı ──────────────────────────────────────────────────

  async sendPasswordResetOtp(phone: string): Promise<void> {
    phone = this.normalizePhone(phone);

    // Telefon kayıtlı DEĞİLSE hata ver
    const user = await this.usersService.findByPhone(phone);
    if (!user) {
      throw new NotFoundException(
        'Bu telefon numarasıyla kayıtlı hesap bulunamadı.',
      );
    }

    // Saatte maksimum 3 OTP isteği (sadece şifre sıfırlama OTP'leri sayılır)
    await this.checkRateLimit(phone, 'password_reset');

    // Önceki bekleyen şifre sıfırlama kodlarını sil
    await this.otpRepository.delete({
      phone,
      verified: false,
      purpose: 'password_reset',
    });

    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 dakika

    const otp = this.otpRepository.create({
      phone,
      code,
      verified: false,
      expiresAt,
      purpose: 'password_reset',
      attempts: 0,
    });
    await this.otpRepository.save(otp);

    await this.sendOtpSms(
      phone,
      `Dimli şifre sıfırlama kodunuz: ${code}. Kodu kimseyle paylaşmayın.`,
    );
  }

  async verifyPasswordResetOtp(phone: string, code: string): Promise<void> {
    phone = this.normalizePhone(phone);

    const otp = await this.otpRepository.findOne({
      where: { phone, verified: false, purpose: 'password_reset' },
    });

    if (!otp) {
      throw new BadRequestException('Geçersiz doğrulama kodu.');
    }

    // Deneme sınırı kontrolü
    otp.attempts += 1;
    if (otp.attempts >= 5) {
      await this.otpRepository.delete({ id: otp.id });
      throw new BadRequestException(
        'Çok fazla yanlış deneme. Lütfen yeni kod isteyin.',
      );
    }

    if (otp.code !== code) {
      await this.otpRepository.save(otp);
      throw new BadRequestException('Geçersiz doğrulama kodu.');
    }

    if (new Date() > otp.expiresAt) {
      await this.otpRepository.delete({ id: otp.id });
      throw new BadRequestException(
        'Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin.',
      );
    }

    otp.verified = true;
    await this.otpRepository.save(otp);
  }

  async resetPassword(phone: string, newPassword: string): Promise<void> {
    phone = this.normalizePhone(phone);

    const otp = await this.otpRepository.findOne({
      where: { phone, verified: true, purpose: 'password_reset' },
    });

    if (!otp || new Date() > otp.expiresAt) {
      throw new BadRequestException(
        'Doğrulama süresi dolmuş. Lütfen tekrar deneyin.',
      );
    }

    const user = await this.usersService.findByPhone(phone);
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(user.id, hashedPassword);
    await this.otpRepository.delete({ phone, purpose: 'password_reset' });
  }

  // ─── İşletme Şifremi Unuttum Akışı ──────────────────────────────────────────

  private maskPhone(phone: string): string {
    if (!phone || phone.length < 10) return phone;
    // Örn: 905321234567 -> +90 53* *** ** 67
    const lastTwo = phone.slice(-2);
    const prefix = phone.startsWith('90')
      ? '+90 ' + phone.slice(2, 4)
      : phone.slice(0, 3);
    return `${prefix}* *** ** ${lastTwo}`;
  }

  async sendBusinessPasswordResetOtp(
    email: string,
  ): Promise<{ maskedPhone: string }> {
    const owner = await this.businessOwnerService.findByEmail(email);
    if (!owner) {
      throw new NotFoundException(
        'Bu e-posta adresiyle kayıtlı işletme bulunamadı.',
      );
    }

    if (!owner.phone) {
      throw new BadRequestException(
        'Bu işletme hesabına tanımlı bir telefon numarası bulunmamaktadır. Lütfen sistem yöneticisiyle iletişime geçin.',
      );
    }

    const phone = this.normalizePhone(owner.phone);

    // Saatte maksimum 3 OTP isteği
    await this.checkRateLimit(phone, 'business_password_reset');

    // Önceki bekleyen şifre sıfırlama kodlarını sil
    await this.otpRepository.delete({
      phone,
      verified: false,
      purpose: 'business_password_reset',
    });

    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 dakika

    const otp = this.otpRepository.create({
      phone,
      code,
      verified: false,
      expiresAt,
      purpose: 'business_password_reset',
      attempts: 0,
    });
    await this.otpRepository.save(otp);

    await this.sendOtpSms(
      phone,
      `Dimli İşletme Paneli şifre sıfırlama kodunuz: ${code}. Kodu kimseyle paylaşmayın.`,
    );

    return { maskedPhone: this.maskPhone(phone) };
  }

  async verifyBusinessPasswordResetOtp(
    email: string,
    code: string,
  ): Promise<void> {
    const owner = await this.businessOwnerService.findByEmail(email);
    if (!owner || !owner.phone) {
      throw new BadRequestException(
        'İşletme veya telefon numarası bulunamadı.',
      );
    }

    const phone = this.normalizePhone(owner.phone);

    const otp = await this.otpRepository.findOne({
      where: { phone, verified: false, purpose: 'business_password_reset' },
    });

    if (!otp) {
      throw new BadRequestException('Geçersiz doğrulama kodu.');
    }

    // Deneme sınırı kontrolü
    otp.attempts += 1;
    if (otp.attempts >= 5) {
      await this.otpRepository.delete({ id: otp.id });
      throw new BadRequestException(
        'Çok fazla yanlış deneme. Lütfen yeni kod isteyin.',
      );
    }

    if (otp.code !== code) {
      await this.otpRepository.save(otp);
      throw new BadRequestException('Geçersiz doğrulama kodu.');
    }

    if (new Date() > otp.expiresAt) {
      await this.otpRepository.delete({ id: otp.id });
      throw new BadRequestException(
        'Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin.',
      );
    }

    otp.verified = true;
    await this.otpRepository.save(otp);
  }

  async resetBusinessPassword(
    email: string,
    newPassword: string,
  ): Promise<void> {
    const owner = await this.businessOwnerService.findByEmail(email);
    if (!owner || !owner.phone) {
      throw new NotFoundException('İşletme bulunamadı.');
    }

    const phone = this.normalizePhone(owner.phone);

    const otp = await this.otpRepository.findOne({
      where: { phone, verified: true, purpose: 'business_password_reset' },
    });

    if (!otp || new Date() > otp.expiresAt) {
      throw new BadRequestException(
        'Doğrulama süresi dolmuş. Lütfen tekrar deneyin.',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.businessOwnerService.updatePassword(owner.id, hashedPassword);
    await this.otpRepository.delete({
      phone,
      purpose: 'business_password_reset',
    });
  }

  // ─── Mevcut Auth Metodları ───────────────────────────────────────────────────

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async validateBusinessOwner(email: string, pass: string): Promise<any> {
    const owner = await this.businessOwnerService.findByEmail(email);
    if (owner && (await bcrypt.compare(pass, owner.password))) {
      const { password, ...result } = owner;
      return result;
    }
    return null;
  }

  login(user: any) {
    const payload = { username: user.username, sub: user.id, role: 'user' };
    return {
      access_token: this.jwtService.sign(payload),
      role: 'user',
    };
  }

  loginBusinessOwner(owner: any) {
    const payload = {
      email: owner.email,
      sub: owner.id,
      role: 'business_owner',
      businessId: owner.business?.id,
    };
    return {
      access_token: this.jwtService.sign(payload),
      role: 'business_owner',
      ownerId: owner.id,
      businessId: owner.business?.id,
    };
  }

  async registerBusinessOwner(data: any) {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const newOwner = await this.businessOwnerService.create({
      ...data,
      password: hashedPassword,
    });

    const { password, ...result } = newOwner;
    return result;
  }

  async registerBusinessFull(data: RegisterBusinessDto) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Email benzersizlik kontrolü
      const existingOwner = await this.businessOwnerService.findByEmail(
        data.owner.email,
      );
      if (existingOwner) {
        throw new ConflictException('Bu e-posta adresi zaten kayıtlı.');
      }

      // 2. Telefon benzersizlik kontrolü
      if (data.owner.phone) {
        const normalizedPhone = this.normalizePhone(data.owner.phone);
        const existingPhone =
          await this.businessOwnerService.findByPhone(normalizedPhone);
        if (existingPhone) {
          throw new ConflictException(
            'Bu telefon numarası zaten bir işletme sahibi hesabına kayıtlıdır.',
          );
        }

        // 3. Telefon doğrulama kontrolü
        const isVerified =
          await this.isBusinessOwnerPhoneVerified(normalizedPhone);
        if (!isVerified) {
          throw new BadRequestException('Telefon numarası doğrulanmamış.');
        }
      }

      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(data.owner.password, salt);

      const businessOwner = new BusinessOwner();
      businessOwner.email = data.owner.email;
      businessOwner.password = hashedPassword;
      businessOwner.fullName = data.owner.fullName;
      if (data.owner.phone) {
        businessOwner.phone = this.normalizePhone(data.owner.phone);
        businessOwner.phoneVerified = true;
      }

      const savedOwner = await queryRunner.manager.save(businessOwner);

      // 2. Create Business
      const business = new Business();
      business.name = data.business.name;
      business.city = data.business.city;
      business.district = data.business.district;
      business.address = data.business.address;
      business.latitude = data.business.latitude;
      business.longitude = data.business.longitude;
      if (data.business.openTime) business.openTime = data.business.openTime;
      if (data.business.closeTime) business.closeTime = data.business.closeTime;

      const savedBusiness = await queryRunner.manager.save(business);

      // 3. Link Owner and Business
      savedOwner.business = savedBusiness;
      await queryRunner.manager.save(savedOwner);

      // 4. Create Pitches (with optional TimeSlots)
      if (data.pitches && data.pitches.length > 0) {
        for (const pitchData of data.pitches) {
          const pitch = new Pitch();
          pitch.name = pitchData.name;
          if (pitchData.type) pitch.type = pitchData.type;
          pitch.pricePerHour = pitchData.pricePerHour;
          if (pitchData.facilities) pitch.facilities = pitchData.facilities;
          if (pitchData.closedDays) pitch.closedDays = pitchData.closedDays;
          if ((pitchData as any).imageUrl)
            pitch.imageUrl = (pitchData as any).imageUrl;

          if (pitchData.openTime) {
            pitch.openTime = pitchData.openTime;
          } else if (savedBusiness.openTime) {
            pitch.openTime = savedBusiness.openTime;
          }

          if (pitchData.closeTime) {
            pitch.closeTime = pitchData.closeTime;
          } else if (savedBusiness.closeTime) {
            pitch.closeTime = savedBusiness.closeTime;
          }

          pitch.business = savedBusiness;
          pitch.businessId = savedBusiness.id;

          const savedPitch = await queryRunner.manager.save(pitch);

          if (pitchData.timeSlots && Array.isArray(pitchData.timeSlots)) {
            for (const slotData of pitchData.timeSlots) {
              const timeSlot = new TimeSlot();
              timeSlot.pitchId = savedPitch.id;
              timeSlot.startTime = slotData.startTime;
              timeSlot.endTime = slotData.endTime;
              timeSlot.isActive = true;
              await queryRunner.manager.save(timeSlot);
            }
          }
        }
      }

      await queryRunner.commitTransaction();

      // 5. Trial abonelik oluştur (planType varsa)
      if (data.planType) {
        try {
          await this.subscriptionService.createTrialSubscription(
            savedOwner.id,
            data.planType,
            data.revenuecatAnonymousId,
          );
        } catch {
          // Abonelik oluşturma hatası kayıt işlemini geri almaz
        }
      }

      // OTP temizle
      if (data.owner.phone) {
        await this.otpRepository.delete({
          phone: this.normalizePhone(data.owner.phone),
          purpose: 'business_registration',
        });
      }

      const { password, ...result } = savedOwner;
      const payload = {
        email: savedOwner.email,
        sub: savedOwner.id,
        role: 'business_owner',
        businessId: savedBusiness.id,
      };
      return {
        ...result,
        business: savedBusiness,
        access_token: this.jwtService.sign(payload),
        role: 'business_owner',
        ownerId: savedOwner.id,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
