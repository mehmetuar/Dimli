import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../../../services/api';
import { getOwnerId } from '../../../../services/authStorage';

export const useBusinessPitchList = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [pitches, setPitches] = useState<any[]>([]);
    const [subscription, setSubscription] = useState<any>(null);
    const [businessStatus, setBusinessStatus] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState<string | null>(null);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        fetchPitches();
    }, []);

    useEffect(() => {
        const incomingToast = (location.state as any)?.toast;
        if (incomingToast) {
            showToast(incomingToast.text, incomingToast.type);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state]);

    const fetchPitches = async () => {
        try {
            const ownerId = getOwnerId();
            if (!ownerId) { navigate('/business/login'); return; }

            const ownerResponse = await api.get(`/business-owner/${ownerId}`);
            const busId = ownerResponse.data.business?.id;
            const busStatus = ownerResponse.data.business?.status ?? null;
            setBusinessStatus(busStatus);
            setRejectionReason(ownerResponse.data.business?.rejectionReason ?? null);
            if (!busId) { alert('İşletme bulunamadı'); return; }
            setBusinessId(busId);

            const [pitchesResponse, subscriptionResponse] = await Promise.all([
                api.get(`/pitches/business/${busId}`),
                api.get(`/subscription/owner/${ownerId}`).catch(() => ({ data: null })),
            ]);

            setPitches(pitchesResponse.data ?? []);
            setSubscription(subscriptionResponse.data ?? null);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching pitches:', error);
            setLoading(false);
        }
    };

    const showToast = (text: string, type: 'success' | 'error') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Abonelik kapsamında "kullanılan" saha sayısı: onaylı + onay bekleyen
    const usedPitchCount = pitches.filter(p => p.approvalStatus !== 'rejected').length;
    const hasActiveSub = subscription && ['active', 'trial', 'complimentary'].includes(subscription.status);
    const canAddPitch = !!hasActiveSub && usedPitchCount < (subscription?.pitchCount ?? 0);

    return {
        navigate,
        loading,
        pitches,
        subscription,
        businessStatus,
        rejectionReason,
        businessId,
        canAddPitch,
        toast,
    };
};
