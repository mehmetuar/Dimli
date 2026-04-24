import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';

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
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const sendOtp = async () => {
        if (!formData.phone) {
            setError('Lütfen telefon numaranızı girin.');
            return;
        }
        setError('');
        setOtpLoading(true);
        try {
            await api.post('/auth/send-otp', { phone: formData.phone });
            setOtpSent(true);
            setOtpDigits(['', '', '', '', '', '']);
            setResendCountdown(60);
        } catch (err: any) {
            setError(err.response?.data?.message || 'SMS gönderilemedi. Lütfen tekrar deneyin.');
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
            setError(err.response?.data?.message || 'Geçersiz doğrulama kodu.');
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

    const nextStep = async () => {
        setError('');

        if (step === 1) {
            if (!formData.username.trim()) {
                setError('Lütfen bir kullanıcı adı girin.');
                return;
            }
            if (formData.username.trim().length < 3) {
                setError('Kullanıcı adı en az 3 karakter olmalıdır.');
                return;
            }
            // Kullanıcı adı müsait mi kontrol et
            setLoading(true);
            try {
                const res = await api.get('/users/check-username', {
                    params: { username: formData.username.trim() },
                });
                if (!res.data.available) {
                    setError('Bu kullanıcı adı zaten alınmış. Lütfen başka bir tane deneyin.');
                    return;
                }
            } catch {
                setError('Kullanıcı adı kontrol edilemedi. Lütfen tekrar deneyin.');
                return;
            } finally {
                setLoading(false);
            }
        }

        if (step === 2) {
            if (!formData.password || !formData.confirmPassword) {
                setError('Lütfen tüm alanları doldurun.');
                return;
            }
            if (formData.password.length < 6) {
                setError('Şifre en az 6 karakter olmalıdır.');
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                setError('Şifreler eşleşmiyor.');
                return;
            }
        }

        if (step === 3) {
            if (!formData.full_name.trim()) {
                setError('Lütfen adınızı ve soyadınızı girin.');
                return;
            }
        }

        if (step === 4) {
            if (!otpVerified) {
                setError('Lütfen önce telefon numaranızı doğrulayın.');
                return;
            }
        }

        if (step === 5) {
            if (!formData.birthDate) {
                setError('Lütfen doğum tarihinizi seçin.');
                return;
            }
        }

        setStep((s) => s + 1);
    };

    const prevStep = () => {
        setError('');
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
