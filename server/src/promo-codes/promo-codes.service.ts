import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { PromoCode } from './entities/promo-code.entity';
import { PromoCodeRedemption } from './entities/promo-code-redemption.entity';
import { CreatePromoCodesDto } from './dto/create-promo-codes.dto';
import { SubscriptionService } from '../subscription/subscription.service';
import {
  Subscription,
  SubscriptionStatus,
} from '../subscription/entities/subscription.entity';
import { BusinessOwner } from '../business-owner/entities/business-owner.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Paginated, paginate } from '../common/dto/paginated';

// Karışabilir karakterler (0/O/1/I) hariç — telefonla okuma/yazma için.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_PREFIX = 'DIMLI-';
const CODE_BODY_LEN = 8;
const GENERIC_INVALID = 'Davet kodu geçersiz veya kullanım limiti dolmuş.';

interface RedemptionRow {
  id: string;
  promoCodeId: string;
  ownerId: string;
  context: string;
  redeemedAt: Date;
  ownerName: string | null;
  email: string | null;
  businessName: string | null;
}

@Injectable()
export class PromoCodesService {
  private readonly logger = new Logger(PromoCodesService.name);

  constructor(
    @InjectRepository(PromoCode)
    private readonly promoRepository: Repository<PromoCode>,
    @InjectRepository(PromoCodeRedemption)
    private readonly redemptionRepository: Repository<PromoCodeRedemption>,
    private readonly subscriptionService: SubscriptionService,
    private readonly dataSource: DataSource,
  ) {}

  private normalize(code: string): string {
    return code.trim().toUpperCase();
  }

  private randomBody(): string {
    let out = '';
    for (let i = 0; i < CODE_BODY_LEN; i++) {
      out += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
    }
    return out;
  }

  private addMonths(from: Date, months: number): Date {
    const d = new Date(from);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  // ─── Public doğrulama (auth'suz, rate-limitli) ────────────────────────────
  // Geçersizlik sebebi ayrıştırılmaz, kalan kullanım sızdırılmaz (enumeration
  // koruması) — yalnız valid + durationMonths döner.
  async validate(
    codeRaw: string,
  ): Promise<
    | { valid: true; durationMonths: number | null }
    | { valid: false; message: string }
  > {
    const code = this.normalize(codeRaw);
    const promo = await this.promoRepository.findOne({ where: { code } });
    if (!promo || !this.isRedeemable(promo)) {
      return { valid: false, message: GENERIC_INVALID };
    }
    return { valid: true, durationMonths: promo.durationMonths };
  }

  private isRedeemable(promo: PromoCode): boolean {
    if (!promo.isActive) return false;
    if (promo.expiresAt && promo.expiresAt <= new Date()) return false;
    if (promo.usedCount >= promo.maxRedemptions) return false;
    return true;
  }

  /**
   * Kodu atomik tüketir (usedCount++). Yarış durumunda Postgres satır kilidi
   * iki tx'i serileştirir; kaybeden 0 satır günceller → ConflictException.
   * Tüketilen kodun tam kaydını döner (durationMonths + id için).
   */
  private async consume(
    manager: EntityManager,
    code: string,
  ): Promise<PromoCode> {
    const res = await manager
      .createQueryBuilder()
      .update(PromoCode)
      .set({ usedCount: () => '"usedCount" + 1' })
      .where('code = :code AND "isActive" = true', { code })
      .andWhere('("expiresAt" IS NULL OR "expiresAt" > now())')
      .andWhere('"usedCount" < "maxRedemptions"')
      .execute();
    if (res.affected !== 1) {
      throw new ConflictException(GENERIC_INVALID);
    }
    const promo = await manager
      .getRepository(PromoCode)
      .findOne({ where: { code } });
    if (!promo) throw new ConflictException(GENERIC_INVALID);
    return promo;
  }

  /**
   * Yeni kayıt yolunda (auth.service kayıt transaction'ı içinde) çağrılır:
   * kodu tüketir, redemption kaydı açar, complimentary abonelik oluşturur —
   * hepsi verilen manager (aynı transaction) üzerinde atomik.
   */
  async redeemInTransaction(
    manager: EntityManager,
    codeRaw: string,
    ownerId: string,
    planType: string,
    context: 'registration' | 'existing',
  ): Promise<void> {
    const code = this.normalize(codeRaw);
    const promo = await this.consume(manager, code);

    await manager.getRepository(PromoCodeRedemption).save(
      manager.getRepository(PromoCodeRedemption).create({
        promoCodeId: promo.id,
        ownerId,
        context,
      }),
    );

    const until = promo.durationMonths
      ? this.addMonths(new Date(), promo.durationMonths)
      : null;

    await this.subscriptionService.createComplimentarySubscription(
      ownerId,
      planType,
      until,
      promo.id,
      manager,
    );
  }

  /**
   * Mevcut işletme (JwtAuthGuard) davet kodu kullanır. Subscription satırı
   * pessimistic_write ile kilitlenir (çift tık/retry serileştirilir), zaten
   * davetli ise reddedilir, kod tüketilir ve abonelik complimentary yapılır.
   * planType/pitchCount ve pending düşürme alanları DEĞİŞMEZ.
   */
  async redeemForExistingOwner(
    ownerId: string,
    codeRaw: string,
  ): Promise<Subscription> {
    const code = this.normalize(codeRaw);

    return this.dataSource.transaction(async (manager) => {
      const subscription = await manager
        .getRepository(Subscription)
        .createQueryBuilder('s')
        .setLock('pessimistic_write')
        .where('s.ownerId = :ownerId', { ownerId })
        .getOne();

      if (!subscription) {
        throw new BadRequestException(
          'Aboneliğiniz bulunamadı. Lütfen destek ile iletişime geçin.',
        );
      }
      if (subscription.status === SubscriptionStatus.COMPLIMENTARY) {
        throw new BadRequestException('Zaten aktif bir davet kodunuz var.');
      }

      const promo = await this.consume(manager, code);

      await manager.getRepository(PromoCodeRedemption).save(
        manager.getRepository(PromoCodeRedemption).create({
          promoCodeId: promo.id,
          ownerId,
          context: 'existing',
        }),
      );

      const until = promo.durationMonths
        ? this.addMonths(new Date(), promo.durationMonths)
        : null;

      subscription.status = SubscriptionStatus.COMPLIMENTARY;
      subscription.pricePerMonth = 0;
      subscription.complimentaryUntil = until;
      subscription.complimentaryReminderSentAt = null;
      subscription.promoCodeId = promo.id;

      return manager.getRepository(Subscription).save(subscription);
    });
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async createCodes(
    dto: CreatePromoCodesDto,
    adminId: string,
  ): Promise<PromoCode[]> {
    const created: PromoCode[] = [];
    for (let i = 0; i < dto.count; i++) {
      const promo = await this.generateUniqueCode(dto, adminId);
      created.push(promo);
    }
    return created;
  }

  private async generateUniqueCode(
    dto: CreatePromoCodesDto,
    adminId: string,
  ): Promise<PromoCode> {
    // Unique çakışmasında (nadir — ~40 bit entropi) 5 deneme.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = CODE_PREFIX + this.randomBody();
      const exists = await this.promoRepository.findOne({ where: { code } });
      if (exists) continue;
      try {
        return await this.promoRepository.save(
          this.promoRepository.create({
            code,
            note: dto.note ?? null,
            durationMonths: dto.durationMonths ?? null,
            maxRedemptions: dto.maxRedemptions,
            usedCount: 0,
            isActive: true,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            createdByAdminId: adminId,
          }),
        );
      } catch {
        // Eşzamanlı üretimde unique çakışması → tekrar dene.
        this.logger.warn(`Kod üretimi çakıştı, tekrar deneniyor: ${code}`);
      }
    }
    throw new ConflictException(
      'Benzersiz kod üretilemedi, lütfen tekrar deneyin.',
    );
  }

  async list(
    query: PaginationQueryDto & { status?: string },
  ): Promise<Paginated<Record<string, unknown>>> {
    const { page, limit, search, status } = query;
    const skip = (page - 1) * limit;

    const qb = this.promoRepository.createQueryBuilder('p');
    if (search?.trim()) {
      qb.andWhere('(p.code ILIKE :s OR p.note ILIKE :s)', {
        s: `%${search.trim()}%`,
      });
    }
    if (status === 'active') {
      qb.andWhere('p.isActive = true AND p.usedCount < p.maxRedemptions');
    } else if (status === 'inactive') {
      qb.andWhere('p.isActive = false');
    } else if (status === 'used') {
      qb.andWhere('p.usedCount >= p.maxRedemptions');
    }

    const total = await qb.getCount();
    const codes = await qb
      .orderBy('p.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    // Sayfadaki kodların kullanımlarını tek sorguda çek (owner + business).
    const codeIds = codes.map((c) => c.id);
    const redemptions: RedemptionRow[] = codeIds.length
      ? await this.redemptionRepository
          .createQueryBuilder('r')
          .leftJoin(BusinessOwner, 'o', 'o.id = r.ownerId')
          .leftJoin('o.business', 'b')
          .select([
            'r.id AS id',
            'r.promoCodeId AS "promoCodeId"',
            'r.ownerId AS "ownerId"',
            'r.context AS context',
            'r.redeemed_at AS "redeemedAt"',
            'o.fullName AS "ownerName"',
            'o.email AS email',
            'b.name AS "businessName"',
          ])
          .where('r.promoCodeId IN (:...codeIds)', { codeIds })
          .orderBy('r.redeemed_at', 'DESC')
          .getRawMany<RedemptionRow>()
      : [];

    const byCode = new Map<string, RedemptionRow[]>();
    for (const r of redemptions) {
      const arr = byCode.get(r.promoCodeId) ?? [];
      arr.push(r);
      byCode.set(r.promoCodeId, arr);
    }

    const items = codes.map((c) => ({
      ...c,
      redemptions: byCode.get(c.id) ?? [],
    }));

    return paginate(items, total, page, limit);
  }

  async setActive(id: string, isActive: boolean): Promise<PromoCode> {
    const promo = await this.promoRepository.findOne({ where: { id } });
    if (!promo) throw new BadRequestException('Kod bulunamadı.');
    promo.isActive = isActive;
    return this.promoRepository.save(promo);
  }
}
