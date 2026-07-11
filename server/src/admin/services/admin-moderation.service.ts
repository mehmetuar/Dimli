import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Notification } from '../../notifications/notification.entity';
import { AccountDeletion } from '../../account-deletions/account-deletion.entity';
import { User } from '../../users/user.entity';
import {
  UserReport,
  ReportStatus,
} from '../../user-reports/user-report.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Paginated, paginate } from '../../common/dto/paginated';
import { AdminStatsCacheService } from './admin-stats-cache.service';
import { applySearch } from './admin.util';
import { sanitizeUser } from '../../common/sanitize-user.util';

@Injectable()
export class AdminModerationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(AccountDeletion)
    private accountDeletionRepository: Repository<AccountDeletion>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserReport)
    private userReportRepository: Repository<UserReport>,
    private readonly statsCache: AdminStatsCacheService,
  ) {}

  // ─── Deletion Report ──────────────────────────────────────────────────────

  // 60sn cache'li; response şekli eskisiyle birebir aynı.
  getDeletionReport() {
    return this.statsCache.cached('deletion-report', () =>
      this.computeDeletionReport(),
    );
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
    applySearch(countQb, p.search, searchCols);
    const total = await countQb.getCount();

    // ITEMS: nested reporter/reportedUser/message FE'de kullanıldığı için her zaman join.
    const itemsQb = this.userReportRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.reporter', 'reporter')
      .leftJoinAndSelect('r.reportedUser', 'reported')
      .leftJoinAndSelect('r.message', 'message');
    if (status) itemsQb.andWhere('r.status = :status', { status });
    applySearch(itemsQb, p.search, searchCols);
    itemsQb.orderBy('r.createdAt', 'DESC').skip(skip).take(p.limit);
    const items = await itemsQb.getMany();

    // Savunma derinliği: reporter/reportedUser TAM User (parola hash'i + PII) idi;
    // admin paneli yalnız username/full_name okur (common/sanitize-user.util).
    for (const r of items) {
      if (r.reporter) r.reporter = sanitizeUser(r.reporter);
      if (r.reportedUser) r.reportedUser = sanitizeUser(r.reportedUser);
    }

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

  async getBannedUsers(
    p: PaginationQueryDto,
  ): Promise<
    Paginated<
      Pick<
        User,
        'id' | 'username' | 'full_name' | 'chatBannedAt' | 'chatBanExpiry'
      >
    >
  > {
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
    applySearch(countQb, p.search, searchCols);
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
    applySearch(itemsQb, p.search, searchCols);
    itemsQb.orderBy('u.chatBannedAt', 'DESC').skip(skip).take(p.limit);
    const items = await itemsQb.getMany();

    return paginate(items, total, p.page, p.limit);
  }
}
