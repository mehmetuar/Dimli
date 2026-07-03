import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import { initializePushNotifications } from '../../../../services/pushNotificationService';
import { useAuth } from '../../../../contexts/AuthContext';
import { isValidTurkishPhone, sanitizePhoneInput, PHONE_INVALID_MESSAGE } from '../../../../utils/phone';
import { sanitizeUsernameInput, isValidUsername, normalizeUsername, USERNAME_INVALID_MESSAGE } from '../../../../utils/username';
import { getErrorMessage } from '../../../../utils/apiError';

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
        nationality: 'TR', // Uyruk (ISO alpha-2) — zorunlu, default Türkiye; payload'a ...rest ile gider
        avatarUrl: '', // blob: URL for local preview only — NOT sent to server
    });
    const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    // Kayıt tamamlandı → tam ekran kutlama (CelebrationScreen) gösterilir; navigate onDone'da
    const [registerSuccess, setRegisterSuccess] = useState(false);

    // OTP state
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [resendCountdown, setResendCountdown] = useState(0);

    // Photo upload state (used during post-registration upload phase)
    const [uploadLoading, setUploadLoading] = useState(false);

    const navigate = useNavigate();
    const { loginAsCustomer } = useAuth();

    // Geri sayım timer'ı
    useEffect(() => {
        if (resendCountdown <= 0) return;
        const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCountdown]);

    // OTP tamamlandığında otomatik doğrula
    useEffect(() => {
        if (otpCode.length === 6 && otpSent && !otpVerified) {
            verifyOtp(otpCode);
        }
    }, [otpCode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name } = e.target;
        const value =
            name === 'phone' ? sanitizePhoneInput(e.target.value)
            : name === 'username' ? sanitizeUsernameInput(e.target.value)
            : e.target.value;
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
        if (!isValidTurkishPhone(formData.phone)) {
            setError(PHONE_INVALID_MESSAGE);
            setFieldErrors({ phone: PHONE_INVALID_MESSAGE });
            return;
        }
        setError('');
        setFieldErrors({});
        setOtpLoading(true);
        try {
            await api.post('/auth/send-otp', { phone: formData.phone });
            setOtpSent(true);
            setOtpCode('');
            setResendCountdown(60);
        } catch (err: any) {
            setError(getErrorMessage(err, 'SMS gönderilemedi. Lütfen tekrar deneyin.'));
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
            setError(getErrorMessage(err, 'Geçersiz doğrulama kodu.'));
            setOtpCode('');
        } finally {
            setOtpLoading(false);
        }
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
            } else if (!isValidUsername(normalizeUsername(formData.username))) {
                errors.username = USERNAME_INVALID_MESSAGE;
            } else {
                // Kullanıcı adı müsait mi kontrol et
                setLoading(true);
                try {
                    const res = await api.get('/users/check-username', {
                        params: { username: normalizeUsername(formData.username) },
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

    const handleRegister = async () => {
        if (step !== 7) return; // güvenlik kontrolü

        setLoading(true);
        setError('');

        try {
            // Payload temizle: avatarUrl (blob URL) ve confirmPassword gönderilmez,
            // boş email gönderilmez (class-validator @IsEmail() hatasını önler)
            const { avatarUrl, confirmPassword, email, ...rest } = formData;
            const payload: Record<string, any> = { ...rest };
            payload.username = normalizeUsername(formData.username);
            if (email && email.trim() !== '') {
                payload.email = email.trim();
            }

            // Adım 1: Kayıt
            await api.post('/auth/register', payload);

            // Adım 2: Giriş → JWT al
            const loginResponse = await api.post('/auth/login', {
                username: payload.username,
                password: formData.password,
            });

            if (!loginResponse.data.access_token) {
                navigate('/login');
                return;
            }

            const token = loginResponse.data.access_token;
            await loginAsCustomer(token);
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

            // Adım 5: Kutlama ekranını göster — ana sayfaya geçiş CelebrationScreen.onDone'da
            setRegisterSuccess(true);
        } catch (err: any) {
            console.error(err);
            setError(getErrorMessage(err, 'Kayıt başarısız. Lütfen tekrar deneyin.'));
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
        otpCode,
        setOtpCode,
        resendCountdown,
        uploadLoading,
        registerSuccess,
        handleChange,
        sendOtp,
        uploadAvatar,
        nextStep,
        prevStep,
        handleRegister,
    };
};
