import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Business } from '../../business/entities/business.entity';
import { Subscription } from '../../subscription/entities/subscription.entity';
import { AdminStatsCacheService } from './admin-stats-cache.service';
import { PLAN_LABELS } from './admin.util';

@Injectable()
export class AdminStatisticsService {
  constructor(
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    private readonly statsCache: AdminStatsCacheService,
  ) {}

  // 60sn cache'li; response şekli eskisiyle birebir aynı.
  getStatistics() {
    return this.statsCache.cached('statistics', () => this.computeStatistics());
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
}
