import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import api from '../../../services/api';
import { initializePushNotifications } from '../../../services/pushNotificationService';
import { useAuth } from '../../../contexts/AuthContext';

type Phase = 'entering' | 'idle' | 'exiting-left';

export const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const { token, loginAsCustomer } = useAuth();

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
        try {
            const response = await api.post('/auth/login', { username, password });
            await loginAsCustomer(response.data.access_token);
            navigate('/');
            setTimeout(() => initializePushNotifications(), 2000);
        } catch (err: any) {
            setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
        }
    };

    const goToBusiness = () => {
        if (phase !== 'idle') return;
        setPhase('exiting-left');
        setTimeout(() => navigate('/business/login', { state: { from: 'customer' } }), 280);
    };

    const animClass =
        phase === 'entering' ? 'animate-slide-enter-left' :
        phase === 'exiting-left' ? 'animate-slide-exit-left' : '';

    return (
        <div className={`min-h-screen bg-pitch flex flex-col items-center justify-start px-4 pt-16 pb-16 ${animClass}`}>
            <div className="w-full max-w-md bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl">
                <div className="text-center mb-8">
                    <img src="/dimli.png" alt="DİMLİ" className="h-24 w-auto object-contain mx-auto mb-4 rounded-2xl" />
                    <h1 className="font-sport font-black text-4xl text-white italic">GİRİŞ YAP</h1>
                    <p className="text-slate-400 mt-2">Sahalara geri dön kaptan.</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-sm font-bold text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-turf-100 text-sm font-bold mb-2" htmlFor="username">
                            Kullanıcı Adı
                        </label>
                        <input
                            className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-turf-500 focus:ring-1 focus:ring-turf-500 transition-colors"
                            id="username"
                            type="text"
                            placeholder="Kullanıcı adınız"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Şifre</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-900 text-white p-4 pr-12 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 active:text-slate-300 p-1"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-turf-600 text-white py-4 rounded-xl font-black text-lg uppercase tracking-wider hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20 mt-4"
                    >
                        Giriş Yap
                    </button>

                    <div className="text-center mt-3">
                        <Link to="/forgot-password" className="text-slate-400 text-sm hover:text-turf-400 font-bold transition-colors">
                            Şifremi Unuttum
                        </Link>
                    </div>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-slate-400 text-sm mb-4">
                        Hesabın yok mu?{' '}
                        <Link to="/register" className="text-turf-500 font-bold hover:underline">
                            Kayıt Ol
                        </Link>
                    </p>

                    <button
                        type="button"
                        onClick={goToBusiness}
                        className="block w-full py-3.5 rounded-xl text-center text-sm font-bold tracking-wide transition-all active:scale-[0.98]"
                        style={{
                            background: 'rgba(249,115,22,0.07)',
                            border: '1px solid rgba(249,115,22,0.25)',
                            color: 'rgba(251,146,60,0.85)',
                            WebkitTapHighlightColor: 'transparent',
                        }}
                    >
                        İşletme Hesabına Geçiş Yap
                    </button>
                </div>
            </div>
        </div>
    );
};
