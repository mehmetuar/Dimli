import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import { getOwnerId } from '../../../../services/authStorage';

const EMPTY_NEW_PITCH = {
    name: '',
    type: 'INDOOR',
    pricePerHour: '',
    openTime: '08:00',
    closeTime: '23:00',
    facilities: [] as string[],
    timeSlots: [] as Array<{ startTime: string; endTime: string }>,
};

export const useBusinessPitchList = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [pitches, setPitches] = useState<any[]>([]);
    const [subscription, setSubscription] = useState<any>(null);
    const [businessStatus, setBusinessStatus] = useState<string | null>(null);
    const [businessId, setBusinessId] = useState<string | null>(null);

    // ── Yeni saha ekleme modalı ──
    const [showAddPitchModal, setShowAddPitchModal] = useState(false);
    const [newPitchData, setNewPitchData] = useState<any>(EMPTY_NEW_PITCH);
    const [isTimePickerOpen, setIsTimePickerOpen] = useState<{ open: boolean; type: 'OPEN' | 'CLOSE' | 'SLOT_START' | 'SLOT_END' }>({ open: false, type: 'OPEN' });
    const [tempSlot, setTempSlot] = useState<{ startTime: string; endTime: string }>({ startTime: '', endTime: '' });
    const [adding, setAdding] = useState(false);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        fetchPitches();
    }, []);

    const fetchPitches = async () => {
        try {
            const ownerId = getOwnerId();
            if (!ownerId) { navigate('/business/login'); return; }

            const ownerResponse = await api.get(`/business-owner/${ownerId}`);
            const busId = ownerResponse.data.business?.id;
            const busStatus = ownerResponse.data.business?.status ?? null;
            setBusinessStatus(busStatus);
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
    const hasActiveSub = subscription && ['active', 'trial'].includes(subscription.status);
    const canAddPitch = !!hasActiveSub && usedPitchCount < (subscription?.pitchCount ?? 0);

    // ── AddPitchModal yardımcıları ──
    const toggleFacility = (facility: string) => {
        setNewPitchData((prev: any) => ({
            ...prev,
            facilities: prev.facilities.includes(facility)
                ? prev.facilities.filter((f: string) => f !== facility)
                : [...prev.facilities, facility],
        }));
    };

    const addTimeSlot = (start: string, end: string) => {
        if (!start || !end) return;
        setNewPitchData((prev: any) => ({
            ...prev,
            timeSlots: [...prev.timeSlots, { startTime: start, endTime: end }],
        }));
        setTempSlot({ startTime: '', endTime: '' });
    };

    const removeTimeSlot = (index: number) => {
        setNewPitchData((prev: any) => ({
            ...prev,
            timeSlots: prev.timeSlots.filter((_: any, i: number) => i !== index),
        }));
    };

    const openAddPitchModal = () => {
        setNewPitchData(EMPTY_NEW_PITCH);
        setTempSlot({ startTime: '', endTime: '' });
        setShowAddPitchModal(true);
    };

    const closeAddPitchModal = () => {
        setShowAddPitchModal(false);
    };

    const submitNewPitch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!businessId) return;

        setAdding(true);
        try {
            await api.post('/pitches', {
                businessId,
                name: newPitchData.name,
                type: newPitchData.type,
                pricePerHour: Number(newPitchData.pricePerHour) || 0,
                openTime: newPitchData.openTime,
                closeTime: newPitchData.closeTime,
                facilities: newPitchData.facilities,
                timeSlots: newPitchData.timeSlots,
            });

            setShowAddPitchModal(false);
            showToast('Saha onaya gönderildi. Onaylandığında yayına alınacaktır.', 'success');
            await fetchPitches();
        } catch (err: any) {
            if (err?.response?.status === 409) {
                showToast('Abonelik limitinize ulaştınız.', 'error');
            } else {
                showToast(err?.response?.data?.message || 'Saha eklenirken bir hata oluştu.', 'error');
            }
        } finally {
            setAdding(false);
        }
    };

    return {
        navigate,
        loading,
        pitches,
        subscription,
        businessStatus,
        canAddPitch,
        toast,

        // AddPitchModal
        showAddPitchModal,
        newPitchData,
        setNewPitchData,
        isTimePickerOpen,
        setIsTimePickerOpen,
        tempSlot,
        setTempSlot,
        adding,
        openAddPitchModal,
        closeAddPitchModal,
        submitNewPitch,
        toggleFacility,
        addTimeSlot,
        removeTimeSlot,
    };
};
