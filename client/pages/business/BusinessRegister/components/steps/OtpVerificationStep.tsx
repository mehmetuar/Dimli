import React from 'react';
import { Loader2 } from 'lucide-react';
import { OtpInput } from '../../../../../components/UI/OtpInput';

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

export const OtpVerificationStep: React.FC<OtpVerificationStepProps> = ({
    phone, otpCode, setOtpCode, otpSending, isLoading, resendCountdown, onVerify, onResend
}) => {
    const handleVerify = () => {
        const code = otpCode.padEnd(6, '');
        if (code.replace(/\s/g, '').length < 6) return;
        onVerify(code);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-4 animate-fade-in">
            <div className="space-y-2">
                <h2 className="text-2xl font-black text-white italic uppercase">Telefon Doğrulama</h2>
                <p className="text-slate-400 text-sm">
                    <span className="text-white font-bold">{phone}</span> numarasına gönderilen 6 haneli kodu girin.
                </p>
            </div>

            <OtpInput value={otpCode} onChange={setOtpCode} accent="orange" autoFocus disabled={isLoading} />

            <button
                onClick={handleVerify}
                disabled={isLoading || otpCode.replace(/\s/g, '').length < 6}
                className="w-full max-w-xs bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white py-3 rounded-xl font-black transition-colors flex items-center justify-center gap-2"
            >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Doğrula'}
            </button>

            <button
                onClick={onResend}
                disabled={otpSending || resendCountdown > 0}
                className="text-slate-400 hover:text-white text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
            >
                {otpSending ? <Loader2 className="animate-spin" size={14} /> : null}
                {resendCountdown > 0
                    ? `Kodu tekrar gönder (${resendCountdown}s)`
                    : 'Kodu tekrar gönder'}
            </button>
        </div>
    );
};
