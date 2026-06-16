import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { getFacilities } from '../../../../services/api';
import { getOwnerId } from '../../../../services/authStorage';
import {
    toMinutes as toMin,
    crossesMidnight,
    normalizeMin,
    slotsOverlap,
    sortSlotsByNightRule as sortTimeSlotsForDisplay,
} from '../../../../utils/nightSlot';

interface TimePickerState {
    open: boolean;
    type: 'OPEN' | 'CLOSE' | 'SLOT_START' | 'SLOT_END';
}

export interface PendingChangeRequest {
    id: string;
    type: 'CUSTOM_FACILITY' | 'PHOTO_UPDATE';
    status: 'pending';
    requestedData: any;
    createdAt: string;
}

export const useBusinessPitchSettings = () => {
    const { pitchId } = useParams();
    const navigate = useNavigate();
    const [defaultFacilities, setDefaultFacilities] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [businessStatus, setBusinessStatus] = useState<string | null>(null);

    const [timeSlots, setTimeSlots] = useState<{ startTime: string; endTime: string }[]>([]);
    const [newSlotStart, setNewSlotStart] = useState('19:00');
    const [newSlotEnd, setNewSlotEnd] = useState('20:00');
    const [savingSlots, setSavingSlots] = useState(false);
    const [slotsSuccess, setSlotsSuccess] = useState(false);

    // Saat çakışma modalı
    const [slotConflictModal, setSlotConflictModal] = useState<{
        show: boolean;
        message: string;
    }>({ show: false, message: '' });

    const [isTimePickerOpen, setIsTimePickerOpen] = useState<TimePickerState>({ open: false, type: 'OPEN' });

    const [formData, setFormData] = useState({
        name: '',
        pricePerHour: '',
        openTime: '',
        closeTime: '',
        facilities: [] as string[],
        isActive: true,
        closedDays: [] as string[],
        imageUrl: '',
    });

    // Bekleyen değişiklik istekleri
    const [pendingChangeRequests, setPendingChangeRequests] = useState<PendingChangeRequest[]>([]);

    // Değişiklik isteği gönderildi modalı
    const [changeRequestSentModal, setChangeRequestSentModal] = useState(false);

    // Facility modal
    const [showFacilityModal, setShowFacilityModal] = useState(false);
    const [newFacility, setNewFacility] = useState('');
    const [submittingFacility, setSubmittingFacility] = useState(false);

    // Photo update
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [submittingPhoto, setSubmittingPhoto] = useState(false);

    // Conflict modal for when trying to deactivate a pitch with future matches
    const [conflictModal, setConflictModal] = useState<{ show: boolean; conflicts: any[] }>({
        show: false,
        conflicts: [],
    });

    const [togglingStatus, setTogglingStatus] = useState(false);
    const [savingClosedDays, setSavingClosedDays] = useState(false);
    const [closedDaysSuccess, setClosedDaysSuccess] = useState(false);

    // Onay durumu (yeni saha / yeniden gönderim akışı)
    const [approvalStatus, setApprovalStatus] = useState<'approved' | 'pending' | 'rejected'>('approved');
    const [rejectionReason, setRejectionReason] = useState<string | null>(null);

    useEffect(() => {
        getFacilities().then(setDefaultFacilities).catch(console.error);
    }, []);

    useEffect(() => {
        fetchPitchData();
    }, [pitchId]);

    const fetchPitchData = async () => {
        try {
            const ownerId = getOwnerId();
            let busId: string | null = null;
            if (ownerId) {
                const ownerResp = await api.get(`/business-owner/${ownerId}`);
                busId = ownerResp.data.business?.id || null;
                setBusinessId(busId);
                setBusinessStatus(ownerResp.data.business?.status ?? null);
            }

            const response = await api.get(`/pitches/${pitchId}`);
            const pitch = response.data;
            setFormData({
                name: pitch.name || '',
                pricePerHour: pitch.pricePerHour?.toString() || '',
                openTime: pitch.openTime || '',
                closeTime: pitch.closeTime || '',
                facilities: pitch.facilities || [],
                isActive: pitch.isActive !== false,
                closedDays: pitch.closedDays || [],
                imageUrl: pitch.imageUrl || '',
            });
            if (pitch.timeSlots && pitch.timeSlots.length > 0) {
                setTimeSlots(pitch.timeSlots.map((ts: any) => ({ startTime: ts.startTime, endTime: ts.endTime })));
            }
            if (pitch.pendingChangeRequests) {
                setPendingChangeRequests(pitch.pendingChangeRequests);
            }
            setApprovalStatus(pitch.approvalStatus || 'approved');
            setRejectionReason(pitch.rejectionReason || null);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching pitch data:', error);
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSuccess(false);
        try {
            if (approvalStatus === 'rejected') {
                const response = await api.patch(`/pitches/${pitchId}/resubmit`, { ...formData, pricePerHour: parseFloat(formData.pricePerHour), timeSlots });
                setApprovalStatus(response.data.approvalStatus || 'pending');
                setRejectionReason(response.data.rejectionReason || null);
            } else {
                await api.patch(`/pitches/${pitchId}`, { ...formData, pricePerHour: parseFloat(formData.pricePerHour) });
            }
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('Error updating pitch:', error);
            alert('Güncelleme başarısız oldu.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePitch = async () => {
        setDeleting(true);
        try {
            await api.delete(`/pitches/${pitchId}`);
            navigate('/business/settings/pitches');
        } catch (error) {
            console.error('Error deleting pitch:', error);
            alert('Saha silinirken bir hata oluştu.');
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const handleFacilityToggle = (facility: string) => {
        setFormData(prev => {
            const exists = prev.facilities.includes(facility);
            return exists
                ? { ...prev, facilities: prev.facilities.filter(f => f !== facility) }
                : { ...prev, facilities: [...prev.facilities, facility] };
        });
    };

    // Manuel imkan → admin onay isteği gönder
    const handleSubmitFacilityRequest = async () => {
        const trimmed = newFacility.trim();
        if (!trimmed || !businessId) return;

        // Zaten mevcut mu kontrol et
        if (formData.facilities.includes(trimmed)) {
            alert('Bu imkan zaten eklenmiş.');
            return;
        }

        setSubmittingFacility(true);
        try {
            await api.post(`/pitches/${pitchId}/change-requests`, {
                businessId,
                type: 'CUSTOM_FACILITY',
                requestedData: { facility: trimmed },
            });
            setNewFacility('');
            setShowFacilityModal(false);
            setChangeRequestSentModal(true);
            // Bekleyen istekleri güncelle
            const updated = await api.get(`/pitches/${pitchId}/change-requests/pending`);
            setPendingChangeRequests(updated.data);
        } catch (error) {
            console.error('Error submitting facility request:', error);
            alert('İstek gönderilirken hata oluştu.');
        } finally {
            setSubmittingFacility(false);
        }
    };

    // Fotoğraf değişikliği → admin onay isteği gönder
    const handleSubmitPhotoRequest = async (imageUrl: string) => {
        if (!businessId) return;
        setSubmittingPhoto(true);
        try {
            await api.post(`/pitches/${pitchId}/change-requests`, {
                businessId,
                type: 'PHOTO_UPDATE',
                requestedData: { imageUrl },
            });
            setShowPhotoModal(false);
            setChangeRequestSentModal(true);
            const updated = await api.get(`/pitches/${pitchId}/change-requests/pending`);
            setPendingChangeRequests(updated.data);
        } catch (error) {
            console.error('Error submitting photo request:', error);
            alert('Fotoğraf isteği gönderilirken hata oluştu.');
        } finally {
            setSubmittingPhoto(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddSlot = () => {
        const newSlot = { startTime: newSlotStart, endTime: newSlotEnd };

        if (!newSlotStart || !newSlotEnd || newSlotStart === newSlotEnd) {
            setSlotConflictModal({ show: true, message: 'Başlangıç ve bitiş saati farklı olmalı.' });
            return;
        }
        const startMin = toMin(newSlotStart);
        let endMin = toMin(newSlotEnd);
        if (endMin === 0) endMin = 1440;
        if (endMin < startMin) endMin += 1440; // gece yarısını geçen slot geçerli
        if (endMin <= startMin) {
            setSlotConflictModal({ show: true, message: 'Bitiş saati başlangıçtan sonra olmalı.' });
            return;
        }

        const open = formData.openTime;
        const close = formData.closeTime;
        if (open && close) {
            const crosses = crossesMidnight(open, close);
            const openMin = toMin(open);
            const rawClose = toMin(close);
            const closeMin = crosses ? (rawClose === 0 ? 1440 : rawClose + 1440) : rawClose;
            const sS = normalizeMin(newSlotStart, openMin, crosses);
            let sE = normalizeMin(newSlotEnd, openMin, crosses);
            if (sE <= sS) sE += 1440;
            if (sS < openMin || sE > closeMin) {
                setSlotConflictModal({ show: true, message: `Slot ${open}–${close} saatleri arasında olmalı.` });
                return;
            }
        }

        const overlapping = timeSlots.find(s => slotsOverlap(s, newSlot));
        if (overlapping) {
            setSlotConflictModal({
                show: true,
                message: `Bu saat aralığı mevcut ${overlapping.startTime}–${overlapping.endTime} slotu ile çakışıyor.`,
            });
            return;
        }

        setTimeSlots(prev => sortTimeSlotsForDisplay([...prev, newSlot]));
    };

    const handleRemoveSlot = (index: number) => {
        setTimeSlots(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveSlots = async () => {
        setSavingSlots(true);
        setSlotsSuccess(false);
        try {
            await api.put(`/pitches/${pitchId}/time-slots`, { slots: timeSlots });
            setSlotsSuccess(true);
            setTimeout(() => setSlotsSuccess(false), 3000);
        } catch (error) {
            console.error('Error saving time slots:', error);
            alert('Saat slotları kaydedilirken hata oluştu.');
        } finally {
            setSavingSlots(false);
        }
    };

    // ─── Active/Passive toggle ────────────────────────────────────────────────

    const toggleActive = async () => {
        if (isReadOnly) return;
        setTogglingStatus(true);
        try {
            const response = await api.patch(`/pitches/${pitchId}/status`);
            setFormData(prev => ({ ...prev, isActive: response.data.isActive !== false }));
        } catch (error: any) {
            if (error?.response?.status === 409) {
                const data = error.response.data;
                setConflictModal({
                    show: true,
                    conflicts: data?.message?.conflicts || data?.conflicts || [],
                });
            } else {
                alert('Saha durumu değiştirilirken bir hata oluştu.');
            }
        } finally {
            setTogglingStatus(false);
        }
    };

    // ─── Closed days ─────────────────────────────────────────────────────────

    const handleClosedDayToggle = async (day: string) => {
        if (isReadOnly) return;
        const current = formData.closedDays;
        const updated = current.includes(day)
            ? current.filter(d => d !== day)
            : [...current, day];

        setFormData(prev => ({ ...prev, closedDays: updated }));
        setSavingClosedDays(true);
        setClosedDaysSuccess(false);
        try {
            await api.patch(`/pitches/${pitchId}/closed-days`, { closedDays: updated });
            setClosedDaysSuccess(true);
            setTimeout(() => setClosedDaysSuccess(false), 2000);
        } catch (error) {
            console.error('Error updating closed days:', error);
            // revert on failure
            setFormData(prev => ({ ...prev, closedDays: current }));
            alert('Kapalı günler kaydedilirken hata oluştu.');
        } finally {
            setSavingClosedDays(false);
        }
    };

    const allFacilities = Array.from(new Set([...defaultFacilities, ...formData.facilities]));

    // Onay bekleyen sahalar veya onay bekleyen işletmeler admin onayı gelene kadar salt okunur
    const isReadOnly = approvalStatus === 'pending' || businessStatus === 'pending';

    const hasPendingFacility = pendingChangeRequests.some(r => r.type === 'CUSTOM_FACILITY');
    const hasPendingPhoto = pendingChangeRequests.some(r => r.type === 'PHOTO_UPDATE');

    return {
        navigate,
        loading,
        saving,
        deleting,
        success,
        showDeleteModal, setShowDeleteModal,
        newFacility, setNewFacility,
        showFacilityModal, setShowFacilityModal,
        submittingFacility,
        showPhotoModal, setShowPhotoModal,
        submittingPhoto,
        timeSlots,
        newSlotStart, setNewSlotStart,
        newSlotEnd, setNewSlotEnd,
        savingSlots,
        slotsSuccess,
        slotConflictModal, setSlotConflictModal,
        isTimePickerOpen, setIsTimePickerOpen,
        formData,
        allFacilities,
        conflictModal, setConflictModal,
        togglingStatus,
        savingClosedDays,
        closedDaysSuccess,
        pendingChangeRequests,
        approvalStatus,
        businessStatus,
        rejectionReason,
        isReadOnly,
        changeRequestSentModal, setChangeRequestSentModal,
        hasPendingFacility,
        hasPendingPhoto,
        handleSubmit,
        handleDeletePitch,
        handleFacilityToggle,
        handleSubmitFacilityRequest,
        handleSubmitPhotoRequest,
        handleChange,
        handleAddSlot,
        handleRemoveSlot,
        handleSaveSlots,
        toggleActive,
        handleClosedDayToggle,
    };
};
