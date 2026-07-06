import { useState, useEffect, useCallback } from 'react';
import api from '../../../../services/api';
import { getOwnerId } from '../../../../services/authStorage';
import { isNetworkError } from '../../../../utils/apiError';
import { useOnReconnect } from '../../../../hooks/useOnReconnect';

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

    const fetchStats = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const ownerId = getOwnerId();
            if (!ownerId) { setError('Oturum bulunamadı.'); return; }
            const response = await api.get(`/business-owner/stats?ownerId=${ownerId}`);
            setStats(response.data);
        } catch (err) {
            console.error('Error fetching stats:', err);
            if (!silent) {
                // Ağ hatası ile genel hata mesajı ayrılır (mevcut hata ekranı + Tekrar Dene korunur).
                setError(isNetworkError(err)
                    ? 'Bağlantı yok. İnternet bağlantınızı kontrol edin.'
                    : 'Veriler yüklenirken bir hata oluştu.');
            }
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    const silentRefetch = useCallback(() => fetchStats(true), [fetchStats]);

    // Ağ geri gelince sessiz tazele (banner yeşil onayıyla eşzamanlı).
    useOnReconnect(silentRefetch);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return { stats, loading, error, refetch: fetchStats, silentRefetch };
};
