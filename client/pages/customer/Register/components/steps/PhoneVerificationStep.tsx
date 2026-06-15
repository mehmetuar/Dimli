import React from 'react';
import { Phone, Shield } from 'lucide-react';
import { OtpInput } from '../../../../../components/UI/OtpInput';

const scrollInputIntoView = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
};

interface PhoneVerificationStepProps {
    formData: any;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    otpSent: boolean;
    otpVerified: boolean;
    otpLoading: boolean;
    otpCode: string;
    setOtpCode: (value: string) => void;
    resendCountdown: number;
    sendOtp: () => void;
    fieldErrors: Record<string, string>;
}

export const PhoneVerificationStep: React.FC<PhoneVerificationStepProps> = ({
    formData,
    handleChange,
    otpSent,
    otpVerified,
    otpLoading,
    otpCode,
    setOtpCode,
    resendCountdown,
    sendOtp,
    fieldErrors,
}) => {
    const error = fieldErrors.phone;

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">Telefon Doğrulama</h2>
                <p className="text-slate-400 text-sm">
                    {otpSent
                        ? 'SMS ile gönderilen 6 haneli kodu gir'
                        : 'Telefon numaranı doğrulamak için kod gönderilecek'}
                </p>
            </div>

            {/* Telefon girişi */}
            <div>
                <label className={`block text-xs font-bold uppercase mb-1 ${error ? 'text-red-400' : 'text-slate-400'}`}>
                    Telefon Numarası
                </label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Phone className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${error ? 'text-red-400' : 'text-slate-500'}`} />
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            onFocus={scrollInputIntoView}
                            disabled={otpSent}
                            className={`w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border focus:outline-none font-bold transition-colors
                                ${otpSent ? 'border-slate-600 opacity-60 cursor-not-allowed' : error ? 'border-red-500 focus:border-red-400' : 'border-slate-700 focus:border-turf-500'}`}
                            placeholder="0555 555 55 55"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={sendOtp}
                        disabled={otpLoading || (otpSent && resendCountdown > 0) || !formData.phone}
                        className={`px-4 py-4 rounded-xl font-bold text-sm whitespace-nowrap transition-all
                            ${otpSent && resendCountdown > 0
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-turf-500 hover:bg-turf-400 text-white active:scale-95'
                            }`}
                    >
                        {otpLoading
                            ? '...'
                            : otpSent && resendCountdown > 0
                                ? `${resendCountdown}s`
                                : otpSent
                                    ? 'Tekrar Gönder'
                                    : 'Kod Gönder'
                        }
                    </button>
                </div>
                {error && (
                    <p className="text-red-400 text-xs font-bold ml-1 mt-1 animate-fade-in">{error}</p>
                )}
            </div>

            {/* OTP kutuları */}
            {otpSent && !otpVerified && (
                <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-3 text-center">
                        Doğrulama Kodu
                    </label>
                    <OtpInput value={otpCode} onChange={setOtpCode} accent="turf" autoFocus disabled={otpLoading} />
                </div>
            )}

            {/* Doğrulandı mesajı */}
            {otpVerified && (
                <div className="flex items-center justify-center gap-2 bg-turf-500/10 border border-turf-500/50 text-turf-400 p-3 rounded-xl">
                    <Shield className="w-5 h-5" />
                    <span className="font-bold text-sm">Telefon numarası doğrulandı!</span>
                </div>
            )}
        </div>
    );
};
