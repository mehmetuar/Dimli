import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan, Repository } from 'typeorm';
import { OtpSendLog } from './entities/otp-send-log.entity';
import { OtpLock } from './entities/otp-lock.entity';
import { OtpCode } from './entities/otp-code.entity';

export type OtpPurpose =
  | 'registration'
  | 'business_registration'
  | 'password_reset'
  | 'business_password_reset';

// Env boş/geçersizse varsayılanı kullan; 0 geçerli bir değerdir (kill-switch için)
const envInt = (name: string, def: number): number => {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return def;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : def;
};

const RESEND_COOLDOWN_SEC = envInt('OTP_RESEND_COOLDOWN_SEC', 60);
const MAX_PER_HOUR = envInt('OTP_MAX_PER_HOUR', 3);
const MAX_PER_DAY_PHONE = envInt('OTP_MAX_PER_DAY_PHONE', 10);
const LOCK_DURATION_MIN = envInt('OTP_LOCK_DURATION_MIN', 60);
const SMS_DAILY_LIMIT = envInt('SMS_DAILY_LIMIT', 2000); // 0 = tam kapatma

// Tüm OTP SMS akışlarının ortak güvenlik katmanı. Dört gönderim akışı
// assertSendAllowed + recordSend, dört doğrulama akışı assertVerifyAllowed +
// lockPhone kullanır — limit mantığı tek yerde yaşar, akış başına kopyalanmaz.
// Tüm limit ihlalleri tek tip gövdeyle 429 döner:
//   { statusCode: 429, message: '<Türkçe>', retryAfter: <saniye> }
@Injectable()
export class OtpSecurityService {
  private readonly logger = new Logger('OtpSecurity');

  constructor(
    @InjectRepository(OtpSendLog)
    private sendLogRepository: Repository<OtpSendLog>,
    @InjectRepository(OtpLock)
    private lockRepository: Repository<OtpLock>,
    @InjectRepository(OtpCode)
    private otpRepository: Repository<OtpCode>,
  ) {}

  private throw429(message: string, retryAfterSec: number): never {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message,
        retryAfter: retryAfterSec,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  // NOT: Yaş/kalan-süre hesapları bilinçli olarak SQL'de (now()::timestamp farkı)
  // yapılır, JS'te Date.getTime() ile DEĞİL. "timestamp without time zone" kolonları
  // DB oturum saat dilimiyle yazılır; JS'e okunurken process TZ'siyle yorumlanır —
  // oturum UTC değilse (ör. local Postgres Europe/Istanbul) JS aritmetiği saatlerce
  // kayar. SQL içinde her iki taraf da aynı oturum diliminde olduğundan fark her
  // ortamda doğrudur (bkz. main.ts'teki TZ açıklaması).
  private async assertNotLocked(phone: string): Promise<void> {
    const lockRow = await this.lockRepository
      .createQueryBuilder('lock')
      .select(
        `EXTRACT(EPOCH FROM (lock."lockedUntil" - now()::timestamp))`,
        'remainingSec',
      )
      .where('lock.phone = :phone', { phone })
      .getRawOne<{ remainingSec: string }>();
    if (!lockRow) return;
    const remainingSec = Math.ceil(Number(lockRow.remainingSec));
    if (remainingSec <= 0) {
      await this.lockRepository.delete({ phone });
      return;
    }
    const remainingMin = Math.max(1, Math.ceil(remainingSec / 60));
    this.throw429(
      `Çok fazla yanlış deneme nedeniyle bu numara geçici olarak engellendi. Lütfen ${remainingMin} dakika sonra tekrar deneyin.`,
      remainingSec,
    );
  }

  // Gönderim öncesi tüm kontroller, ucuzdan pahalıya:
  // kilit → cooldown → saatlik → telefon günlük → sistem günlük bütçesi
  async assertSendAllowed(phone: string, purpose: OtpPurpose): Promise<void> {
    await this.assertNotLocked(phone);

    const last = await this.sendLogRepository
      .createQueryBuilder('log')
      .select(
        `EXTRACT(EPOCH FROM (now()::timestamp - log."createdAt"))`,
        'ageSec',
      )
      .where('log.phone = :phone AND log.purpose = :purpose', {
        phone,
        purpose,
      })
      .orderBy('log."createdAt"', 'DESC')
      .limit(1)
      .getRawOne<{ ageSec: string }>();
    if (last) {
      const ageSec = Number(last.ageSec);
      if (ageSec < RESEND_COOLDOWN_SEC) {
        const wait = Math.max(1, Math.ceil(RESEND_COOLDOWN_SEC - ageSec));
        this.throw429(
          `Yeni kod istemek için ${wait} saniye beklemelisiniz.`,
          wait,
        );
      }
    }

    const lastHour = await this.sendLogRepository
      .createQueryBuilder('log')
      .select(
        `EXTRACT(EPOCH FROM (now()::timestamp - log."createdAt"))`,
        'ageSec',
      )
      .where(
        `log.phone = :phone AND log.purpose = :purpose AND log."createdAt" >= now()::timestamp - interval '1 hour'`,
        { phone, purpose },
      )
      .orderBy('log."createdAt"', 'ASC')
      .getRawMany<{ ageSec: string }>();
    if (lastHour.length >= MAX_PER_HOUR) {
      const oldestAgeSec = Number(lastHour[0].ageSec);
      const retrySec = Math.max(1, Math.ceil(60 * 60 - oldestAgeSec));
      this.throw429(
        `Bu numara için saatlik kod sınırına ulaşıldı. Lütfen ${Math.max(1, Math.ceil(retrySec / 60))} dakika sonra tekrar deneyin.`,
        retrySec,
      );
    }

    // Telefon başına günlük tavan — amaçlar arası toplam (kayan 24 saat)
    const lastDay = await this.sendLogRepository
      .createQueryBuilder('log')
      .where(
        `log.phone = :phone AND log."createdAt" >= now()::timestamp - interval '24 hours'`,
        { phone },
      )
      .getCount();
    if (lastDay >= MAX_PER_DAY_PHONE) {
      this.throw429(
        'Bu numara için günlük kod sınırına ulaşıldı. Lütfen daha sonra tekrar deneyin.',
        60 * 60,
      );
    }

    // Sistem geneli günlük bütçe (DB oturumunun takvim günü; canlıda UTC).
    // SMS_DAILY_LIMIT=0 → kill-switch: tüm OTP gönderimi durur (env ile, deploy'suz).
    const totalToday = await this.sendLogRepository
      .createQueryBuilder('log')
      .where(`log."createdAt" >= date_trunc('day', now()::timestamp)`)
      .getCount();
    if (totalToday >= SMS_DAILY_LIMIT) {
      this.logger.error(
        `SMS günlük bütçesi doldu (${totalToday}/${SMS_DAILY_LIMIT}) — engellendi: ${phone} / ${purpose}`,
      );
      this.throw429(
        'Sistem yoğunluğu nedeniyle şu anda doğrulama kodu gönderilemiyor. Lütfen daha sonra tekrar deneyin.',
        60 * 60,
      );
    }
    if (SMS_DAILY_LIMIT > 0 && totalToday + 1 >= SMS_DAILY_LIMIT * 0.8) {
      this.logger.warn(
        `SMS günlük bütçesinin %80'ine ulaşıldı: ${totalToday + 1}/${SMS_DAILY_LIMIT}`,
      );
    }
  }

  // SMS gönderiminden ÖNCE çağrılır: deneme sayılır, başarı değil — SMS hata
  // yolları saldırgana bedava tekrar hakkı vermez.
  async recordSend(phone: string, purpose: OtpPurpose): Promise<void> {
    await this.sendLogRepository.save(
      this.sendLogRepository.create({ phone, purpose }),
    );
  }

  async assertVerifyAllowed(phone: string): Promise<void> {
    await this.assertNotLocked(phone);
  }

  // Kilit süresini (dakika) döner — çağıran, kullanıcı mesajında kullanır.
  // lockedUntil DB tarafında (now() + interval) yazılır; assertNotLocked'daki
  // now()::timestamp karşılaştırmasıyla aynı saat referansını paylaşır (JS Date
  // parametresi naif-UTC yazıldığından oturum-yerel now() ile karşılaştırılamaz).
  async lockPhone(phone: string, reason = 'wrong_attempts'): Promise<number> {
    await this.lockRepository.query(
      `INSERT INTO otp_locks (phone, "lockedUntil", reason)
       VALUES ($1, now()::timestamp + make_interval(mins => $2::int), $3)
       ON CONFLICT (phone)
       DO UPDATE SET "lockedUntil" = EXCLUDED."lockedUntil", reason = EXCLUDED.reason`,
      [phone, LOCK_DURATION_MIN, reason],
    );
    this.logger.warn(
      `Telefon OTP kilidine alındı (${reason}): ${phone}, ${LOCK_DURATION_MIN} dk`,
    );
    return LOCK_DURATION_MIN;
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanup(): Promise<void> {
    // Log: 24 saatlik kayan pencere + pay → 48 saatten eskiler silinir.
    // Bu iki tablonun zaman kolonları DB tarafında yazıldığı için karşılaştırma
    // da DB tarafında yapılır (oturum saat diliminden bağımsız doğruluk).
    await this.sendLogRepository
      .createQueryBuilder()
      .delete()
      .where(`"createdAt" < now()::timestamp - interval '48 hours'`)
      .execute();
    // Süresi geçmiş kilitler
    await this.lockRepository
      .createQueryBuilder()
      .delete()
      .where(`"lockedUntil" < now()::timestamp`)
      .execute();
    // Bayat OTP kayıtları (süresi 24 saatten önce dolmuş) — expiresAt JS tarafında
    // yazılıp JS tarafında okunduğu için karşılaştırma da JS Date parametresiyle
    await this.otpRepository.delete({
      expiresAt: LessThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
    });
  }
}
