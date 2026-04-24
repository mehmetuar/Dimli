import { useState } from 'react';
import api from '../../../../services/api';

export const SUBSCRIPTION_PLANS: Record<number, { label: string; price: number; planType: string }> = {
    1: { label: 'Starter', price: 1700, planType: '1_pitch' },
    2: { label: 'Basic', price: 2950, planType: '2_pitch' },
    3: { label: 'Pro', price: 3850, planType: '3_pitch' },
    4: { label: 'Business', price: 4650, planType: '4_pitch' },
    5: { label: 'Enterprise', price: 5250, planType: '5plus_pitch' },
};

export const makePitch = (index: number) => ({
    name: `${index + 1} No'lu Saha`,
    type: 'Kapalı Saha',
    pricePerHour: 0,
    openTime: '',
    closeTime: '',
    facilities: [] as string[],
    timeSlots: [] as Array<{ startTime: string; endTime: string }>,
    photoFile: null as File | null,
    imageUrl: '',
});

export interface RegisterBusinessData {
    owner: { email: string; password: string; fullName: string; phone: string };
    business: {
        name: string; city: string; district: string; address: string;
        latitude: number; longitude: number; phone: string; openTime: string; closeTime: string;
    };
    pitches: ReturnType<typeof makePitch>[];
    selectedPitchCount: number;
    planType: string;
}

const TOTAL_STEPS = 8;

export const useBusinessRegister = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);

    // OTP states
    const [otpSent, setOtpSent] = useState(false);
    const [otpSending, setOtpSending] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpCode, setOtpCode] = useState('');

    // Modal states
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [locationModalStep, setLocationModalStep] = useState<'CITY' | 'DISTRICT'>('CITY');
    const [isTimePickerOpen, setIsTimePickerOpen] = useState<{
        open: boolean;
        type: 'OPEN' | 'CLOSE' | 'PITCH_OPEN' | 'PITCH_CLOSE' | 'SLOT_START' | 'SLOT_END';
        pitchIdx?: number;
    }>({ open: false, type: 'OPEN' });

    const [tempSlot, setTempSlot] = useState({ startTime: '19:00', endTime: '20:00' });

    const [formData, setFormData] = useState<RegisterBusinessData>({
        owner: { email: '', password: '', fullName: '', phone: '' },
        business: {
            name: '', city: '', district: '', address: '',
            latitude: 41.0082, longitude: 28.9784,
            phone: '', openTime: '09:00', closeTime: '23:00',
        },
        pitches: [makePitch(0)],
        selectedPitchCount: 1,
        planType: '1_pitch',
    });

    // ─── Updaters ─────────────────────────────────────────────────────────────

    const updateOwner = (field: string, value: string) =>
        setFormData(prev => ({ ...prev, owner: { ...prev.owner, [field]: value } }));

    const updateBusiness = (field: string, value: any) =>
        setFormData(prev => ({ ...prev, business: { ...prev.business, [field]: value } }));

    const updatePitch = (index: number, field: string, value: any) => {
        setFormData(prev => {
            const newPitches = [...prev.pitches];
            newPitches[index] = { ...newPitches[index], [field]: value };
            return { ...prev, pitches: newPitches };
        });
    };

    const setPitchCount = (count: number) => {
        const plan = SUBSCRIPTION_PLANS[count] || SUBSCRIPTION_PLANS[5];
        setFormData(prev => {
            let pitches = [...prev.pitches];
            if (count > pitches.length) {
                for (let i = pitches.length; i < count; i++) pitches.push(makePitch(i));
            } else {
                pitches = pitches.slice(0, count);
            }
            return { ...prev, pitches, selectedPitchCount: count, planType: plan.planType };
        });
    };

    const toggleFacility = (pitchIndex: number, facility: string) => {
        const current = formData.pitches[pitchIndex].facilities;
        updatePitch(pitchIndex, 'facilities', current.includes(facility)
            ? current.filter(f => f !== facility)
            : [...current, facility]);
    };

    const addTimeSlot = (pitchIndex: number, startTime: string, endTime: string) => {
        if (!startTime || !endTime || startTime >= endTime) return;
        const slots = [...(formData.pitches[pitchIndex].timeSlots || [])];
        slots.push({ startTime, endTime });
        slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
        updatePitch(pitchIndex, 'timeSlots', slots);
    };

    const removeTimeSlot = (pitchIndex: number, slotIndex: number) => {
        const slots = [...(formData.pitches[pitchIndex].timeSlots || [])];
        updatePitch(pitchIndex, 'timeSlots', slots.filter((_, i) => i !== slotIndex));
    };

    // ─── OTP ──────────────────────────────────────────────────────────────────

    const sendOtp = async () => {
        if (!formData.owner.phone) { setError('Telefon numarası gerekli.'); return; }
        setOtpSending(true);
        setError('');
        try {
            await api.post('/auth/business/send-otp', { phone: formData.owner.phone });
            setOtpSent(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'OTP gönderilemedi.');
        } finally {
            setOtpSending(false);
        }
    };

    const verifyOtp = async (code: string) => {
        setIsLoading(true);
        setError('');
        try {
            await api.post('/auth/business/verify-otp', { phone: formData.owner.phone, code });
            setOtpVerified(true);
            setCurrentStep(4); // Business details
        } catch (err: any) {
            setError(err.response?.data?.message || 'Kod hatalı veya süresi dolmuş.');
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Submit ───────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');
        try {
            // 1. Upload pitch photos
            const pitchesWithImages = await Promise.all(
                formData.pitches.map(async (pitch) => {
                    if (pitch.photoFile) {
                        const fd = new FormData();
                        fd.append('file', pitch.photoFile);
                        const res = await api.post('/files/upload', fd, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                        });
                        return { ...pitch, imageUrl: res.data.url };
                    }
                    return pitch;
                })
            );

            // 2. Submit registration
            const payload = {
                owner: formData.owner,
                business: formData.business,
                pitches: pitchesWithImages.map(p => ({
                    name: p.name,
                    type: p.type,
                    pricePerHour: p.pricePerHour,
                    openTime: p.openTime,
                    closeTime: p.closeTime,
                    facilities: p.facilities,
                    timeSlots: p.timeSlots,
                    imageUrl: p.imageUrl,
                })),
                planType: formData.planType,
            };
            await api.post('/auth/business/register', payload);
            setCurrentStep(8); // Congratulations
        } catch (err: any) {
            setError(err.response?.data?.message || 'Kayıt sırasında bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Navigation ───────────────────────────────────────────────────────────

    const nextStep = () => {
        setError('');
        if (currentStep === 2) {
            // After account info, go to OTP verification
            if (!otpSent) { sendOtp().then(() => setCurrentStep(3)); }
            else setCurrentStep(3);
            return;
        }
        if (currentStep < TOTAL_STEPS) setCurrentStep(c => c + 1);
    };

    const prevStep = () => {
        setError('');
        if (currentStep > 1) setCurrentStep(c => c - 1);
    };

    return {
        currentStep, setCurrentStep,
        totalSteps: TOTAL_STEPS,
        error, setError,
        isLoading,
        isGeocoding, setIsGeocoding,
        isLocationModalOpen, setIsLocationModalOpen,
        locationModalStep, setLocationModalStep,
        isTimePickerOpen, setIsTimePickerOpen,
        tempSlot, setTempSlot,
        formData, setFormData,
        otpSent, otpSending, otpVerified,
        otpCode, setOtpCode,
        updateOwner, updateBusiness, updatePitch,
        setPitchCount, toggleFacility, addTimeSlot, removeTimeSlot,
        sendOtp, verifyOtp,
        handleSubmit, nextStep, prevStep,
    };
};
