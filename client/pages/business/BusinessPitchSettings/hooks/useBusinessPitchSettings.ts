import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../../services/api';
import { DEFAULT_FACILITIES } from '../../../../constants';

// Gece yarısı geçen slotları doğru sıralamak için (ör. 23:30 → 00:30).
// Hem geç gece (>=20:00) hem erken sabah (<06:00) slotları varsa,
// erken sabah slotları "ertesi günün başı" olarak değerlendirilir.
const sortTimeSlotsForDisplay = (slots: { startTime: string; endTime: string }[]) => {
    const hasLateNight = slots.some(s => {
        const [h] = s.startTime.split(':').map(Number);
        return h >= 20;
    });
    const hasEarlyMorning = slots.some(s => {
        const [h] = s.startTime.split(':').map(Number);
        return h < 6;
    });
    const isCrossMidnight = hasLateNight && hasEarlyMorning;

    const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        const mins = h * 60 + m;
        return (isCrossMidnight && h < 12) ? mins + 24 * 60 : mins;
    };

    return [...slots].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
};

interface TimePickerState {
    open: boolean;
    type: 'OPEN' | 'CLOSE' | 'SLOT_START' | 'SLOT_END';
}

export const useBusinessPitchSettings = () => {
    const { pitchId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [newFacility, setNewFacility] = useState('');
    const [showFacilityInput, setShowFacilityInput] = useState(false);

    const [timeSlots, setTimeSlots] = useState<{ startTime: string; endTime: string }[]>([]);
    const [newSlotStart, setNewSlotStart] = useState('19:00');
    const [newSlotEnd, setNewSlotEnd] = useState('20:00');
    const [savingSlots, setSavingSlots] = useState(false);
    const [slotsSuccess, setSlotsSuccess] = useState(false);

    const [isTimePickerOpen, setIsTimePickerOpen] = useState<TimePickerState>({ open: false, type: 'OPEN' });

    const [formData, setFormData] = useState({
        name: '',
        pricePerHour: '',
        openTime: '',
        closeTime: '',
        facilities: [] as string[]
    });

    useEffect(() => {
        fetchPitchData();
    }, [pitchId]);

    const fetchPitchData = async () => {
        try {
            const response = await api.get(`/pitches/${pitchId}`);
            const pitch = response.data;
            setFormData({
                name: pitch.name || '',
                pricePerHour: pitch.pricePerHour?.toString() || '',
                openTime: pitch.openTime || '',
                closeTime: pitch.closeTime || '',
                facilities: pitch.facilities || []
            });
            if (pitch.timeSlots && pitch.timeSlots.length > 0) {
                setTimeSlots(pitch.timeSlots.map((ts: any) => ({ startTime: ts.startTime, endTime: ts.endTime })));
            }
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
            await api.patch(`/pitches/${pitchId}`, { ...formData, pricePerHour: parseFloat(formData.pricePerHour) });
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

    const handleAddFacility = () => {
        if (newFacility.trim()) {
            const formatted = newFacility.trim();
            if (!formData.facilities.includes(formatted)) {
                setFormData(prev => ({ ...prev, facilities: [...prev.facilities, formatted] }));
            }
            setNewFacility('');
            setShowFacilityInput(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddSlot = () => {
        // newSlotStart !== newSlotEnd kontrolü yeterli.
        // Bitiş saati başlangıçtan küçükse gece yarısını geçen slot demektir (ör. 23:30 → 00:30).
        if (newSlotStart && newSlotEnd && newSlotStart !== newSlotEnd) {
            const exists = timeSlots.some(s => s.startTime === newSlotStart && s.endTime === newSlotEnd);
            if (!exists) {
                setTimeSlots(prev => sortTimeSlotsForDisplay([...prev, { startTime: newSlotStart, endTime: newSlotEnd }]));
            }
        }
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

    const allFacilities = Array.from(new Set([...DEFAULT_FACILITIES, ...formData.facilities]));

    return {
        navigate,
        loading,
        saving,
        deleting,
        success,
        showDeleteModal, setShowDeleteModal,
        newFacility, setNewFacility,
        showFacilityInput, setShowFacilityInput,
        timeSlots,
        newSlotStart, setNewSlotStart,
        newSlotEnd, setNewSlotEnd,
        savingSlots,
        slotsSuccess,
        isTimePickerOpen, setIsTimePickerOpen,
        formData,
        allFacilities,
        handleSubmit,
        handleDeletePitch,
        handleFacilityToggle,
        handleAddFacility,
        handleChange,
        handleAddSlot,
        handleRemoveSlot,
        handleSaveSlots
    };
};
