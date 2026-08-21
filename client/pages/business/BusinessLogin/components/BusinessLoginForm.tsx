import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { LottiePlayer } from '../../../../components/UI/LottiePlayer';

interface BusinessLoginFormProps {
    email: string;
    setEmail: (value: string) => void;
    password: string;
    setPassword: (value: string) => void;
    showPassword: boolean;
    setShowPassword: (updater: (prev: boolean) => boolean) => void;
    error: string;
    isSubmitting: boolean;
    keyboardOpen: boolean;
    onSubmit: (e: React.FormEvent) => void;
}

export const BusinessLoginForm: React.FC<BusinessLoginFormProps> = ({
    email, setEmail,
    password, setPassword,
    showPassword, setShowPassword,
    error,
    isSubmitting,
    keyboardOpen,
    onSubmit,
}) => {
    return (
        <div
            className="flex-1 flex flex-col justify-start min-h-0 animate-enter-up [animation-delay:240ms] transition-all duration-200"
            style={{
                padding: '0 clamp(16px, 5vw, 32px)',
                paddingTop: keyboardOpen ? '0px' : 'clamp(4px, 1.5vh, 16px)',
                gap: keyboardOpen ? 'clamp(2px, 1vh, 8px)' : 'clamp(4px, 1.8vh, 18px)',
            }}
        >
            {error && (
                <div
                    className="bg-red-500/10 border border-red-500/50 text-red-400 rounded-xl text-center font-bold"
                    style={{ padding: 'clamp(8px, 1.5vh, 12px)', fontSize: 'clamp(0.75rem, 2vh, 0.875rem)' }}
                >
                    {error}
                </div>
            )}

            <form
                onSubmit={onSubmit}
                className="flex flex-col transition-all duration-200"
                style={{ gap: keyboardOpen ? 'clamp(2px, 1vh, 8px)' : 'clamp(4px, 1.8vh, 18px)' }}
            >
                <div>
                    <label
                        htmlFor="email"
                        className="block text-slate-400 font-bold"
                        style={{ fontSize: 'clamp(0.6rem, 1.6vh, 0.8rem)', marginBottom: 'clamp(2px, 0.6vh, 6px)' }}
                    >
                        E-Posta Adresi
                    </label>
                    <div className="relative">
                        <Mail
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                            style={{ width: 'clamp(16px, 4vh, 20px)', height: 'clamp(16px, 4vh, 20px)' }}
                        />
                        <input
                            className="w-full pl-11 pr-4 rounded-2xl bg-slate-900/50 border border-white/10 text-white focus:outline-none focus:border-orange-500 focus:shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all font-bold"
                            style={{ height: 'clamp(36px, 6.5vh, 56px)', fontSize: 'clamp(0.85rem, 2.2vh, 1rem)' }}
                            id="email"
                            type="email"
                            placeholder="ornek@saha.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div>
                    <label
                        htmlFor="password"
                        className="block text-slate-400 font-bold"
                        style={{ fontSize: 'clamp(0.6rem, 1.6vh, 0.8rem)', marginBottom: 'clamp(2px, 0.6vh, 6px)' }}
                    >
                        Şifre
                    </label>
                    <div className="relative">
                        <Lock
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                            style={{ width: 'clamp(16px, 4vh, 20px)', height: 'clamp(16px, 4vh, 20px)' }}
                        />
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-11 pr-12 rounded-2xl bg-slate-900/50 border border-white/10 text-white focus:outline-none focus:border-orange-500 focus:shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all font-bold"
                            style={{ height: 'clamp(36px, 6.5vh, 56px)', fontSize: 'clamp(0.85rem, 2.2vh, 1rem)' }}
                            placeholder="••••••••"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 active:text-orange-400 p-1"
                            tabIndex={-1}
                        >
                            {showPassword
                                ? <EyeOff style={{ width: 'clamp(16px, 4vh, 20px)', height: 'clamp(16px, 4vh, 20px)' }} />
                                : <Eye style={{ width: 'clamp(16px, 4vh, 20px)', height: 'clamp(16px, 4vh, 20px)' }} />}
                        </button>
                    </div>
                    <div className="flex justify-end" style={{ marginTop: 'clamp(2px, 0.6vh, 6px)' }}>
                        <Link
                            to="/business/forgot-password"
                            className="text-orange-500 font-bold hover:underline"
                            style={{ fontSize: 'clamp(0.7rem, 1.8vh, 0.8rem)' }}
                        >
                            Şifremi Unuttum
                        </Link>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full text-white rounded-2xl font-display font-bold uppercase tracking-wider active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                    style={{
                        // Müşteri CTA'sıyla aynı premium dil (Login "İşletme Hesabına Geçiş Yap" gradyanı)
                        background: 'linear-gradient(135deg, #ea580c, #9a3412)',
                        boxShadow: '0 10px 26px -10px rgba(234,88,12,0.55), inset 0 1px 0 rgba(255,255,255,0.15)',
                        border: '1px solid rgba(251,146,60,0.25)',
                        height: 'clamp(40px, 7.5vh, 58px)',
                        fontSize: 'clamp(0.85rem, 2.4vh, 1.125rem)',
                    }}
                >
                    {isSubmitting ? (
                        <>
                            <span className="w-5 h-5 flex-shrink-0">
                                <LottiePlayer
                                    src="/animations/rolling-football.json"
                                    loop
                                    autoplay
                                    ariaLabel="Giriş yapılıyor"
                                    style={{ width: '100%', height: '100%' }}
                                    fallback={null}
                                />
                            </span>
                            Giriş Yapılıyor...
                        </>
                    ) : (
                        'Giriş Yap'
                    )}
                </button>

                {/* data-coach-id span'de: halka tam satıra değil METNE sarılır (§106 v2) */}
                <p className="text-slate-400 font-bold text-center" style={{ fontSize: 'clamp(0.8rem, 2.2vh, 0.95rem)', marginTop: 'clamp(4px, 1vh, 10px)' }}>
                    <span data-coach-id="business-register-link" className="inline-block">
                        Hesabın yok mu?{' '}
                        <Link to="/business/register" className="text-orange-500 font-bold hover:underline">
                            İşletme Kaydı Oluştur
                        </Link>
                    </span>
                </p>
            </form>
        </div>
    );
};
