import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';

interface TimePickerState {
    open: boolean;
    type: 'OPEN' | 'CLOSE' | 'SLOT_START' | 'SLOT_END';
}

export const useBusinessPitchList = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [pitches, setPitches] = useState<any[]>([]);
    const [businessId, setBusinessId] = useState<string | null>(null);

    const [showAddModal, setShowAddModal] = useState(false);
    const [adding, setAdding] = useState(false);
    const [newPitchData, setNewPitchData] = useState({
        name: '',
        type: 'INDOOR',
        pricePerHour: '',
        openTime: '09:00',
        closeTime: '23:00',
        facilities: [] as string[],
        timeSlots: [] as Array<{ startTime: string; endTime: string }>
    });

    const [isTimePickerOpen, setIsTimePickerOpen] = useState<TimePickerState>({ open: false, type: 'OPEN' });
    const [tempSlot, setTempSlot] = useState({ startTime: '09:00', endTime: '10:00' });

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

            setBusinessId(busId);
            const pitchesResponse = await api.get(`/pitches/business/${busId}`);
            setPitches(pitchesResponse.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching pitches:', error);
            setLoading(false);
        }
    };

    const toggleFacility = (facility: string) => {
        setNewPitchData(prev => {
            const exists = prev.facilities.includes(facility);
            return exists
                ? { ...prev, facilities: prev.facilities.filter(f => f !== facility) }
                : { ...prev, facilities: [...prev.facilities, facility] };
        });
    };

    const addTimeSlot = (startTime: string, endTime: string) => {
        if (!startTime || !endTime || startTime >= endTime) return;
        setNewPitchData(prev => ({
            ...prev,
            timeSlots: [...prev.timeSlots, { startTime, endTime }].sort((a, b) => a.startTime.localeCompare(b.startTime))
        }));
    };

    const removeTimeSlot = (index: number) => {
        setNewPitchData(prev => ({
            ...prev,
            timeSlots: prev.timeSlots.filter((_, i) => i !== index)
        }));
    };

    const handleAddPitch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!businessId) return;

        setAdding(true);
        try {
            const payload = {
                name: newPitchData.name,
                type: newPitchData.type,
                pricePerHour: parseFloat(newPitchData.pricePerHour),
                businessId,
                openTime: newPitchData.openTime,
                closeTime: newPitchData.closeTime,
                facilities: newPitchData.facilities,
                timeSlots: newPitchData.timeSlots
            };

            await api.post('/pitches', payload);
            const pitchesResponse = await api.get(`/pitches/business/${businessId}`);
            setPitches(pitchesResponse.data);

            setShowAddModal(false);
            setNewPitchData({ name: '', type: 'INDOOR', pricePerHour: '', openTime: '09:00', closeTime: '23:00', facilities: [], timeSlots: [] });
        } catch (error) {
            console.error('Error adding pitch:', error);
            alert('Saha eklenirken bir hata oluştu.');
        } finally {
            setAdding(false);
        }
    };

    return {
        navigate,
        loading,
        pitches,
        showAddModal, setShowAddModal,
        adding,
        newPitchData, setNewPitchData,
        isTimePickerOpen, setIsTimePickerOpen,
        tempSlot, setTempSlot,
        toggleFacility,
        addTimeSlot,
        removeTimeSlot,
        handleAddPitch
    };
};
