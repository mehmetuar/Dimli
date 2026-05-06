import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';

export const useBusinessPitchList = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [pitches, setPitches] = useState<any[]>([]);
    const [subscription, setSubscription] = useState<any>(null);

    useEffect(() => {
        fetchPitches();
    }, []);

    const fetchPitches = async () => {
        try {
            const ownerId = localStorage.getItem('ownerId');
            if (!ownerId) { navigate('/business/login'); return; }

            const ownerResponse = await api.get(`/business-owner/${ownerId}`);
            const busId = ownerResponse.data.business?.id;
            if (!busId) { alert('İşletme bulunamadı'); return; }

            const [pitchesResponse, subscriptionResponse] = await Promise.all([
                api.get(`/pitches/business/${busId}`),
                api.get(`/subscription/owner/${ownerId}`).catch(() => ({ data: null })),
            ]);

            const sub = subscriptionResponse.data ?? null;
            const hasActiveSub = sub && ['active', 'trial'].includes(sub.status);

            // Abonelik yoksa veya süresi dolmuşsa saha göstermiyoruz
            // Aktif abonelikte pitchCount kadar saha gösterilir (planın saha limiti)
            const allPitches: any[] = pitchesResponse.data ?? [];
            const visiblePitches = hasActiveSub
                ? allPitches.slice(0, sub.pitchCount)
                : [];

            setPitches(visiblePitches);
            setSubscription(sub);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching pitches:', error);
            setLoading(false);
        }
    };

    return {
        navigate,
        loading,
        pitches,
        subscription,
    };
};
