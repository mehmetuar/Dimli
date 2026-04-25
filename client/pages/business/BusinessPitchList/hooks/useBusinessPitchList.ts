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

            setPitches(pitchesResponse.data);
            setSubscription(subscriptionResponse.data);
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
