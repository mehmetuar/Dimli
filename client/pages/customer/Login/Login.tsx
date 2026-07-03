import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff, User, Lock } from 'lucide-react';
import api from '../../../services/api';
import { initializePushNotifications } from '../../../services/pushNotificationService';
import { useAuth } from '../../../contexts/AuthContext';
import { useKeyboardHeight } from '../../../utils/useKeyboardHeight';
import { LottiePlayer } from '../../../components/UI/LottiePlayer';

type Phase = 'entering' | 'idle' | 'exiting-left';

export const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    // Art arda aynı hata gelse de shake yeniden oynasın diye key olarak kullanılır
    const [errorNonce, setErrorNonce] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { token, loginAsCustomer } = useAuth();
    const keyboardHeight = useKeyboardHeight();
    const keyboardOpen = keyboardHeight > 0;

    const [phase, setPhase] = useState<Phase>(() =>
        location.state?.from === 'business' ? 'entering' : 'idle'
    );

    useEffect(() => {
        if (phase !== 'entering') return;
        const frame = requestAnimationFrame(() =>
            requestAnimationFrame(() => setPhase('idle'))
        );
        return () => cancelAnimationFrame(frame);
    }, []);

    if (token && !location.state?.sessionExpired) {
        return <Navigate to="/" replace />;
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return; // çift-gönderim koruması
        setError('');
        setIsSubmitting(true);
        try {
            const response = await api.post('/auth/login', { username, password });
            await loginAsCustomer(response.data.access_token);
            navigate('/');
            setTimeout(() => initializePushNotifications(), 2000);
            // başarıda navigate ile unmount → isSubmitting sıfırlanmaz (buton loader'da kalır)
        } catch (err: any) {
            setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
            setErrorNonce(n => n + 1);
            setIsSubmitting(false);
        }
    };

    const goToBusiness = () => {
        if (phase !== 'idle') return;
        setPhase('exiting-left');
        setTimeout(() => navigate('/business/login', { state: { from: 'customer' } }), 400);
    };

    const animClass =
        phase === 'entering' ? 'animate-flip-enter-from-business' :
        phase === 'exiting-left' ? 'animate-flip-exit-to-business' : '';

    return (
        <div
            className="fixed left-0 right-0 w-full bg-gradient-to-b from-pitch-surface to-pitch overflow-hidden flex flex-col flip-perspective"
            style={{
                top: 'calc(-1 * env(safe-area-inset-top))',
                bottom: 'calc(-1 * env(safe-area-inset-bottom))',
            }}
        >
            <div
                className={`flip-card-3d relative flex-1 w-full min-h-0 flex flex-col overflow-y-auto scrollbar-hide ${animClass}`}
                style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                {/* Header: logo */}
                <div
                    className="relative flex flex-col items-center justify-start flex-shrink-0 transition-all duration-200"
                    style={{
                        paddingTop: keyboardOpen ? 'max(env(safe-area-inset-top), 50px)' : 'clamp(28px, 7vh, 56px)',
                        paddingBottom: '0px',
                        maxHeight: keyboardOpen ? '17vh' : '40vh',
                        overflow: 'hidden',
                    }}
                >
                    {/* Logo üzerine sol-üst / sağ-üst hafif beyaz spot ışığı */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: 'radial-gradient(circle at top left, rgba(255,255,255,0.14), transparent 55%)',
                            filter: 'blur(20px)',
                        }}
                    />
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: 'radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 55%)',
                            filter: 'blur(20px)',
                        }}
                    />
                    <img
                        src="/dimliLogin.png"
                        alt="DİMLİ"
                        className="relative z-10 object-contain animate-enter-up transition-all duration-200"
                        style={{
                            width: keyboardOpen ? 'clamp(125px, 34vw, 190px)' : 'clamp(230px, 75vw, 440px)',
                            height: 'auto',
                            filter: 'drop-shadow(0 4px 18px rgba(34,197,94,0.22))',
                        }}
                    />
                </div>

                {/* Form */}
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
                            key={errorNonce}
                            className="bg-red-500/10 border border-red-500/50 text-red-400 rounded-xl text-center font-bold animate-shake"
                            style={{ padding: 'clamp(8px, 1.5vh, 12px)', fontSize: 'clamp(0.75rem, 2vh, 0.875rem)' }}
                        >
                            {error}
                        </div>
                    )}

                    <form
                        onSubmit={handleLogin}
                        className="flex flex-col transition-all duration-200"
                        style={{ gap: keyboardOpen ? 'clamp(2px, 1vh, 8px)' : 'clamp(4px, 1.8vh, 18px)' }}
                    >
                        <div>
                            <label
                                htmlFor="username"
                                className="block text-slate-400 font-bold"
                                style={{ fontSize: 'clamp(0.6rem, 1.6vh, 0.8rem)', marginBottom: 'clamp(2px, 0.6vh, 6px)' }}
                            >
                                Kullanıcı Adı:
                            </label>
                            <div className="relative">
                                <User
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                                    style={{ width: 'clamp(16px, 4vh, 20px)', height: 'clamp(16px, 4vh, 20px)' }}
                                />
                                <input
                                    className="w-full pl-11 pr-4 rounded-2xl bg-slate-800/40 border border-slate-700/80 text-white focus:outline-none focus:border-turf-500 focus:shadow-neon-sm transition-colors font-bold"
                                    style={{ height: 'clamp(36px, 6.5vh, 56px)', fontSize: 'clamp(0.85rem, 2.2vh, 1rem)' }}
                                    id="username"
                                    type="text"
                                    placeholder="Kullanıcı adınız"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    autoComplete="username"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
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
                                Şifre:
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
                                    autoComplete="current-password"
                                    className="w-full pl-11 pr-12 rounded-2xl bg-slate-800/40 border border-slate-700/80 text-white focus:outline-none focus:border-turf-500 focus:shadow-neon-sm transition-colors font-bold"
                                    style={{ height: 'clamp(36px, 6.5vh, 56px)', fontSize: 'clamp(0.85rem, 2.2vh, 1rem)' }}
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 active:text-slate-300 p-1"
                                    tabIndex={-1}
                                >
                                    {showPassword
                                        ? <EyeOff style={{ width: 'clamp(16px, 4vh, 20px)', height: 'clamp(16px, 4vh, 20px)' }} />
                                        : <Eye style={{ width: 'clamp(16px, 4vh, 20px)', height: 'clamp(16px, 4vh, 20px)' }} />}
                                </button>
                            </div>
                            <div className="flex justify-end" style={{ marginTop: 'clamp(2px, 0.6vh, 6px)' }}>
                                <Link
                                    to="/forgot-password"
                                    className="text-slate-400 font-bold hover:text-turf-400 transition-colors py-2 -my-2 px-1 -mx-1"
                                    style={{ fontSize: 'clamp(0.7rem, 1.8vh, 0.8rem)' }}
                                >
                                    Şifremi Unuttum
                                </Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-turf-600 text-white rounded-2xl font-display font-bold uppercase tracking-wider shadow-lg shadow-black/30 border border-turf-400/15 active:bg-turf-700 active:scale-[0.97] transition-all disabled:opacity-80 disabled:active:scale-100 flex items-center justify-center gap-2"
                            style={{ height: 'clamp(40px, 7.5vh, 58px)', fontSize: 'clamp(0.85rem, 2.4vh, 1.125rem)' }}
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

                        <p className="text-slate-400 font-bold text-center" style={{ fontSize: 'clamp(0.8rem, 2.2vh, 0.95rem)', marginTop: 'clamp(4px, 1vh, 10px)' }}>
                            Hesabın yok mu?{' '}
                            <Link to="/register" className="text-turf-500 font-bold hover:underline">
                                Kayıt Ol
                            </Link>
                        </p>
                    </form>
                </div>

                {/* Footer: İşletme Hesabına Geçiş Yap butonu */}
                <div
                    className="relative flex-shrink-0 transition-all duration-200"
                    style={{
                        padding: keyboardOpen
                            ? '0 clamp(16px, 5vw, 32px) clamp(10px, 1.5vh, 16px)'
                            : '0 clamp(16px, 5vw, 32px) clamp(20px, 3.5vh, 32px)',
                    }}
                >
                    <button
                        type="button"
                        onClick={goToBusiness}
                        className="block w-full rounded-2xl text-center font-bold tracking-wide text-white shadow-lg active:scale-[0.98] transition-all"
                        style={{
                            background: 'linear-gradient(135deg, #c2410c, #9a3412)',
                            boxShadow: '0 8px 20px -8px rgba(154,52,18,0.45)',
                            WebkitTapHighlightColor: 'transparent',
                            height: keyboardOpen ? 'clamp(36px, 5.5vh, 48px)' : 'clamp(44px, 7vh, 58px)',
                            fontSize: keyboardOpen ? 'clamp(0.7rem, 1.8vh, 0.8rem)' : 'clamp(0.8rem, 2.2vh, 0.95rem)',
                        }}
                    >
                        İşletme Hesabına Geçiş Yap
                    </button>
                </div>
            </div>
        </div>
    );
};
