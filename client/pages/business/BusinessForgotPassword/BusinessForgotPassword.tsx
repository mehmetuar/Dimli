import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { Mail, Lock, CheckCircle } from 'lucide-react';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';
import { LottiePlayer } from '../../../components/UI/LottiePlayer';
import { OtpInput } from '../../../components/UI/OtpInput';
import { AuthWizardLayout } from '../../../components/Layout/AuthWizardLayout';
import { CelebrationScreen } from '../../../components/UI/CelebrationScreen';
import { useBusinessForgotPassword } from './hooks/useBusinessForgotPassword';

const TOTAL_STEPS = 3;
const RESET_SUCCESS_LOTTIE = '/animations/ball-success.json';

const STEP_META: { title: string; subtitle: (masked: string) => string }[] = [
    { title: 'Şifremi Unuttum', subtitle: () => 'Hesabına bağlı e-posta adresini gir, telefonuna kod gönderelim' },
    { title: 'Doğrulama Kodu', subtitle: (masked) => `${masked} numarasına gönderilen kodu gir` },
    { title: 'Yeni Şifre', subtitle: () => 'Hesabın için yeni şifreni belirle' },
];

export const BusinessForgotPassword: React.FC = () => {
    const navigate = useNavigate();
    const {
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
    } = useBusinessForgotPassword();

    // Sayfa açılınca e-posta input'una otomatik odak + klavye (Kayıt/Login akışındaki desen).
    const emailRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const t = setTimeout(() => {
            emailRef.current?.focus();
            if (Capacitor.getPlatform() === 'android') Keyboard.show().catch(() => { });
        }, 350);
        return () => clearTimeout(t);
    }, []);

    // Adım 3'te geri yok (OTP tüketildi)
    const onBack =
        step === 1 ? () => navigate('/business/login')
        : step === 2 ? goBackToEmail
        : undefined;

    const inputClass =
        'w-full bg-slate-800/40 text-white pl-12 pr-4 py-4 rounded-2xl border border-slate-700/80 focus:border-orange-500 focus:shadow-[0_0_15px_rgba(249,115,22,0.3)] focus:outline-none font-bold transition-colors';

    const primaryButton = (label: string, onClick: () => void, disabled: boolean) => (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="w-full bg-orange-600 text-white rounded-2xl font-display font-bold uppercase tracking-wider shadow-lg shadow-black/30 border border-orange-400/15 active:bg-orange-700 active:scale-[0.97] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
            style={{ height: 'clamp(48px, 7vh, 58px)', fontSize: 'clamp(0.9rem, 2.4vh, 1.1rem)' }}
        >
            {loading ? (
                <>
                    <span className="w-5 h-5 flex-shrink-0">
                        <LottiePlayer
                            src="/animations/rolling-football.json"
                            loop
                            autoplay
                            ariaLabel="Yükleniyor"
                            style={{ width: '100%', height: '100%' }}
                            fallback={null}
                        />
                    </span>
                    Lütfen bekle...
                </>
            ) : label}
        </button>
    );

    return (
        <>
            <AuthWizardLayout
                step={step}
                totalSteps={TOTAL_STEPS}
                accent="orange"
                title={STEP_META[step - 1].title}
                subtitle={STEP_META[step - 1].subtitle(maskedPhone)}
                onBack={onBack}
                error={error}
                footer={
                    step === 1 ? primaryButton('Kod Gönder', sendOtp, loading || !email.trim())
                    : step === 3 ? primaryButton('Şifremi Güncelle', resetPassword, loading)
                    : undefined /* adım 2: OTP 6. hanede otomatik doğrulanır */
                }
            >
                {/* Adım 1: E-posta */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                E-Posta Adresi
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                <input
                                    ref={emailRef}
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={inputClass}
                                    placeholder="ornek@saha.com"
                                    autoComplete="email"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Adım 2: OTP */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-3 text-center">
                                Doğrulama Kodu
                            </label>
                            <OtpInput value={otpCode} onChange={setOtpCode} accent="orange" autoFocus disabled={loading} />
                        </div>

                        {loading && (
                            <div className="flex justify-center">
                                <LoadingSpinner size="sm" text="Doğrulanıyor..." />
                            </div>
                        )}

                        <div className="text-center">
                            <button
                                type="button"
                                disabled={resendCountdown > 0 || loading}
                                onClick={resendOtp}
                                className="text-sm text-slate-400 hover:text-orange-400 font-bold disabled:cursor-not-allowed transition-colors py-2 px-3"
                            >
                                {resendCountdown > 0
                                    ? `Tekrar gönder (${resendCountdown}s)`
                                    : 'Kodu tekrar gönder'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Adım 3: Yeni şifre */}
                {step === 3 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                Yeni Şifre
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className={inputClass}
                                    placeholder="En az 6 karakter"
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                Şifre Tekrar
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={inputClass}
                                    placeholder="Şifreyi tekrar gir"
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </AuthWizardLayout>

            {/* Başarı kutlaması — işletme login'e geçiş burada */}
            <CelebrationScreen
                isOpen={success}
                lottieSrc={RESET_SUCCESS_LOTTIE}
                fallback={<CheckCircle className="w-20 h-20 text-green-400" />}
                title="ŞİFRE GÜNCELLENDİ!"
                subtitle="Giriş ekranına yönlendiriliyorsun..."
                buttonLabel="GİRİŞ YAP"
                autoCloseMs={2200}
                onDone={() => navigate('/business/login', { replace: true })}
            />
        </>
    );
};
