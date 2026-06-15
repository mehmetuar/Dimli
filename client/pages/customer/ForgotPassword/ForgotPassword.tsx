import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Lock, CheckCircle, ChevronLeft } from 'lucide-react';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';
import { useForgotPassword } from './hooks/useForgotPassword';

export const ForgotPassword: React.FC = () => {
    const {
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
        resendCountdown,
        success,
        sendOtp,
        resendOtp,
        onOtpDigitChange,
        resetPassword,
    } = useForgotPassword();

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleDigitChange = (index: number, value: string) => {
        const digits = value.replace(/\D/g, '');

        // iOS/Android SMS otomatik doldurma: tüm kodu tek inputa yapıştırır
        if (digits.length > 1) {
            const code = digits.slice(0, 6);
            code.split('').forEach((d, i) => onOtpDigitChange(i, d));
            const nextIndex = Math.min(code.length, 5);
            inputRefs.current[nextIndex]?.focus();
            return;
        }

        onOtpDigitChange(index, digits);
        if (digits && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        pasted.split('').forEach((digit, i) => onOtpDigitChange(i, digit));
        const nextIndex = Math.min(pasted.length, 5);
        inputRefs.current[nextIndex]?.focus();
    };

    return (
        <div className="min-h-screen bg-pitch flex flex-col items-center justify-center px-4 pt-20 pb-28">
            <div className="w-full max-w-md bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl">

                {/* Başarı ekranı */}
                {success ? (
                    <div className="flex flex-col items-center gap-4 py-6 text-center">
                        <CheckCircle className="w-16 h-16 text-turf-400" />
                        <h2 className="text-white font-sport font-black text-2xl italic">ŞİFRE GÜNCELLENDİ!</h2>
                        <p className="text-slate-400 text-sm">Giriş ekranına yönlendiriliyorsun...</p>
                    </div>
                ) : (
                    <>
                        {/* Başlık */}
                        <div className="text-center mb-8">
                            <img src="/icon.png" alt="DİMLİ" className="h-12 w-auto object-contain mx-auto mb-4" />
                            <h1 className="font-sport font-black text-3xl text-white italic">ŞİFREMİ UNUTTUM</h1>
                            <p className="text-slate-400 mt-2 text-sm">
                                {step === 1 && 'Kayıtlı telefon numaranı gir, SMS ile kod gönderelim.'}
                                {step === 2 && `${phone} numarasına gönderilen kodu gir.`}
                                {step === 3 && 'Yeni şifreni belirle.'}
                            </p>
                        </div>

                        {/* Adım göstergesi */}
                        <div className="flex gap-2 mb-6">
                            {[1, 2, 3].map((s) => (
                                <div
                                    key={s}
                                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-turf-500' : 'bg-slate-700'}`}
                                />
                            ))}
                        </div>

                        {/* Hata mesajı */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-sm font-bold text-center">
                                {error}
                            </div>
                        )}

                        {/* Adım 1: Telefon girişi */}
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
                                            className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                                            placeholder="0555 555 55 55"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    disabled={loading || !phone.trim()}
                                    onClick={sendOtp}
                                    className="w-full bg-turf-600 text-white py-4 rounded-xl font-black text-lg uppercase tracking-wider hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20 mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? <LoadingSpinner size="sm" text="" /> : 'Kod Gönder'}
                                </button>
                            </div>
                        )}

                        {/* Adım 2: OTP doğrulama */}
                        {step === 2 && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-3 text-center">
                                        Doğrulama Kodu
                                    </label>
                                    <div className="flex justify-center gap-2" onPaste={handlePaste}>
                                        {otpDigits.map((digit, i) => (
                                            <input
                                                key={i}
                                                ref={(el) => { inputRefs.current[i] = el; }}
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                                                maxLength={i === 0 ? 6 : 1}
                                                value={digit}
                                                onChange={(e) => handleDigitChange(i, e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(i, e)}
                                                disabled={loading}
                                                className={`w-11 h-14 text-center text-xl font-bold bg-slate-900 text-white rounded-xl border transition-colors focus:outline-none
                                                    ${digit ? 'border-turf-500' : 'border-slate-700 focus:border-turf-500'}
                                                    ${loading ? 'opacity-50' : ''}`}
                                            />
                                        ))}
                                    </div>
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
                                        className="text-sm text-slate-400 hover:text-turf-400 font-bold disabled:cursor-not-allowed transition-colors"
                                    >
                                        {resendCountdown > 0
                                            ? `Tekrar gönder (${resendCountdown}s)`
                                            : 'Kodu tekrar gönder'}
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        // geri dönmek isterse adım 1'e al
                                        window.location.reload();
                                    }}
                                    className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white text-sm font-bold transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Farklı numara gir
                                </button>
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
                                            className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                                            placeholder="En az 6 karakter"
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
                                            className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                                            placeholder="Şifreyi tekrar gir"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={resetPassword}
                                    className="w-full bg-turf-600 text-white py-4 rounded-xl font-black text-lg uppercase tracking-wider hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20 mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? <LoadingSpinner size="sm" text="" /> : 'Şifremi Güncelle'}
                                </button>
                            </div>
                        )}
                    </>
                )}

                <div className="mt-6 text-center">
                    <Link to="/login" className="text-slate-400 text-sm hover:text-turf-500 font-bold transition-colors">
                        ← Giriş ekranına dön
                    </Link>
                </div>
            </div>
        </div>
    );
};
