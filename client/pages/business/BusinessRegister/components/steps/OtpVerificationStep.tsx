import React, { useEffect, useRef } from 'react';
import { ShieldCheck } from 'lucide-react';
import { OtpInput } from '../../../../../components/UI/OtpInput';
import { LoadingSpinner } from '../../../../../components/UI/LoadingSpinner';

interface OtpVerificationStepProps {
    phone: string;
    otpCode: string;
    setOtpCode: (v: string) => void;
    otpSending: boolean;
    isLoading: boolean;
    resendCountdown: number;
    onVerify: (code: string) => void;
    onResend: () => void;
}

// Not: kök öğeye animasyon sınıfı KOYMA — AuthWizardLayout içeriği `animate-step-in` ile sarar.
export const OtpVerificationStep: React.FC<OtpVerificationStepProps> = ({
    otpCode, setOtpCode, otpSending, isLoading, resendCountdown, onVerify, onResend,
}) => {
    // 6. hanede otomatik doğrula (app geneli OTP deseni — Kayıt/ŞifremiUnuttum ile aynı).
    // Aynı kodu iki kez göndermeyi engelle; hane silinince (uzunluk<6) ref sıfırlanır →
    // yanlış koddan sonra düzeltip tekrar denenebilir.
    const lastSubmitted = useRef('');
    useEffect(() => {
        const clean = otpCode.replace(/\s/g, '');
        if (clean.length === 6) {
            if (!isLoading && lastSubmitted.current !== clean) {
                lastSubmitted.current = clean;
                onVerify(clean);
            }
        } else {
            lastSubmitted.current = '';
        }
    }, [otpCode, isLoading, onVerify]);

    return (
        <div className="flex flex-col items-center text-center space-y-6 pt-2">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(249,115,22,0.15)] relative">
                <div className="absolute inset-0 rounded-2xl bg-orange-400/10 blur-md" />
                <ShieldCheck className="relative z-10 w-8 h-8 text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
            </div>

            <OtpInput value={otpCode} onChange={setOtpCode} accent="orange" autoFocus disabled={isLoading} />

            {isLoading && (
                <div className="flex justify-center">
                    <LoadingSpinner size="sm" text="Doğrulanıyor..." />
                </div>
            )}

            <button
                type="button"
                onClick={onResend}
                disabled={otpSending || resendCountdown > 0}
                className="text-slate-400 hover:text-orange-400 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 py-2 px-3"
                style={{ fontSize: 'clamp(0.8rem, 2vh, 0.9rem)' }}
            >
                {resendCountdown > 0 ? `Kodu tekrar gönder (${resendCountdown}s)` : 'Kodu tekrar gönder'}
            </button>
        </div>
    );
};
