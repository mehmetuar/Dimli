import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../../../services/api';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { initializePushNotifications } from '../../../services/pushNotificationService';
import { BusinessForgotPasswordModal } from './BusinessForgotPasswordModal';
import { useAuth } from '../../../contexts/AuthContext';
import { useKeyboardHeight } from '../../../utils/useKeyboardHeight';

type Phase = 'entering' | 'idle' | 'exiting-right';

export const BusinessLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { loginAsBusiness } = useAuth();
    const keyboardHeight = useKeyboardHeight();
    const keyboardOpen = keyboardHeight > 0;

    const [phase, setPhase] = useState<Phase>(() =>
        location.state?.from === 'customer' ? 'entering' : 'idle'
    );

    useEffect(() => {
        if (phase !== 'entering') return;
        const frame = requestAnimationFrame(() =>
            requestAnimationFrame(() => setPhase('idle'))
        );
        return () => cancelAnimationFrame(frame);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await api.post('/auth/business/login', { email, password });
            await loginAsBusiness(response.data.access_token, response.data.ownerId);
            initializePushNotifications();
            navigate('/business/dashboard');
        } catch (err) {
            setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
        }
    };

    const goToCustomer = () => {
        if (phase !== 'idle') return;
        setPhase('exiting-right');
        setTimeout(() => navigate('/login', { state: { from: 'business' } }), 400);
    };

    const animClass =
        phase === 'entering' ? 'animate-flip-enter-from-customer' :
            phase === 'exiting-right' ? 'animate-flip-exit-to-customer' : '';

    return (
        <div
            className="fixed left-0 right-0 w-full bg-gradient-to-b from-slate-800 to-slate-900 overflow-hidden flex flex-col flip-perspective"
            style={{
                top: 'calc(-1 * env(safe-area-inset-top))',
                bottom: 'calc(-1 * env(safe-area-inset-bottom))',
            }}
        >
            <div
                className={`flip-card-3d relative flex-1 w-full min-h-0 flex flex-col overflow-y-auto scrollbar-hide ${animClass}`}
                style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                {/* Header: logo + başlık */}
                <div
                    className="relative flex flex-col items-center justify-start flex-shrink-0 transition-all duration-200"
                    style={{
                        paddingTop: keyboardOpen ? 'max(env(safe-area-inset-top), 50px)' : 'clamp(28px, 7dvh, 56px)',
                        paddingBottom: '0px',
                        maxHeight: keyboardOpen ? '17dvh' : '40dvh',
                        overflow: 'hidden',
                    }}
                >
                    {/* Logo üzerine sol-üst / sağ-üst hafif turuncu spot ışığı */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: 'radial-gradient(circle at top left, rgba(249,115,22,0.14), transparent 55%)',
                            filter: 'blur(20px)',
                        }}
                    />
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: 'radial-gradient(circle at top right, rgba(249,115,22,0.14), transparent 55%)',
                            filter: 'blur(20px)',
                        }}
                    />
                    <img
                        src="/icon.png"
                        alt="DİMLİ"
                        className="relative z-10 object-contain animate-enter-up transition-all duration-200"
                        style={{
                            width: keyboardOpen ? 'clamp(40px, 11vw, 56px)' : 'clamp(60px, 16vw, 90px)',
                            height: 'auto',
                        }}
                    />
                    <h1
                        className="relative z-10 font-sport font-black text-white italic animate-enter-up transition-all duration-200"
                        style={{
                            fontSize: keyboardOpen ? 'clamp(1rem, 4.5vw, 1.4rem)' : 'clamp(1.5rem, 8vw, 2.25rem)',
                            marginTop: 'clamp(4px, 1dvh, 12px)',
                        }}
                    >
                        İŞLETME PANELİ
                    </h1>
                    {!keyboardOpen && (
                        <p
                            className="relative z-10 text-slate-400 animate-enter-up transition-all duration-200"
                            style={{ fontSize: 'clamp(0.7rem, 2.5vw, 0.875rem)', marginTop: '4px' }}
                        >
                            DİMLİ Business
                        </p>
                    )}
                </div>

                {/* Form */}
                <div
                    className="flex-1 flex flex-col justify-start min-h-0 animate-enter-up [animation-delay:240ms] transition-all duration-200"
                    style={{
                        padding: '0 clamp(16px, 5vw, 32px)',
                        paddingTop: keyboardOpen ? '0px' : 'clamp(4px, 1.5dvh, 16px)',
                        gap: keyboardOpen ? 'clamp(2px, 1dvh, 8px)' : 'clamp(4px, 1.8dvh, 18px)',
                    }}
                >
                    {error && (
                        <div
                            className="bg-red-500/10 border border-red-500/50 text-red-400 rounded-xl text-center font-bold"
                            style={{ padding: 'clamp(8px, 1.5dvh, 12px)', fontSize: 'clamp(0.75rem, 2dvh, 0.875rem)' }}
                        >
                            {error}
                        </div>
                    )}

                    <form
                        onSubmit={handleLogin}
                        className="flex flex-col transition-all duration-200"
                        style={{ gap: keyboardOpen ? 'clamp(2px, 1dvh, 8px)' : 'clamp(4px, 1.8dvh, 18px)' }}
                    >
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-slate-400 font-bold"
                                style={{ fontSize: 'clamp(0.6rem, 1.6dvh, 0.8rem)', marginBottom: 'clamp(2px, 0.6dvh, 6px)' }}
                            >
                                E-Posta Adresi
                            </label>
                            <div className="relative">
                                <Mail
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                                    style={{ width: 'clamp(16px, 4dvh, 20px)', height: 'clamp(16px, 4dvh, 20px)' }}
                                />
                                <input
                                    className="w-full pl-11 pr-4 rounded-2xl bg-slate-800/40 border border-slate-700/80 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors font-bold"
                                    style={{ height: 'clamp(36px, 6.5dvh, 56px)', fontSize: 'clamp(0.85rem, 2.2dvh, 1rem)' }}
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
                                style={{ fontSize: 'clamp(0.6rem, 1.6dvh, 0.8rem)', marginBottom: 'clamp(2px, 0.6dvh, 6px)' }}
                            >
                                Şifre
                            </label>
                            <div className="relative">
                                <Lock
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                                    style={{ width: 'clamp(16px, 4dvh, 20px)', height: 'clamp(16px, 4dvh, 20px)' }}
                                />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-12 rounded-2xl bg-slate-800/40 border border-slate-700/80 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors font-bold"
                                    style={{ height: 'clamp(36px, 6.5dvh, 56px)', fontSize: 'clamp(0.85rem, 2.2dvh, 1rem)' }}
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
                                        ? <EyeOff style={{ width: 'clamp(16px, 4dvh, 20px)', height: 'clamp(16px, 4dvh, 20px)' }} />
                                        : <Eye style={{ width: 'clamp(16px, 4dvh, 20px)', height: 'clamp(16px, 4dvh, 20px)' }} />}
                                </button>
                            </div>
                            <div className="flex justify-end" style={{ marginTop: 'clamp(2px, 0.6dvh, 6px)' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsForgotModalOpen(true)}
                                    className="text-orange-500 font-bold hover:underline"
                                    style={{ fontSize: 'clamp(0.7rem, 1.8dvh, 0.8rem)' }}
                                >
                                    Şifremi Unuttum
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-orange-600 text-white rounded-2xl font-display font-bold uppercase tracking-wider shadow-lg shadow-black/30 border border-orange-400/15 active:bg-orange-700 active:scale-[0.97] transition-all"
                            style={{ height: 'clamp(40px, 7.5dvh, 58px)', fontSize: 'clamp(0.85rem, 2.4dvh, 1.125rem)' }}
                        >
                            Giriş Yap
                        </button>

                        <p className="text-slate-400 font-bold text-center" style={{ fontSize: 'clamp(0.8rem, 2.2dvh, 0.95rem)', marginTop: 'clamp(4px, 1dvh, 10px)' }}>
                            Hesabın yok mu?{' '}
                            <Link to="/business/register" className="text-orange-500 font-bold hover:underline">
                                İşletme Kaydı Oluştur
                            </Link>
                        </p>
                    </form>
                </div>

                {/* Footer: Oyuncu Girişine Dön butonu */}
                <div
                    className="relative flex-shrink-0 transition-all duration-200"
                    style={{
                        padding: keyboardOpen
                            ? '0 clamp(16px, 5vw, 32px) clamp(10px, 1.5dvh, 16px)'
                            : '0 clamp(16px, 5vw, 32px) clamp(20px, 3.5dvh, 32px)',
                    }}
                >
                    <button
                        type="button"
                        onClick={goToCustomer}
                        className="block w-full rounded-2xl text-center font-bold tracking-wide text-white shadow-lg active:scale-[0.98] transition-all"
                        style={{
                            background: '#475569',
                            boxShadow: '0 8px 20px -6px rgba(71,85,105,0.45)',
                            WebkitTapHighlightColor: 'transparent',
                            height: keyboardOpen ? 'clamp(36px, 5.5dvh, 48px)' : 'clamp(44px, 7dvh, 58px)',
                            fontSize: keyboardOpen ? 'clamp(0.7rem, 1.8dvh, 0.8rem)' : 'clamp(0.8rem, 2.2dvh, 0.95rem)',
                        }}
                    >
                        Oyuncu Girişine Dön
                    </button>
                </div>
            </div>

            <BusinessForgotPasswordModal
                isOpen={isForgotModalOpen}
                onClose={() => setIsForgotModalOpen(false)}
            />
        </div>
    );
};
