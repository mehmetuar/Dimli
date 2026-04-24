import React, { useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface OtpVerificationStepProps {
    phone: string;
    otpCode: string;
    setOtpCode: (v: string) => void;
    otpSending: boolean;
    isLoading: boolean;
    onVerify: (code: string) => void;
    onResend: () => void;
}

export const OtpVerificationStep: React.FC<OtpVerificationStepProps> = ({
    phone, otpCode, setOtpCode, otpSending, isLoading, onVerify, onResend
}) => {
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const digits = otpCode.split('');
        digits[index] = value.slice(-1);
        const newCode = digits.join('').padEnd(6, '').slice(0, 6);
        setOtpCode(newCode.trimEnd());
        if (value && index < 5) inputsRef.current[index + 1]?.focus();
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    const handleVerify = () => {
        const code = otpCode.padEnd(6, '');
        if (code.replace(/\s/g, '').length < 6) return;
        onVerify(code);
    };

    const digits = Array.from({ length: 6 }, (_, i) => otpCode[i] || '');

    return (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-4 animate-fade-in">
            <div className="space-y-2">
                <h2 className="text-2xl font-black text-white italic uppercase">Telefon Doğrulama</h2>
                <p className="text-slate-400 text-sm">
                    <span className="text-white font-bold">{phone}</span> numarasına gönderilen 6 haneli kodu girin.
                </p>
            </div>

            <div className="flex gap-3">
                {digits.map((digit, i) => (
                    <input
                        key={i}
                        ref={el => { inputsRef.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleChange(i, e.target.value)}
                        onKeyDown={e => handleKeyDown(i, e)}
                        className="w-11 h-14 text-center text-2xl font-black text-white bg-slate-800 border-2 border-slate-700 rounded-xl focus:outline-none focus:border-orange-500 transition-all"
                    />
                ))}
            </div>

            <button
                onClick={handleVerify}
                disabled={isLoading || otpCode.replace(/\s/g, '').length < 6}
                className="w-full max-w-xs bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white py-3 rounded-xl font-black transition-colors flex items-center justify-center gap-2"
            >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Doğrula'}
            </button>

            <button
                onClick={onResend}
                disabled={otpSending}
                className="text-slate-400 hover:text-white text-sm font-medium transition-colors flex items-center gap-1"
            >
                {otpSending ? <Loader2 className="animate-spin" size={14} /> : null}
                Kodu tekrar gönder
            </button>
        </div>
    );
};
