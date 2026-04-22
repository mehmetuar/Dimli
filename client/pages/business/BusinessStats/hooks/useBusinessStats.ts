import { useState, useEffect, useCallback } from 'react';
import api from '../../../../services/api';

export interface PitchStats {
    pitchId: string;
    pitchName: string;
    pricePerHour: number;
    today: {
        confirmedCount: number;
        earnings: number;
        manualFillCount: number;
    };
    thisMonth: {
        confirmedCount: number;
        earnings: number;
        manualFillCount: number;
    };
}

export interface BusinessStatsData {
    businessName: string;
    rating: number;
    ratingCount: number;
    pitches: PitchStats[];
    totals: {
        today: {
            confirmedCount: number;
            earnings: number;
            manualFillCount: number;
        };
        thisMonth: {
            confirmedCount: number;
            earnings: number;
            manualFillCount: number;
        };
    };
}

export const useBusinessStats = () => {
    const [stats, setStats] = useState<BusinessStatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const ownerId = localStorage.getItem('ownerId');
            if (!ownerId) {
                setError('Oturum bulunamadı.');
                return;
            }
            const response = await api.get(`/business-owner/stats?ownerId=${ownerId}`);
            setStats(response.data);
        } catch (err) {
            console.error('Error fetching stats:', err);
            setError('Veriler yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return { stats, loading, error, refetch: fetchStats };
};
