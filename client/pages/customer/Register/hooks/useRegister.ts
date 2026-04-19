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
        foot: 'Sağ'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // OTP state
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [resendCountdown, setResendCountdown] = useState(0);

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
            // Otomatik olarak bir sonraki adıma geç
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

    const nextStep = () => {
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
            // Adım 4'ten ileri butonuyla geçilmesi engellenir;
            // ileri geçiş OTP doğrulaması ile otomatik olur.
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
        if (step !== 6) return;

        setLoading(true);
        setError('');

        try {
            await api.post('/auth/register', formData);

            const loginResponse = await api.post('/auth/login', {
                username: formData.username,
                password: formData.password
            });

            if (loginResponse.data.access_token) {
                localStorage.setItem('token', loginResponse.data.access_token);
                navigate('/');
            } else {
                navigate('/login');
            }
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
        handleChange,
        sendOtp,
        onOtpDigitChange,
        nextStep,
        prevStep,
        handleRegister,
    };
};
