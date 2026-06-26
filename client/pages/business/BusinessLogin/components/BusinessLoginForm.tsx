import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

interface BusinessLoginFormProps {
    email: string;
    setEmail: (value: string) => void;
    password: string;
    setPassword: (value: string) => void;
    showPassword: boolean;
    setShowPassword: (updater: (prev: boolean) => boolean) => void;
    error: string;
    keyboardOpen: boolean;
    onSubmit: (e: React.FormEvent) => void;
    onForgotPassword: () => void;
}

export const BusinessLoginForm: React.FC<BusinessLoginFormProps> = ({
    email, setEmail,
    password, setPassword,
    showPassword, setShowPassword,
    error,
    keyboardOpen,
    onSubmit,
    onForgotPassword,
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
                            className="w-full pl-11 pr-4 rounded-2xl bg-slate-800/40 border border-slate-700/80 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors font-bold"
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
                            className="w-full pl-11 pr-12 rounded-2xl bg-slate-800/40 border border-slate-700/80 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors font-bold"
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
                        <button
                            type="button"
                            onClick={onForgotPassword}
                            className="text-orange-500 font-bold hover:underline"
                            style={{ fontSize: 'clamp(0.7rem, 1.8vh, 0.8rem)' }}
                        >
                            Şifremi Unuttum
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full bg-orange-600 text-white rounded-2xl font-display font-bold uppercase tracking-wider shadow-lg shadow-black/30 border border-orange-400/15 active:bg-orange-700 active:scale-[0.97] transition-all"
                    style={{ height: 'clamp(40px, 7.5vh, 58px)', fontSize: 'clamp(0.85rem, 2.4vh, 1.125rem)' }}
                >
                    Giriş Yap
                </button>

                <p className="text-slate-400 font-bold text-center" style={{ fontSize: 'clamp(0.8rem, 2.2vh, 0.95rem)', marginTop: 'clamp(4px, 1vh, 10px)' }}>
                    Hesabın yok mu?{' '}
                    <Link to="/business/register" className="text-orange-500 font-bold hover:underline">
                        İşletme Kaydı Oluştur
                    </Link>
                </p>
            </form>
        </div>
    );
};
