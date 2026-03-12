import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';

export interface RegisterBusinessData {
    owner: {
        email: string;
        password: string;
        fullName: string;
        phone: string;
    };
    business: {
        name: string;
        city: string;
        district: string;
        address: string;
        latitude: number;
        longitude: number;
        phone: string;
        openTime: string;
        closeTime: string;
    };
    pitches: Array<{
        name: string;
        type: string;
        pricePerHour: number;
        openTime: string;
        closeTime: string;
        facilities: string[];
        timeSlots: Array<{ startTime: string; endTime: string }>;
    }>;
}

export const useBusinessRegister = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);

    // Modal states
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [locationModalStep, setLocationModalStep] = useState<'CITY' | 'DISTRICT'>('CITY');
    const [isTimePickerOpen, setIsTimePickerOpen] = useState<{
        open: boolean;
        type: 'OPEN' | 'CLOSE' | 'PITCH_OPEN' | 'PITCH_CLOSE' | 'SLOT_START' | 'SLOT_END';
        pitchIdx?: number;
    }>({ open: false, type: 'OPEN' });

    const [tempSlot, setTempSlot] = useState({ startTime: '19:00', endTime: '20:00' });

    // Initial State
    const [formData, setFormData] = useState<RegisterBusinessData>({
        owner: { email: '', password: '', fullName: '', phone: '' },
        business: {
            name: '', city: '', district: '', address: '',
            latitude: 41.0082, longitude: 28.9784, // Default: Istanbul
            phone: '', openTime: '09:00', closeTime: '23:00'
        },
        pitches: [
            {
                name: '1 No\'lu Saha', type: 'Kapalı Saha', pricePerHour: 0,
                openTime: '', closeTime: '', facilities: [], timeSlots: []
            }
        ]
    });

    const updateOwner = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, owner: { ...prev.owner, [field]: value } }));
    };

    const updateBusiness = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, business: { ...prev.business, [field]: value } }));
    };

    const updatePitch = (index: number, field: string, value: any) => {
        const newPitches = [...formData.pitches];
        newPitches[index] = { ...newPitches[index], [field]: value };
        setFormData(prev => ({ ...prev, pitches: newPitches }));
    };

    const addPitch = () => {
        setFormData(prev => ({
            ...prev,
            pitches: [
                ...prev.pitches,
                {
                    name: `${prev.pitches.length + 1} No'lu Saha`,
                    type: 'Kapalı Saha',
                    pricePerHour: 0,
                    openTime: '',
                    closeTime: '',
                    facilities: [],
                    timeSlots: []
                }
            ]
        }));
    };

    const removePitch = (index: number) => {
        if (formData.pitches.length > 1) {
            setFormData(prev => ({
                ...prev,
                pitches: prev.pitches.filter((_, i) => i !== index)
            }));
        }
    };

    const toggleFacility = (pitchIndex: number, facility: string) => {
        const currentFacilities = formData.pitches[pitchIndex].facilities;
        let newFacilities;
        if (currentFacilities.includes(facility)) {
            newFacilities = currentFacilities.filter(f => f !== facility);
        } else {
            newFacilities = [...currentFacilities, facility];
        }
        updatePitch(pitchIndex, 'facilities', newFacilities);
    };

    const addTimeSlot = (pitchIndex: number, startTime: string, endTime: string) => {
        const slots = [...(formData.pitches[pitchIndex].timeSlots || [])];
        if (startTime && endTime && startTime < endTime) {
            slots.push({ startTime, endTime });
            slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
            updatePitch(pitchIndex, 'timeSlots', slots);
        }
    };

    const removeTimeSlot = (pitchIndex: number, slotIndex: number) => {
        const slots = [...(formData.pitches[pitchIndex].timeSlots || [])];
        const newSlots = slots.filter((_, i) => i !== slotIndex);
        updatePitch(pitchIndex, 'timeSlots', newSlots);
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');
        try {
            await api.post('/auth/business/register', formData);
            navigate('/business/login', { state: { message: 'Kayıt başarılı! Giriş yapabilirsiniz.' } });
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.response?.data?.message || 'Kayıt sırasında bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    };

    const nextStep = () => {
        if (currentStep < 5) setCurrentStep(c => c + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(c => c - 1);
    };

    return {
        currentStep, setCurrentStep,
        error, setError,
        isLoading, setIsLoading,
        isGeocoding, setIsGeocoding,
        isLocationModalOpen, setIsLocationModalOpen,
        locationModalStep, setLocationModalStep,
        isTimePickerOpen, setIsTimePickerOpen,
        tempSlot, setTempSlot,
        formData, setFormData,
        updateOwner,
        updateBusiness,
        updatePitch,
        addPitch,
        removePitch,
        toggleFacility,
        addTimeSlot,
        removeTimeSlot,
        handleSubmit,
        nextStep,
        prevStep
    };
};
