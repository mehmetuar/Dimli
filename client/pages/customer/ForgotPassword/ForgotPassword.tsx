import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Lock, CheckCircle } from 'lucide-react';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';
import { LottiePlayer } from '../../../components/UI/LottiePlayer';
import { OtpInput } from '../../../components/UI/OtpInput';
import { AuthWizardLayout } from '../../../components/Layout/AuthWizardLayout';
import { CelebrationScreen } from '../../../components/UI/CelebrationScreen';
import { useForgotPassword } from './hooks/useForgotPassword';

const TOTAL_STEPS = 3;

// Başarı Lottie'si — kilit açılma temalı özel animasyon bulununca yalnız bu satır değişir
const RESET_SUCCESS_LOTTIE = '/animations/ball-success.json';

const STEP_META: { title: string; subtitle: (phone: string) => string }[] = [
    { title: 'Şifremi Unuttum', subtitle: () => 'Kayıtlı numaranı gir, SMS ile kod gönderelim' },
    { title: 'Doğrulama Kodu', subtitle: (phone) => `${phone} numarasına gönderilen kodu gir` },
    { title: 'Yeni Şifre', subtitle: () => 'Hesabın için yeni şifreni belirle' },
];

export const ForgotPassword: React.FC = () => {
    const navigate = useNavigate();
    const {
        step,
        phone,
        setPhone,
        otpCode,
        setOtpCode,
        newPassword,
        setNewPassword,
        confirmPassword,
        setConfirmPassword,
        error,
        loading,
        resendCountdown,
        success,
        sendOtp,
        resendOtp,
        goBackToPhone,
        resetPassword,
    } = useForgotPassword();

    // Adım 3'te geri yok (OTP tüketildi — geri dönmek anlamsız)
    const onBack =
        step === 1 ? () => navigate('/login')
        : step === 2 ? goBackToPhone
        : undefined;

    const inputClass =
        'w-full bg-slate-800/40 text-white pl-12 pr-4 py-4 rounded-2xl border border-slate-700/80 focus:border-turf-500 focus:shadow-neon-sm focus:outline-none font-bold transition-colors';

    const primaryButton = (label: string, onClick: () => void, disabled: boolean) => (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="w-full bg-turf-600 text-white rounded-2xl font-display font-bold uppercase tracking-wider shadow-lg shadow-black/30 border border-turf-400/15 active:bg-turf-700 active:scale-[0.97] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
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
                title={STEP_META[step - 1].title}
                subtitle={STEP_META[step - 1].subtitle(phone)}
                onBack={onBack}
                error={error}
                footer={
                    step === 1 ? primaryButton('Kod Gönder', sendOtp, loading || !phone.trim())
                    : step === 3 ? primaryButton('Şifremi Güncelle', resetPassword, loading)
                    : undefined /* adım 2: OTP 6. hanede otomatik doğrulanır */
                }
            >
                {/* Adım 1: Telefon */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                Telefon Numarası
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className={inputClass}
                                    placeholder="0555 555 55 55"
                                    autoComplete="tel"
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
                            <OtpInput value={otpCode} onChange={setOtpCode} accent="turf" autoFocus disabled={loading} />
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
                                className="text-sm text-slate-400 hover:text-turf-400 font-bold disabled:cursor-not-allowed transition-colors py-2 px-3"
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

            {/* Başarı kutlaması — login'e geçiş burada */}
            <CelebrationScreen
                isOpen={success}
                lottieSrc={RESET_SUCCESS_LOTTIE}
                fallback={<CheckCircle className="w-20 h-20 text-turf-400" />}
                title="ŞİFRE GÜNCELLENDİ!"
                subtitle="Giriş ekranına yönlendiriliyorsun..."
                buttonLabel="GİRİŞ YAP"
                autoCloseMs={2200}
                onDone={() => navigate('/login', { replace: true })}
            />
        </>
    );
};
