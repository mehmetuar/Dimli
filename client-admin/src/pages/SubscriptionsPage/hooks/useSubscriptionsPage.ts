import { useEffect, useState } from 'react';
import adminApi from '../../../services/adminApi';
import { usePaginatedList } from '../../../hooks/usePaginatedList';

// GET /admin/subscriptions satırı (server AdminSubscriptionListItem ile birebir).
export interface SubscriptionRow {
    subscriptionId: string;
    status: 'trial' | 'active' | 'expired' | 'cancelled' | 'complimentary';
    planType: string;
    planLabel: string;
    pricePerMonth: number;
    trialEndsAt: string | null;
    expiresAt: string | null;
    complimentaryUntil: string | null;
    graceUntil: string | null;
    promoCode: string | null;
    createdAt: string;
    businessId: string | null;
    businessName: string | null;
    businessStatus: string | null;
    ownerName: string | null;
    ownerEmail: string | null;
}

export type SubStatusFilter =
    | 'all'
    | 'active'
    | 'trial'
    | 'complimentary'
    | 'expired'
    | 'cancelled';

// /admin/statistics → revenue dilimi (sınıf sayı kartları).
export interface SubscriptionStats {
    activeSubscriptions: number;
    trialSubscriptions: number;
    complimentarySubscriptions: number;
    expiredSubscriptions: number;
    cancelledSubscriptions: number;
    graceSubscriptions: number;
    noSubscription: number;
    totalMRR: number;
    byPlan: { planType: string; label: string; count: number; monthlyRevenue: number }[];
}

export function useSubscriptionsPage() {
    const [statusFilter, setStatusFilter] = useState<SubStatusFilter>('all');

    const list = usePaginatedList<SubscriptionRow>(
        '/admin/subscriptions',
        statusFilter === 'all' ? {} : { status: statusFilter },
    );

    const [stats, setStats] = useState<SubscriptionStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await adminApi.get('/admin/statistics');
                if (!cancelled) setStats(res.data?.revenue ?? null);
            } catch (e) {
                console.error('Abonelik istatistikleri yüklenemedi', e);
            } finally {
                if (!cancelled) setStatsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    return { ...list, statusFilter, setStatusFilter, stats, statsLoading };
}
