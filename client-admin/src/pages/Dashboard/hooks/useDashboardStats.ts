import { useEffect, useState } from 'react';
import adminApi from '../../../services/adminApi';

interface Stats {
    counts: { pending: number; active: number; rejected: number; suspended: number };
    revenue: {
        activeSubscriptions: number;
        trialSubscriptions: number;
        totalMRR: number;
        byPlan: Array<{ planType: string; label: string; count: number; monthlyRevenue: number }>;
    };
    monthlyGrowth: Array<{ month: string; newBusinesses: number; approvedBusinesses: number }>;
}

interface DeletionReport {
    total: number;
    thisMonth: number;
    reasonBreakdown: Array<{ key: string; label: string; count: number }>;
    monthlyTrend: Array<{ month: string; count: number }>;
    recent: Array<{ id: string; reason: string; note?: string; userName?: string; userEmail?: string; userUsername?: string; deletedAt: string }>;
}

const formatMonth = (m: string) => {
    const [year, month] = m.split('-');
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    return `${months[parseInt(month) - 1]} ${year.slice(2)}`;
};

export const useDashboardStats = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [deletionReport, setDeletionReport] = useState<DeletionReport | null>(null);
    const [deletionLoading, setDeletionLoading] = useState(true);

    useEffect(() => {
        adminApi.get('/admin/statistics')
            .then(r => setStats(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));

        adminApi.get('/admin/deletion-report')
            .then(r => setDeletionReport(r.data))
            .catch(console.error)
            .finally(() => setDeletionLoading(false));
    }, []);

    const cumulativeData = stats?.monthlyGrowth.reduce((acc, item, idx) => {
        const prev = idx > 0 ? acc[idx - 1].cumulativeApproved : 0;
        acc.push({ ...item, monthLabel: formatMonth(item.month), cumulativeApproved: prev + item.approvedBusinesses });
        return acc;
    }, [] as Array<{ month: string; monthLabel: string; newBusinesses: number; approvedBusinesses: number; cumulativeApproved: number }>) ?? [];

    const barData = cumulativeData.map(d => ({ ...d, name: d.monthLabel }));

    return { stats, loading, deletionReport, deletionLoading, barData };
};
