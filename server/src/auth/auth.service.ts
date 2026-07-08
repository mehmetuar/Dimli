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
import { randomInt, timingSafeEqual } from 'crypto';
import { DataSource, DeepPartial, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { Business } from '../business/entities/business.entity';
import { Pitch } from '../pitches/entities/pitch.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { TimeSlot } from '../pitches/entities/time-slot.entity';
import { OtpCode } from './entities/otp-code.entity';
import { SmsService } from '../sms/sms.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { OtpSecurityService } from './otp-security.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private businessOwnerService: BusinessOwnerService,
    private jwtService: JwtService,
    private dataSource: DataSource,
    private smsService: SmsService,
    private subscriptionService: SubscriptionService,
    private otpSecurity: OtpSecurityService,
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
    return randomInt(100000, 1000000).toString();
  }

  // Zamanlama saldırılarına karşı sabit süreli karşılaştırma
  private otpCodeMatches(expected: string, provided: string): boolean {
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  // 4 OTP akışının ortak doğrulama adımı: deneme sayacı, 5 yanlışta telefon
  // kilidi (gönderim + doğrulama, tüm amaçlar), süre ve kod kontrolü.
  private async completeOtpVerification(
    otp: OtpCode,
    code: string,
    phone: string,
  ): Promise<void> {
    otp.attempts += 1;
    if (otp.attempts >= 5) {
      await this.otpRepository.delete({ id: otp.id });
      const lockMinutes = await this.otpSecurity.lockPhone(phone);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Çok fazla yanlış deneme yaptınız. Güvenlik nedeniyle ${lockMinutes} dakika boyunca kod isteyemez ve doğrulama yapamazsınız.`,
          retryAfter: lockMinutes * 60,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!this.otpCodeMatches(otp.code, code)) {
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

    // Kilit + cooldown + saatlik/günlük limitler + global bütçe (OtpSecurityService)
    await this.otpSecurity.assertSendAllowed(phone, 'registration');

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

    // Gönderim DENEMESİ sayılır (SMS başarısı değil) — hata yolları bedava tekrar sağlamaz
    await this.otpSecurity.recordSend(phone, 'registration');

    await this.sendOtpSms(
      phone,
      `Dimli doğrulama kodunuz: ${code}. Kodu kimseyle paylaşmayın.`,
    );
  }

  async verifyOtp(phone: string, code: string): Promise<void> {
    phone = this.normalizePhone(phone);

    await this.otpSecurity.assertVerifyAllowed(phone);

    const otp = await this.otpRepository.findOne({
      where: { phone, verified: false, purpose: 'registration' },
    });

    if (!otp) {
      throw new BadRequestException('Geçersiz doğrulama kodu.');
    }

    await this.completeOtpVerification(otp, code, phone);
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

    // Kilit + cooldown + saatlik/günlük limitler + global bütçe (OtpSecurityService)
    await this.otpSecurity.assertSendAllowed(phone, 'business_registration');

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

    await this.otpSecurity.recordSend(phone, 'business_registration');

    await this.sendOtpSms(
      phone,
      `Dimli doğrulama kodunuz: ${code}. Kodu kimseyle paylaşmayın.`,
    );
  }

  async verifyBusinessOwnerOtp(phone: string, code: string): Promise<void> {
    phone = this.normalizePhone(phone);

    await this.otpSecurity.assertVerifyAllowed(phone);

    const otp = await this.otpRepository.findOne({
      where: { phone, verified: false, purpose: 'business_registration' },
    });

    if (!otp) {
      throw new BadRequestException('Geçersiz doğrulama kodu.');
    }

    await this.completeOtpVerification(otp, code, phone);
  }

  async isBusinessOwnerPhoneVerified(phone: string): Promise<boolean> {
    phone = this.normalizePhone(phone);
    const otp = await this.otpRepository.findOne({
      where: { phone, verified: true, purpose: 'business_registration' },
    });
    return !!otp && new Date() < otp.expiresAt;
  }

  // ─── Şifremi Unuttum Akışı ──────────────────────────────────────────────────

  async sendPasswordResetOtp(phone: string): Promise<void> {
    this.validatePhoneFormat(phone);
    phone = this.normalizePhone(phone);

    // Telefon kayıtlı DEĞİLSE hata ver
    const user = await this.usersService.findByPhone(phone);
    if (!user) {
      throw new NotFoundException(
        'Bu telefon numarasıyla kayıtlı hesap bulunamadı.',
      );
    }

    // Kilit + cooldown + saatlik/günlük limitler + global bütçe (OtpSecurityService)
    await this.otpSecurity.assertSendAllowed(phone, 'password_reset');

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

    await this.otpSecurity.recordSend(phone, 'password_reset');

    await this.sendOtpSms(
      phone,
      `Dimli şifre sıfırlama kodunuz: ${code}. Kodu kimseyle paylaşmayın.`,
    );
  }

  async verifyPasswordResetOtp(phone: string, code: string): Promise<void> {
    phone = this.normalizePhone(phone);

    await this.otpSecurity.assertVerifyAllowed(phone);

    const otp = await this.otpRepository.findOne({
      where: { phone, verified: false, purpose: 'password_reset' },
    });

    if (!otp) {
      throw new BadRequestException('Geçersiz doğrulama kodu.');
    }

    await this.completeOtpVerification(otp, code, phone);
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

    // Kilit + cooldown + saatlik/günlük limitler + global bütçe (OtpSecurityService)
    await this.otpSecurity.assertSendAllowed(phone, 'business_password_reset');

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

    await this.otpSecurity.recordSend(phone, 'business_password_reset');

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

    await this.otpSecurity.assertVerifyAllowed(phone);

    const otp = await this.otpRepository.findOne({
      where: { phone, verified: false, purpose: 'business_password_reset' },
    });

    if (!otp) {
      throw new BadRequestException('Geçersiz doğrulama kodu.');
    }

    await this.completeOtpVerification(otp, code, phone);
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
      const { password: _password, ...result } = user;
      return result;
    }
    return null;
  }

  async validateBusinessOwner(email: string, pass: string): Promise<any> {
    const owner = await this.businessOwnerService.findByEmail(email);
    if (owner && (await bcrypt.compare(pass, owner.password))) {
      const { password: _password, ...result } = owner;
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

  async registerBusinessOwner(data: DeepPartial<BusinessOwner>) {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(data.password as string, salt);

    const newOwner = await this.businessOwnerService.create({
      ...data,
      password: hashedPassword,
    });

    const { password: _password, ...result } = newOwner;
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
      if (data.business.coverImageUrl)
        business.coverImageUrl = data.business.coverImageUrl;

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

      const { password: _password, ...result } = savedOwner;
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
