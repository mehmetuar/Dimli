import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';

export const useForgotPassword = () => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [phone, setPhone] = useState('');
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(0);
    const [success, setSuccess] = useState(false);

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
        if (code.length === 6 && otpSent && step === 2) {
            verifyOtp(code);
        }
    }, [otpDigits]);

    const sendOtp = async () => {
        if (!phone.trim()) {
            setError('Lütfen telefon numaranızı girin.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/forgot-password/send-otp', { phone });
            setOtpSent(true);
            setResendCountdown(60);
            setStep(2);
        } catch (err: any) {
            setError(err.response?.data?.message || 'SMS gönderilemedi. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    const resendOtp = async () => {
        if (resendCountdown > 0) return;
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/forgot-password/send-otp', { phone });
            setOtpDigits(['', '', '', '', '', '']);
            setResendCountdown(60);
        } catch (err: any) {
            setError(err.response?.data?.message || 'SMS gönderilemedi. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async (code: string) => {
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/forgot-password/verify-otp', { phone, code });
            setTimeout(() => setStep(3), 400);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Geçersiz doğrulama kodu.');
            setOtpDigits(['', '', '', '', '', '']);
        } finally {
            setLoading(false);
        }
    };

    const onOtpDigitChange = (index: number, value: string) => {
        const newDigits = [...otpDigits];
        newDigits[index] = value;
        setOtpDigits(newDigits);
    };

    const resetPassword = async () => {
        setError('');

        if (!newPassword) {
            setError('Lütfen yeni şifrenizi girin.');
            return;
        }
        if (newPassword.length < 6) {
            setError('Şifre en az 6 karakter olmalıdır.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Şifreler eşleşmiyor.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/forgot-password/reset', { phone, newPassword });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Şifre güncellenemedi. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    return {
        step,
        phone,
        setPhone,
        otpDigits,
        newPassword,
        setNewPassword,
        confirmPassword,
        setConfirmPassword,
        error,
        loading,
        otpSent,
        resendCountdown,
        success,
        sendOtp,
        resendOtp,
        onOtpDigitChange,
        resetPassword,
    };
};
