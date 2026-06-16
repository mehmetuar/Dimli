import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getFacilities } from '../../../../services/api';
import { getOwnerId } from '../../../../services/authStorage';

const EMPTY_FORM_DATA = {
    name: '',
    type: 'INDOOR' as 'INDOOR' | 'OUTDOOR',
    pricePerHour: '',
    openTime: '08:00',
    closeTime: '23:00',
    facilities: [] as string[],
    timeSlots: [] as Array<{ startTime: string; endTime: string }>,
    closedDays: [] as string[],
    imageUrl: '',
};

export const useBusinessAddPitch = () => {
    const navigate = useNavigate();
    const [defaultFacilities, setDefaultFacilities] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const [formData, setFormData] = useState(EMPTY_FORM_DATA);
    const [isTimePickerOpen, setIsTimePickerOpen] = useState<{ open: boolean; type: 'OPEN' | 'CLOSE' | 'SLOT_START' | 'SLOT_END' }>({ open: false, type: 'OPEN' });
    const [newSlotStart, setNewSlotStart] = useState('19:00');
    const [newSlotEnd, setNewSlotEnd] = useState('20:00');

    const [showFacilityModal, setShowFacilityModal] = useState(false);
    const [newFacility, setNewFacility] = useState('');

    const [cropFile, setCropFile] = useState<File | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                const ownerId = getOwnerId();
                if (!ownerId) { navigate('/business/login'); return; }

                const ownerResponse = await api.get(`/business-owner/${ownerId}`);
                const busId = ownerResponse.data.business?.id;
                if (!busId) { navigate('/business/settings/pitches', { replace: true }); return; }

                const [pitchesResponse, subscriptionResponse] = await Promise.all([
                    api.get(`/pitches/business/${busId}`),
                    api.get(`/subscription/owner/${ownerId}`).catch(() => ({ data: null })),
                ]);

                const pitches = pitchesResponse.data ?? [];
                const subscription = subscriptionResponse.data ?? null;
                const usedPitchCount = pitches.filter((p: any) => p.approvalStatus !== 'rejected').length;
                const hasActiveSub = subscription && ['active', 'trial'].includes(subscription.status);
                const canAddPitch = !!hasActiveSub && usedPitchCount < (subscription?.pitchCount ?? 0);

                if (!canAddPitch) { navigate('/business/settings/pitches', { replace: true }); return; }

                setBusinessId(busId);
                setLoading(false);
            } catch (error) {
                console.error('Error initializing add pitch page:', error);
                navigate('/business/settings/pitches', { replace: true });
            }
        };
        init();
    }, [navigate]);

    useEffect(() => {
        getFacilities().then(setDefaultFacilities).catch(console.error);
    }, []);

    const allFacilities = Array.from(new Set([...defaultFacilities, ...formData.facilities]));

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleFacility = (facility: string) => {
        setFormData(prev => ({
            ...prev,
            facilities: prev.facilities.includes(facility)
                ? prev.facilities.filter(f => f !== facility)
                : [...prev.facilities, facility],
        }));
    };

    const toggleClosedDay = (day: string) => {
        setFormData(prev => ({
            ...prev,
            closedDays: prev.closedDays.includes(day)
                ? prev.closedDays.filter(d => d !== day)
                : [...prev.closedDays, day],
        }));
    };

    const handleAddSlot = () => {
        if (!newSlotStart || !newSlotEnd || newSlotStart >= newSlotEnd) return;
        setFormData(prev => ({
            ...prev,
            timeSlots: [...prev.timeSlots, { startTime: newSlotStart, endTime: newSlotEnd }]
                .sort((a, b) => a.startTime.localeCompare(b.startTime)),
        }));
    };

    const handleRemoveSlot = (index: number) => {
        setFormData(prev => ({
            ...prev,
            timeSlots: prev.timeSlots.filter((_, i) => i !== index),
        }));
    };

    const handleAddManualFacility = () => {
        const name = newFacility.trim();
        if (!name) return;
        if (!formData.facilities.includes(name)) {
            setFormData(prev => ({ ...prev, facilities: [...prev.facilities, name] }));
        }
        setNewFacility('');
        setShowFacilityModal(false);
    };

    const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setCropFile(file);
        e.target.value = '';
    };

    const handleCropComplete = async (croppedFile: File) => {
        setCropFile(null);
        setUploadingPhoto(true);
        try {
            const fd = new FormData();
            fd.append('file', croppedFile);
            const res = await api.post('/files/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setFormData(prev => ({ ...prev, imageUrl: res.data.url }));
        } catch (error) {
            console.error('Photo upload error:', error);
            alert('Fotoğraf yüklenirken hata oluştu.');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!businessId) return;

        if (!formData.name.trim() || !formData.pricePerHour || Number(formData.pricePerHour) <= 0
            || !formData.openTime || !formData.closeTime || !formData.imageUrl) {
            setSubmitError('Lütfen tüm zorunlu alanları doldurun (saha fotoğrafı dahil).');
            return;
        }

        setSubmitError('');
        setSubmitting(true);
        try {
            await api.post('/pitches', {
                businessId,
                name: formData.name,
                type: formData.type,
                pricePerHour: Number(formData.pricePerHour) || 0,
                openTime: formData.openTime,
                closeTime: formData.closeTime,
                facilities: formData.facilities,
                timeSlots: formData.timeSlots,
                closedDays: formData.closedDays,
                imageUrl: formData.imageUrl,
            });

            navigate('/business/settings/pitches', {
                state: { toast: { text: 'Saha onaya gönderildi. Onaylandığında yayına alınacaktır.', type: 'success' } },
            });
        } catch (err: any) {
            if (err?.response?.status === 409) {
                setSubmitError('Abonelik limitinize ulaştınız.');
            } else {
                setSubmitError(err?.response?.data?.message || 'Saha eklenirken bir hata oluştu.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return {
        navigate,
        loading,
        formData,
        allFacilities,
        isTimePickerOpen, setIsTimePickerOpen,
        newSlotStart, setNewSlotStart,
        newSlotEnd, setNewSlotEnd,
        showFacilityModal, setShowFacilityModal,
        newFacility, setNewFacility,
        cropFile, setCropFile,
        uploadingPhoto,
        submitting,
        submitError,
        handleChange,
        toggleFacility,
        toggleClosedDay,
        handleAddSlot,
        handleRemoveSlot,
        handleAddManualFacility,
        handlePhotoFileChange,
        handleCropComplete,
        handleSubmit,
    };
};
