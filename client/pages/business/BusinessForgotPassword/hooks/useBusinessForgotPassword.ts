import { useState, useEffect } from 'react';
import api from '../../../../services/api';
import { getErrorMessage, getRetryAfterSeconds } from '../../../../utils/apiError';

/**
 * İşletme "Şifremi Unuttum" mantığı (eski BusinessForgotPasswordModal'dan taşındı, aynen).
 * Akış: 1) e-posta → send-otp (kayıtlı telefona SMS, maskedPhone döner)
 *       2) OTP (6. hanede otomatik doğrula) → verify-otp
 *       3) yeni şifre → reset → success
 * Endpoint'ler: /auth/business/forgot-password/{send-otp,verify-otp,reset}
 */
export const useBusinessForgotPassword = () => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [email, setEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [maskedPhone, setMaskedPhone] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(0);
    const [success, setSuccess] = useState(false);

    // Geri sayım timer'ı
    useEffect(() => {
        if (resendCountdown <= 0) return;
        const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCountdown]);

    // OTP tamamlandığında otomatik doğrula
    useEffect(() => {
        if (otpCode.length === 6 && otpSent && step === 2) {
            verifyOtp(otpCode);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [otpCode]);

    const sendOtp = async () => {
        if (!email.trim()) {
            setError('Lütfen e-posta adresinizi girin.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const res = await api.post('/auth/business/forgot-password/send-otp', { email });
            setMaskedPhone(res.data.maskedPhone);
            setOtpCode('');
            setOtpSent(true);
            setResendCountdown(60);
            setStep(2);
        } catch (err: any) {
            setError(getErrorMessage(err, 'Kod gönderilirken bir hata oluştu.'));
            // 429 → geri sayımı sunucunun söylediği süreden başlat
            const retryAfter = getRetryAfterSeconds(err);
            if (retryAfter) setResendCountdown(retryAfter);
        } finally {
            setLoading(false);
        }
    };

    const resendOtp = async () => {
        if (resendCountdown > 0 || loading) return;
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/business/forgot-password/send-otp', { email });
            setOtpCode('');
            setResendCountdown(60);
        } catch (err: any) {
            setError(getErrorMessage(err, 'Kod gönderilirken bir hata oluştu.'));
            const retryAfter = getRetryAfterSeconds(err);
            if (retryAfter) setResendCountdown(retryAfter);
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async (code: string) => {
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/business/forgot-password/verify-otp', { email, code });
            setTimeout(() => setStep(3), 400);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Kod doğrulanamadı.');
            setOtpCode('');
        } finally {
            setLoading(false);
        }
    };

    // "Farklı e-posta gir": adım 1'e dön (e-posta dolu kalır; resendCountdown bilinçli sıfırlanmaz).
    const goBackToEmail = () => {
        setStep(1);
        setOtpSent(false);
        setOtpCode('');
        setError('');
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
            await api.post('/auth/business/forgot-password/reset', { email, newPassword });
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Şifre sıfırlanırken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return {
        step,
        email,
        setEmail,
        otpCode,
        setOtpCode,
        newPassword,
        setNewPassword,
        confirmPassword,
        setConfirmPassword,
        maskedPhone,
        error,
        loading,
        resendCountdown,
        success,
        sendOtp,
        resendOtp,
        goBackToEmail,
        resetPassword,
    };
};
