import { useState, useEffect } from 'react';
import api from '../../../../services/api';
import { SuccessType } from '../../../../components/Modals/SuccessModal';

export const useBusinessDashboard = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [subscription, setSubscription] = useState<any>(null);
    const [businessStatus, setBusinessStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSlot, setSelectedSlot] = useState<any>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [note, setNote] = useState('');
    const [actionType, setActionType] = useState<'APPROVE' | 'SEND_NOTE' | null>(null);
    const [targetReservationId, setTargetReservationId] = useState<string | null>(null);

    // UX States
    const [successModal, setSuccessModal] = useState<{ isOpen: boolean; message: string; type: SuccessType }>({
        isOpen: false,
        message: '',
        type: 'DEFAULT'
    });

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDangerous?: boolean;
        confirmText?: string;
        cancelText?: string;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const [cancelReservationId, setCancelReservationId] = useState<string | null>(null);

    useEffect(() => {
        fetchDashboard();
    }, [selectedDate]);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const ownerId = localStorage.getItem('ownerId');
            if (!ownerId) return;

            const [dashboardRes, subRes] = await Promise.all([
                api.get(`/business-owner/dashboard?date=${selectedDate}&ownerId=${ownerId}`),
                api.get(`/subscription/owner/${ownerId}`).catch(() => ({ data: null }))
            ]);
            setDashboardData(dashboardRes.data);
            setBusinessStatus(dashboardRes.data?.businessStatus ?? null);
            setSubscription(subRes.data);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const isPastSlot = (time: string, date: string): boolean => {
        const now = new Date();
        const startTimeStr = time.includes(' - ') ? time.split(' - ')[0] : time;
        const [hour, minute] = startTimeStr.split(':').map(Number);
        const slotDate = new Date(date);
        slotDate.setHours(hour, minute || 0, 0, 0);
        return slotDate < now;
    };

    const openActionModal = (type: 'APPROVE' | 'SEND_NOTE', reservationId: string) => {
        setActionType(type);
        setTargetReservationId(reservationId);
        setNote('');
    };

    const handleCancelClick = (reservationId: string) => {
        setCancelReservationId(reservationId);
    };

    const handleConfirmCancel = async () => {
        if (!cancelReservationId) return;
        try {
            await api.post(`/reservations/${cancelReservationId}/revoke`);
            setSuccessModal({
                isOpen: true,
                message: 'Maç onayı geri alındı ve takımlara bildirildi.',
                type: 'DEFAULT'
            });
            setSelectedSlot(null);
            fetchDashboard();
        } catch (error) {
            console.error('Cancel error:', error);
            alert('İşlem başarısız.');
        } finally {
            setCancelReservationId(null);
        }
    };

    const handleAcceptCancelRequest = async (reservationId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'İptal İsteğini Onayla',
            message: 'İptal isteğini onaylamak istediğinize emin misiniz? Maç iptal edilecektir.',
            isDangerous: true,
            confirmText: 'İptali Onayla',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await api.post(`/reservations/${reservationId}/accept-cancel-request`);
                    setSuccessModal({
                        isOpen: true,
                        message: 'İptal talebi onaylandı. Maç iptal edildi.',
                        type: 'MATCH_CANCELLED'
                    });
                    setSelectedSlot(null);
                    fetchDashboard();
                } catch (error: any) {
                    console.error('Accept cancel error:', error);
                    alert(error.response?.data?.message || 'İşlem başarısız.');
                }
            }
        });
    };

    const handleRejectCancelRequest = async (reservationId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'İptal İsteğini Reddet',
            message: 'İptal isteğini reddetmek istediğinize emin misiniz?',
            isDangerous: false,
            confirmText: 'Reddet',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await api.post(`/reservations/${reservationId}/reject-cancel-request`);
                    setSuccessModal({
                        isOpen: true,
                        message: 'İptal talebi reddedildi.',
                        type: 'DEFAULT'
                    });
                    setSelectedSlot(null);
                    fetchDashboard();
                } catch (error: any) {
                    console.error('Reject cancel error:', error);
                    alert(error.response?.data?.message || 'İşlem başarısız.');
                }
            }
        });
    };

    const handleManualFillSlot = async (pitchId: string, slotTime: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Saati Doluya Çevir',
            message: 'Bu saati doluya çevirmek istediğinize emin misiniz? Bekleyen tüm onay talepleri reddedilecek ve rakip arayan ilanlar kaldırılacaktır.',
            isDangerous: true,
            confirmText: 'Saati Kapat',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await api.post(`/reservations/manual-fill`, { pitchId, slotTime });
                    setSuccessModal({
                        isOpen: true,
                        message: 'Saat başarıyla işletme tarafından kapatıldı.',
                        type: 'DEFAULT'
                    });
                    setSelectedSlot(null);
                    fetchDashboard();
                } catch (error: any) {
                    console.error('Manual fill error:', error);
                    alert(error.response?.data?.message || 'İşlem başarısız.');
                }
            }
        });
    };

    const handleTransaction = async () => {
        if (!targetReservationId || !actionType) return;

        try {
            if (actionType === 'APPROVE') {
                await api.post(`/reservations/${targetReservationId}/approve`, { note });
                setSuccessModal({
                    isOpen: true,
                    message: 'Maç başarıyla onaylandı ve takımlara bildirildi.',
                    type: 'MATCH_APPROVED'
                });
                setSelectedSlot(null);
                fetchDashboard();
            } else if (actionType === 'SEND_NOTE') {
                await api.post(`/reservations/${targetReservationId}/business-note`, { note });
                setSuccessModal({
                    isOpen: true,
                    message: 'Mesajınız takımlara iletildi.',
                    type: 'MESSAGE_SENT'
                });
            }

            setTargetReservationId(null);
            setActionType(null);
            setNote('');
        } catch (error: any) {
            console.error('Transaction error:', error);
            const msg = error.response?.data?.message || 'İşlem başarısız oldu.';
            alert(`HATA: ${msg}`);
        }
    };

    return {
        selectedDate,
        setSelectedDate,
        dashboardData,
        subscription,
        businessStatus,
        loading,
        selectedSlot,
        setSelectedSlot,
        showDatePicker,
        setShowDatePicker,
        note,
        setNote,
        actionType,
        setActionType,
        targetReservationId,
        setTargetReservationId,
        successModal,
        setSuccessModal,
        confirmModal,
        setConfirmModal,
        cancelReservationId,
        setCancelReservationId,
        isPastSlot,
        openActionModal,
        handleCancelClick,
        handleConfirmCancel,
        handleAcceptCancelRequest,
        handleRejectCancelRequest,
        handleTransaction,
        handleManualFillSlot
    };
};
