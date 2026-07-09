import { useEffect, useState } from 'react';
import api from '../../../../services/api';
import { purchasePlan, linkRevenueCatUser, purchaseErrorToTurkish } from '../../../../services/revenuecatService';
import { useAuth } from '../../../../contexts/AuthContext';
import { initializePushNotifications } from '../../../../services/pushNotificationService';
import { isValidTurkishPhone, PHONE_INVALID_MESSAGE } from '../../../../utils/phone';
import { getErrorMessage, getRetryAfterSeconds } from '../../../../utils/apiError';

export const SUBSCRIPTION_PLANS: Record<number, { label: string; price: number; planType: string }> = {
    1: { label: 'Starter', price: 1709.99, planType: '1_pitch' },
    2: { label: 'Basic', price: 2999.99, planType: '2_pitch' },
    3: { label: 'Pro', price: 3849.99, planType: '3_pitch' },
    4: { label: 'Business', price: 4649.99, planType: '4_pitch' },
    5: { label: 'Enterprise', price: 5399.99, planType: '5plus_pitch' },
};

export const makePitch = (index: number) => ({
    name: `${index + 1} No'lu Saha`,
    type: 'INDOOR', // kanonik enum ('INDOOR'/'OUTDOOR'); etiketler UI'da gösterilir

    pricePerHour: 0,
    openTime: '',
    closeTime: '',
    facilities: [] as string[],
    timeSlots: [] as Array<{ startTime: string; endTime: string }>,
    closedDays: [] as string[],
    photoFile: null as File | null,
    imageUrl: '',
});

export interface RegisterBusinessData {
    owner: { email: string; password: string; fullName: string; phone: string };
    business: {
        name: string; city: string; district: string; address: string;
        latitude: number; longitude: number; openTime: string; closeTime: string;
        // İşletme kartı görseli — photoFile submit'te yüklenir, sunucuya yalnız URL gider
        coverImageUrl: string; photoFile: File | null;
    };
    pitches: ReturnType<typeof makePitch>[];
    selectedPitchCount: number;
    planType: string;
}

const TOTAL_STEPS = 8;

export const useBusinessRegister = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const { loginAsBusiness } = useAuth();
    const [isGeocoding, setIsGeocoding] = useState(false);

    // OTP states
    const [otpSent, setOtpSent] = useState(false);
    const [otpSending, setOtpSending] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [resendCountdown, setResendCountdown] = useState(0);

    // Tekrar-gönder geri sayımı (müşteri kayıt akışıyla aynı desen)
    useEffect(() => {
        if (resendCountdown <= 0) return;
        const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCountdown]);

    // Şifre doğrulama (backend'e gönderilmez)
    const [ownerPasswordConfirm, setOwnerPasswordConfirm] = useState('');

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
            latitude: 0, longitude: 0,
            openTime: '09:00', closeTime: '23:00',
            coverImageUrl: '', photoFile: null,
        },
        pitches: [makePitch(0)],
        selectedPitchCount: 1,
        planType: '1_pitch',
    });

    // ─── Updaters ─────────────────────────────────────────────────────────────

    const updateOwner = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, owner: { ...prev.owner, [field]: value } }));
        // Kullanıcı alan doldurdukça hata kaldır
        if (value.trim()) {
            setFieldErrors(prev => {
                const next = { ...prev };
                delete next[`owner.${field}`];
                return next;
            });
        }
    };

    const updateBusiness = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, business: { ...prev.business, [field]: value } }));
        // Kullanıcı alan doldurdukça hata kaldır
        if (value && String(value).trim()) {
            setFieldErrors(prev => {
                const next = { ...prev };
                delete next[`business.${field}`];
                return next;
            });
        }
    };

    const updatePitch = (index: number, field: string, value: any) => {
        setFormData(prev => {
            const newPitches = [...prev.pitches];
            newPitches[index] = { ...newPitches[index], [field]: value };
            return { ...prev, pitches: newPitches };
        });
        // Kullanıcı alan doldurdukça hata kaldır
        if (value && String(value).trim()) {
            setFieldErrors(prev => {
                const next = { ...prev };
                delete next[`pitch.${index}.${field}`];
                return next;
            });
        }
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

    const toggleClosedDay = (pitchIndex: number, day: string) => {
        const current = formData.pitches[pitchIndex].closedDays;
        updatePitch(pitchIndex, 'closedDays', current.includes(day)
            ? current.filter(d => d !== day)
            : [...current, day]);
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

    // ─── Validation ──────────────────────────────────────────────────────────

    const validateStep = (step: number): boolean => {
        const errors: Record<string, string> = {};

        if (step === 2) {
            // Yetkili Bilgileri
            if (!formData.owner.fullName.trim()) errors['owner.fullName'] = 'Ad Soyad zorunludur';
            if (!formData.owner.phone.trim()) errors['owner.phone'] = 'Telefon zorunludur';
            else if (!isValidTurkishPhone(formData.owner.phone)) errors['owner.phone'] = PHONE_INVALID_MESSAGE;
            if (!formData.owner.email.trim()) errors['owner.email'] = 'E-Posta zorunludur';
            if (!formData.owner.password.trim()) errors['owner.password'] = 'Şifre zorunludur';
            if (formData.owner.password.trim() && formData.owner.password.trim().length < 6) {
                errors['owner.password'] = 'Şifre en az 6 karakter olmalıdır';
            }
            if (!ownerPasswordConfirm.trim()) errors['owner.passwordConfirm'] = 'Şifre tekrarı zorunludur';
            else if (formData.owner.password !== ownerPasswordConfirm) errors['owner.passwordConfirm'] = 'Şifreler eşleşmiyor';
        }

        if (step === 4) {
            // İşletme Detayları
            if (!formData.business.name.trim()) errors['business.name'] = 'İşletme adı zorunludur';
            if (!formData.business.photoFile && !formData.business.coverImageUrl) {
                errors['business.coverImageUrl'] = 'İşletme fotoğrafı zorunludur';
            }
        }

        if (step === 5) {
            // Konum
            if (!formData.business.city) errors['business.city'] = 'Haritada konum seçmelisiniz';
            if (!formData.business.address.trim()) errors['business.address'] = 'Açık adres zorunludur';
        }

        if (step === 6) {
            // Sahalar
            formData.pitches.forEach((pitch, i) => {
                if (!pitch.name.trim()) errors[`pitch.${i}.name`] = 'Saha adı zorunludur';
                if (!pitch.pricePerHour || pitch.pricePerHour <= 0) errors[`pitch.${i}.pricePerHour`] = 'Saatlik ücret zorunludur';
                if (!pitch.openTime) errors[`pitch.${i}.openTime`] = 'Açılış saati zorunludur';
                if (!pitch.closeTime) errors[`pitch.${i}.closeTime`] = 'Kapanış saati zorunludur';
                if (!pitch.imageUrl) errors[`pitch.${i}.imageUrl`] = 'Saha fotoğrafı zorunludur';
            });
        }

        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) {
            setError('Lütfen tüm zorunlu alanları doldurun.');
            return false;
        }
        return true;
    };

    // ─── OTP ──────────────────────────────────────────────────────────────────

    const sendOtp = async (): Promise<boolean> => {
        if (!formData.owner.phone) { setError('Telefon numarası gerekli.'); return false; }
        if (!isValidTurkishPhone(formData.owner.phone)) {
            setError(PHONE_INVALID_MESSAGE);
            setFieldErrors(prev => ({ ...prev, 'owner.phone': PHONE_INVALID_MESSAGE }));
            return false;
        }
        setOtpSending(true);
        setError('');
        try {
            await api.post('/auth/business/send-otp', { phone: formData.owner.phone });
            setOtpSent(true);
            setResendCountdown(60);
            return true;
        } catch (err: any) {
            setError(getErrorMessage(err, 'Doğrulama kodu gönderilemedi. Lütfen tekrar deneyin.'));
            // 429 → geri sayımı sunucunun söylediği süreden başlat
            const retryAfter = getRetryAfterSeconds(err);
            if (retryAfter) setResendCountdown(retryAfter);
            return false;
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
            setCurrentStep(4);
        } catch (err: any) {
            setError(getErrorMessage(err, 'Kod hatalı veya süresi dolmuş.'));
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Submit ───────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');
        try {
            // ADIM 1: Satın alma — başarısız / iptal olursa hata fırlar, kayıt YAPILMAZ
            const rcAnonymousId = await purchasePlan(formData.planType);

            // ADIM 2: Fotoğraf yükle (sahalar + işletme kartı görseli)
            const [pitchesWithImages, businessCoverUrl] = await Promise.all([
                Promise.all(
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
                ),
                (async () => {
                    if (formData.business.photoFile) {
                        const fd = new FormData();
                        fd.append('file', formData.business.photoFile);
                        const res = await api.post('/files/upload', fd, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                        });
                        return res.data.url as string;
                    }
                    return formData.business.coverImageUrl;
                })(),
            ]);

            // ADIM 3: Satın alma başarılı → kayıt API'sini çağır
            // business açık alanlarla kurulur — photoFile (File) sunucuya sızmamalı.
            const payload = {
                owner: formData.owner,
                business: {
                    name: formData.business.name,
                    city: formData.business.city,
                    district: formData.business.district,
                    address: formData.business.address,
                    latitude: formData.business.latitude,
                    longitude: formData.business.longitude,
                    openTime: formData.business.openTime,
                    closeTime: formData.business.closeTime,
                    coverImageUrl: businessCoverUrl,
                },
                pitches: pitchesWithImages.map(p => ({
                    name: p.name,
                    type: p.type,
                    pricePerHour: p.pricePerHour,
                    openTime: p.openTime,
                    closeTime: p.closeTime,
                    facilities: p.facilities,
                    timeSlots: p.timeSlots,
                    closedDays: p.closedDays,
                    imageUrl: p.imageUrl,
                })),
                planType: formData.planType,
                revenuecatAnonymousId: rcAnonymousId,
            };
            const response = await api.post('/auth/business/register', payload);

            // Otomatik giriş: kayıt yanıtındaki token'ı sakla
            if (response.data?.access_token) {
                await loginAsBusiness(response.data.access_token, response.data.ownerId);
                // Kayıt sonrası push token'ı kaydet (eskiden eksikti).
                initializePushNotifications();
            }

            // ADIM 4: Anonim RC kullanıcısını gerçek ownerId'ye bağla
            const ownerId = response.data?.ownerId || response.data?.owner?.id;
            if (ownerId) {
                await linkRevenueCatUser(ownerId).catch(() => {});
            }

            setCurrentStep(8); // Congratulations
        } catch (err: any) {
            // Backend hatası → sunucudan gelen Türkçe mesaj; satın alma/RevenueCat hatası → Türkçe helper
            // (ham İngilizce SDK mesajı asla gösterilmez). İptalde kayıt-bağlamlı mesaj.
            let msg: string;
            if (err?.response) {
                msg = getErrorMessage(err, 'Bir hata oluştu. Lütfen tekrar deneyin.');
            } else {
                const p = purchaseErrorToTurkish(err);
                msg = p.cancelled
                    ? 'Satın alma iptal edildi. Kaydı tamamlamak için ödeme gereklidir.'
                    : p.message;
            }
            setError(msg);
            // currentStep değişmez — kullanıcı PaymentStep'te kalır
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Navigation ───────────────────────────────────────────────────────────

    const nextStep = async () => {
        setError('');
        setFieldErrors({});

        // Validate current step before proceeding
        if (!validateStep(currentStep)) return;

        if (currentStep === 2) {
            // Erken benzersizlik kontrolü (ödeme ÖNCESİ): alınmış e-posta/telefon ile OTP göndermeden dur.
            setIsLoading(true);
            try {
                const res = await api.get('/auth/business/check-availability', {
                    params: { email: formData.owner.email, phone: formData.owner.phone },
                });
                const taken: Record<string, string> = {};
                if (res.data?.emailAvailable === false) taken['owner.email'] = 'Bu e-posta adresi zaten kayıtlı.';
                if (res.data?.phoneAvailable === false) taken['owner.phone'] = 'Bu telefon numarası zaten kayıtlı.';
                if (Object.keys(taken).length > 0) {
                    setFieldErrors(taken);
                    setError('Bu bilgilerle zaten bir hesap var. Giriş yapabilirsiniz.');
                    return;
                }
                // Benzersiz → OTP akışı (sendOtp telefon kontrolünü backend güvenlik ağı olarak tekrar yapar)
                if (!otpSent) {
                    const success = await sendOtp();
                    if (success) setCurrentStep(3);
                } else {
                    setCurrentStep(3);
                }
            } catch (err) {
                setError(getErrorMessage(err, 'Bir hata oluştu. Lütfen tekrar deneyin.'));
            } finally {
                setIsLoading(false);
            }
            return;
        }
        if (currentStep < TOTAL_STEPS) setCurrentStep(c => c + 1);
    };

    const prevStep = () => {
        setError('');
        setFieldErrors({});
        if (currentStep > 1) setCurrentStep(c => c - 1);
    };

    return {
        currentStep, setCurrentStep,
        totalSteps: TOTAL_STEPS,
        error, setError,
        fieldErrors,
        isLoading,
        isGeocoding, setIsGeocoding,
        isLocationModalOpen, setIsLocationModalOpen,
        locationModalStep, setLocationModalStep,
        isTimePickerOpen, setIsTimePickerOpen,
        tempSlot, setTempSlot,
        formData, setFormData,
        otpSent, otpSending, otpVerified, resendCountdown,
        otpCode, setOtpCode,
        ownerPasswordConfirm, setOwnerPasswordConfirm,
        updateOwner, updateBusiness, updatePitch,
        setPitchCount, toggleFacility, toggleClosedDay, addTimeSlot, removeTimeSlot,
        sendOtp, verifyOtp,
        handleSubmit, nextStep, prevStep,
    };
};
