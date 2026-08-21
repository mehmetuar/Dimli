import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Eye, EyeOff, User, Lock } from 'lucide-react';
import api from '../../../services/api';
import { initializePushNotifications } from '../../../services/pushNotificationService';
import { useAuth } from '../../../contexts/AuthContext';
import { useLocationContext } from '../../../contexts/LocationContext';
import { useKeyboardHeight } from '../../../utils/useKeyboardHeight';
import { sanitizeUsernameInput } from '../../../utils/username';
import { CUSTOMER_HOME } from '../../../constants/routes';
import { useBootSplashDone } from '../../../services/bootSplashStore';
import { isCoachDone } from '../../../services/coachStorage';
import { LottiePlayer } from '../../../components/UI/LottiePlayer';
import { PitchCenterCircle } from '../../../components/UI/PitchCenterCircle';
import { PitchGoalArea } from '../../../components/UI/PitchGoalArea';
import { LoginCoach } from './components/LoginCoach';

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
    const { requestLocation } = useLocationContext();
    const keyboardHeight = useKeyboardHeight();
    const keyboardOpen = keyboardHeight > 0;
    // Soğuk açılışta splash perdesi solmaya başlayana kadar içerik mount edilmez → giriş
    // koreografisi (saha çizgileri + enter-up) kullanıcı görürken başlar. Oturum-içi
    // gezinmelerde (business→customer flip) splash çoktan bitmiştir, bekletme olmaz.
    const splashDone = useBootSplashDone();
    // Android (MIUI vb.) ekranları CSS'te daha kısa + vh fazla raporlanır → üst bölgeyi
    // (logo + üst boşluk) kompaktla, alt boşluk açılsın. iOS referans görünüm korunur.
    const isAndroid = Capacitor.getPlatform() === 'android';

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

    // Konum izni istemi: boot'ta değil, splash bittikten SONRA login ekranı yerleşince gösterilir
    // (agent.md §67). Yalnız oturumsuz kullanıcıda ve BİR KEZ; kısa gecikme giriş koreografisinin
    // (logo/form enter-up) oturmasını bekler → dialog sakin bir ekranda belirir.
    // Yönlendirme katmanı (coach, §106) izin diyaloğu KAPANDIKTAN sonra açılır —
    // requestLocation awaitable + içeride zaman aşımı sigortalı, asla asılı kalmaz.
    const [showCoach, setShowCoach] = useState(false);
    const locationAskedRef = useRef(false);
    useEffect(() => {
        if (!splashDone || token || locationAskedRef.current) return;
        locationAskedRef.current = true;
        let cancelled = false;
        let coachTimer: ReturnType<typeof setTimeout> | undefined;
        const timer = setTimeout(() => {
            void requestLocation(true).finally(() => {
                if (cancelled || isCoachDone('login') || location.state?.sessionExpired) return;
                coachTimer = setTimeout(() => {
                    // Kullanıcı bu arada forma odaklandıysa (klavye açık) araya girme
                    const ae = document.activeElement;
                    if (cancelled || ae instanceof HTMLInputElement || ae instanceof HTMLTextAreaElement) return;
                    setShowCoach(true);
                }, 500);
            });
        }, 800);
        return () => {
            cancelled = true;
            clearTimeout(timer);
            if (coachTimer) clearTimeout(coachTimer);
        };
    }, [splashDone, token, requestLocation]);

    if (token && !location.state?.sessionExpired) {
        return <Navigate to={CUSTOMER_HOME} replace />;
    }

    // Splash sürerken yalnız zemin degradesi render edilir (perde arkasında görünmez);
    // splashDone flip'inde tam içerik mount olur ve tüm giriş animasyonları o anda oynar.
    if (!splashDone) {
        return (
            <div
                className="fixed left-0 right-0 w-full overflow-hidden"
                style={{
                    top: 'calc(-1 * env(safe-area-inset-top))',
                    bottom: 'calc(-1 * env(safe-area-inset-bottom))',
                    background: 'radial-gradient(125% 78% at 50% 24%, #16402f 0%, #0d2419 44%, #061710 78%, #040f0a 100%)',
                }}
            />
        );
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return; // çift-gönderim koruması
        setError('');
        setIsSubmitting(true);
        try {
            const response = await api.post('/auth/login', { username, password });
            await loginAsCustomer(response.data.access_token);
            navigate(CUSTOMER_HOME);
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
            className="fixed left-0 right-0 w-full overflow-hidden flex flex-col flip-perspective"
            style={{
                top: 'calc(-1 * env(safe-area-inset-top))',
                bottom: 'calc(-1 * env(safe-area-inset-bottom))',
                // Gece halısahası: üst-merkezde floodlight, kenarlarda vignette
                background: 'radial-gradient(125% 78% at 50% 24%, #16402f 0%, #0d2419 44%, #061710 78%, #040f0a 100%)',
            }}
        >
            {/* Çim biçme şeritleri (halısaha dokusu) — çok düşük opak, göz yormaz */}
            <div
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.018) 0 9%, transparent 9% 18%)',
                }}
            />

            <div
                className={`flip-card-3d relative flex-1 w-full min-h-0 flex flex-col overflow-y-auto scrollbar-hide ${animClass}`}
                style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'var(--safe-bottom)' }}
            >
                {/* Header: orta saha çemberi içinde logo */}
                <div
                    className="relative z-10 flex flex-col items-center justify-start flex-shrink-0 transition-all duration-200"
                    style={{
                        paddingTop: keyboardOpen
                            ? 'max(env(safe-area-inset-top), 50px)'
                            : (isAndroid ? 'clamp(16px, 6vh, 52px)' : 'clamp(24px, 12vh, 96px)'),
                        paddingBottom: isAndroid ? 'clamp(6px, 1.4vh, 14px)' : 'clamp(8px, 2vh, 20px)',
                        maxHeight: keyboardOpen ? '20vh' : '46vh',
                    }}
                >
                    {/* Logo + orta saha çemberi/çizgisi (çember logoya çapalı → her cihazda ortalı).
                        data-coach-anchor: yönlendirme kartları (§106) bu kutunun altına yerleşir */}
                    <div
                        data-coach-anchor
                        className="relative flex items-center justify-center transition-all duration-200"
                        style={{ width: keyboardOpen ? 'clamp(92px, 23.5vw, 132px)' : (isAndroid ? 'clamp(120px, 48vw, 210px)' : 'clamp(140px, min(54vw, 30vh), 258px)') }}
                    >
                        <PitchCenterCircle keyboardOpen={keyboardOpen} />
                        <img
                            src="/icon.png"
                            alt="DİMLİ"
                            className="relative z-10 w-full h-auto object-contain animate-enter-up transition-all duration-200"
                            style={{
                                filter: 'drop-shadow(0 0 22px rgba(74,222,128,0.35))',
                                animationDelay: '300ms',
                                // icon'un sol-alt uzantısını dengelemek için çok milimetrik sağ-üst kaydırma
                                // (relative offset — enter-up transform'uyla çakışmaz)
                                left: '1%',
                                top: '-1.3%',
                            }}
                        />
                    </div>
                </div>

                {/* Form */}
                <div
                    className="relative z-10 flex-1 flex flex-col justify-start min-h-0 animate-enter-up [animation-delay:360ms] transition-all duration-200"
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
                            <div className="relative group">
                                <User
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none transition-colors group-focus-within:text-turf-400"
                                    style={{ width: 'clamp(16px, 4vh, 20px)', height: 'clamp(16px, 4vh, 20px)' }}
                                />
                                <input
                                    className="w-full pl-11 pr-4 rounded-2xl bg-slate-900/50 border border-white/10 text-white focus:outline-none focus:border-turf-500 focus:shadow-neon-sm transition-all font-bold"
                                    style={{ height: 'clamp(36px, 6.5vh, 56px)', fontSize: 'clamp(0.85rem, 2.2vh, 1rem)' }}
                                    id="username"
                                    type="text"
                                    placeholder="Kullanıcı adınız"
                                    value={username}
                                    onChange={(e) => setUsername(sanitizeUsernameInput(e.target.value))}
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
                            <div className="relative group">
                                <Lock
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none transition-colors group-focus-within:text-turf-400"
                                    style={{ width: 'clamp(16px, 4vh, 20px)', height: 'clamp(16px, 4vh, 20px)' }}
                                />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    className="w-full pl-11 pr-12 rounded-2xl bg-slate-900/50 border border-white/10 text-white focus:outline-none focus:border-turf-500 focus:shadow-neon-sm transition-all font-bold"
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
                            style={{
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

                        {/* data-coach-id span'de: halka tam satıra değil METNE sarılır (§106 v2 —
                            yanlarda renkli yolların geçeceği koridor açık kalır) */}
                        <p className="text-slate-400 font-bold text-center" style={{ fontSize: 'clamp(0.8rem, 2.2vh, 0.95rem)', marginTop: 'clamp(4px, 1vh, 10px)' }}>
                            <span data-coach-id="register-link" className="inline-block">
                                Hesabın yok mu?{' '}
                                <Link to="/register" className="text-turf-500 font-bold hover:underline">
                                    Kayıt Ol
                                </Link>
                            </span>
                        </p>
                    </form>
                </div>

                {/* Footer: alt ceza sahası içinde "İşletme Hesabına Geçiş Yap" butonu.
                    Kutu akışta REZERVE edilir (minHeight = kutu yüksekliği) + buton en alta (justify-end).
                    pointer-events-none: rezerve footer'ın boş üst bandı, üstüne denk gelen "Kayıt Ol"un
                    tıklamasını YUTMASIN (klavye kapalıyken tıklama alttaki linke geçer). Buton kendi
                    pointer-events-auto'suyla tıklanabilir kalır; ceza sahası zaten pointer-events-none. */}
                <div
                    className="relative z-10 flex-shrink-0 flex flex-col justify-end pointer-events-none animate-enter-up [animation-delay:440ms] transition-all duration-200"
                    style={{
                        minHeight: keyboardOpen ? undefined : 'clamp(140px, 26vh, 235px)',
                        padding: keyboardOpen
                            ? '0 clamp(16px, 5vw, 32px) clamp(10px, 1.5vh, 16px)'
                            : '0 clamp(16px, 5vw, 32px) clamp(20px, 3.5vh, 32px)',
                    }}
                >
                    {/* Ceza sahası çizgileri (butonun arkasında, butonu içine alır) */}
                    <PitchGoalArea keyboardOpen={keyboardOpen} />

                    <button
                        type="button"
                        data-coach-id="business-switch"
                        onClick={goToBusiness}
                        className="relative z-10 block w-full rounded-2xl text-center font-bold tracking-wide text-white active:scale-[0.98] transition-all pointer-events-auto"
                        style={{
                            background: 'linear-gradient(135deg, #ea580c, #9a3412)',
                            boxShadow: '0 10px 26px -10px rgba(234,88,12,0.55), inset 0 1px 0 rgba(255,255,255,0.15)',
                            border: '1px solid rgba(251,146,60,0.25)',
                            WebkitTapHighlightColor: 'transparent',
                            height: keyboardOpen ? 'clamp(36px, 5.5vh, 48px)' : 'clamp(44px, 7vh, 58px)',
                            fontSize: keyboardOpen ? 'clamp(0.7rem, 1.8vh, 0.8rem)' : 'clamp(0.8rem, 2.2vh, 0.95rem)',
                        }}
                    >
                        İşletme Hesabına Geçiş Yap
                    </button>
                </div>
            </div>

            {/* İlk açılış yönlendirme katmanı (§106) — izin diyaloğu sonrası, aksiyona kadar */}
            {showCoach && <LoginCoach onClose={() => setShowCoach(false)} />}
        </div>
    );
};
