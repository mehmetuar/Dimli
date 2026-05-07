import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import { initializePushNotifications } from '../../../../services/pushNotificationService';

export const useRegister = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        phone: '',
        email: '',
        birthDate: '',
        position: 'Orta Saha',
        secondaryPosition: '',
        foot: 'Sağ',
        avatarUrl: '', // blob: URL for local preview only — NOT sent to server
    });
    const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

    // OTP state
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [resendCountdown, setResendCountdown] = useState(0);

    // Photo upload state (used during post-registration upload phase)
    const [uploadLoading, setUploadLoading] = useState(false);

    const navigate = useNavigate();

    // Geri sayım timer'ı
    useEffect(() => {
        if (resendCountdown <= 0) return;
        const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCountdown]);

    // OTP tamamlandığında otomatik doğrula
    useEffect(() => {
        const code = otpDigits.join('');
        if (code.length === 6 && otpSent && !otpVerified) {
            verifyOtp(code);
        }
    }, [otpDigits]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        
        // Alan doldurulduğunda hatayı temizle
        if (value.trim()) {
            setFieldErrors(prev => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const sendOtp = async () => {
        if (!formData.phone) {
            setError('Lütfen telefon numaranızı girin.');
            setFieldErrors({ phone: 'Telefon numarası zorunludur' });
            return;
        }
        setError('');
        setFieldErrors({});
        setOtpLoading(true);
        try {
            await api.post('/auth/send-otp', { phone: formData.phone });
            setOtpSent(true);
            setOtpDigits(['', '', '', '', '', '']);
            setResendCountdown(60);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'SMS gönderilemedi. Lütfen tekrar deneyin.');
        } finally {
            setOtpLoading(false);
        }
    };

    const verifyOtp = async (code: string) => {
        setError('');
        setOtpLoading(true);
        try {
            await api.post('/auth/verify-otp', { phone: formData.phone, code });
            setOtpVerified(true);
            setTimeout(() => setStep(5), 600);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Geçersiz doğrulama kodu.');
            setOtpDigits(['', '', '', '', '', '']);
        } finally {
            setOtpLoading(false);
        }
    };

    const onOtpDigitChange = (index: number, value: string) => {
        const newDigits = [...otpDigits];
        newDigits[index] = value;
        setOtpDigits(newDigits);
    };

    // Fotoğraf seçildiğinde anında local önizleme — yükleme kayıt sonrasına ertelendi
    const uploadAvatar = (file: File) => {
        // Önceki blob URL'i temizle
        if (formData.avatarUrl && formData.avatarUrl.startsWith('blob:')) {
            URL.revokeObjectURL(formData.avatarUrl);
        }
        const previewUrl = URL.createObjectURL(file);
        setSelectedAvatarFile(file);
        setFormData((prev) => ({ ...prev, avatarUrl: previewUrl }));
    };

    const validateStep = async (currentStep: number): Promise<boolean> => {
        const errors: Record<string, string> = {};

        if (currentStep === 1) {
            if (!formData.username.trim()) {
                errors.username = 'Kullanıcı adı zorunludur';
            } else if (formData.username.trim().length < 3) {
                errors.username = 'En az 3 karakter olmalıdır';
            } else {
                // Kullanıcı adı müsait mi kontrol et
                setLoading(true);
                try {
                    const res = await api.get('/users/check-username', {
                        params: { username: formData.username.trim() },
                    });
                    if (!res.data.available) {
                        errors.username = 'Bu kullanıcı adı zaten alınmış';
                    }
                } catch {
                    setError('Kullanıcı adı kontrol edilemedi.');
                    setLoading(false);
                    return false;
                } finally {
                    setLoading(false);
                }
            }
        }

        if (currentStep === 2) {
            if (!formData.password) errors.password = 'Şifre zorunludur';
            if (!formData.confirmPassword) errors.confirmPassword = 'Şifre tekrarı zorunludur';
            
            if (formData.password && formData.password.length < 6) {
                errors.password = 'En az 6 karakter olmalıdır';
            }
            if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
                errors.confirmPassword = 'Şifreler eşleşmiyor';
            }
        }

        if (currentStep === 3) {
            if (!formData.full_name.trim()) {
                errors.full_name = 'Ad Soyad zorunludur';
            }
        }

        if (currentStep === 4) {
            if (!otpVerified) {
                setError('Lütfen önce telefon numaranızı doğrulayın.');
                return false;
            }
        }

        if (currentStep === 5) {
            if (!formData.birthDate) {
                errors.birthDate = 'Doğum tarihi zorunludur';
            }
        }

        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) {
            setError('Lütfen zorunlu alanları doldurun.');
            return false;
        }
        return true;
    };

    const nextStep = async () => {
        setError('');
        setFieldErrors({});

        const isValid = await validateStep(step);
        if (!isValid) return;

        setStep((s) => s + 1);
    };

    const prevStep = () => {
        setError('');
        setFieldErrors({});
        setStep((s) => s - 1);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (step !== 7) return;

        setLoading(true);
        setError('');

        try {
            // Payload temizle: avatarUrl (blob URL) ve confirmPassword gönderilmez,
            // boş email gönderilmez (class-validator @IsEmail() hatasını önler)
            const { avatarUrl, confirmPassword, email, ...rest } = formData;
            const payload: Record<string, any> = { ...rest };
            if (email && email.trim() !== '') {
                payload.email = email.trim();
            }

            // Adım 1: Kayıt
            await api.post('/auth/register', payload);

            // Adım 2: Giriş → JWT al
            const loginResponse = await api.post('/auth/login', {
                username: formData.username,
                password: formData.password,
            });

            if (!loginResponse.data.access_token) {
                navigate('/login');
                return;
            }

            const token = loginResponse.data.access_token;
            localStorage.setItem('token', token);
            setTimeout(() => initializePushNotifications(), 2000);

            // Adım 3: Seçili fotoğraf varsa şimdi yükle (artık JWT var)
            if (selectedAvatarFile) {
                setUploadLoading(true);
                try {
                    const data = new FormData();
                    data.append('file', selectedAvatarFile);
                    const uploadResponse = await api.post('/files/upload', data, {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    // Adım 4: Profili güncelle
                    await api.patch('/users/me', { avatarUrl: uploadResponse.data.url });
                } catch (uploadErr) {
                    // Yükleme başarısız olsa da kayıt tamamlandı — sessizce geç
                    console.error('Avatar upload failed:', uploadErr);
                } finally {
                    setUploadLoading(false);
                    if (formData.avatarUrl && formData.avatarUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(formData.avatarUrl);
                    }
                }
            }

            // Adım 5: Ana sayfaya yönlendir
            navigate('/');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Kayıt başarısız. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    return {
        step,
        formData,
        error,
        fieldErrors,
        loading,
        otpSent,
        otpVerified,
        otpLoading,
        otpDigits,
        resendCountdown,
        uploadLoading,
        handleChange,
        sendOtp,
        onOtpDigitChange,
        uploadAvatar,
        nextStep,
        prevStep,
        handleRegister,
    };
};
