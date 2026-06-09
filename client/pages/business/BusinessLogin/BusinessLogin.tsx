import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../../../services/api';
import { Briefcase, Eye, EyeOff } from 'lucide-react';
import { initializePushNotifications } from '../../../services/pushNotificationService';
import { BusinessForgotPasswordModal } from './BusinessForgotPasswordModal';
import { useAuth } from '../../../contexts/AuthContext';

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
        setTimeout(() => navigate('/login', { state: { from: 'business' } }), 280);
    };

    const animClass =
        phase === 'entering' ? 'animate-slide-enter-right' :
        phase === 'exiting-right' ? 'animate-slide-exit-right' : '';

    return (
        <div className={`min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 pt-10 pb-10 ${animClass}`} style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top))' }}>
            <div className="w-full max-w-md bg-slate-800 rounded-3xl border border-orange-500/30 shadow-2xl shadow-orange-900/20" style={{ padding: 'clamp(1.25rem, 5vw, 2rem)' }}>
                <div className="text-center mb-6">
                    <img src="/icon.png" alt="DİMLİ" className="h-12 w-auto object-contain mx-auto mb-3" />
                    <h1 className="font-sport font-black text-white italic" style={{ fontSize: 'clamp(1.5rem, 8vw, 2.25rem)' }}>İŞLETME PANELİ</h1>
                    <p className="text-slate-400 mt-1" style={{ fontSize: 'clamp(0.75rem, 3vw, 0.875rem)' }}>DİMLİ Business</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-sm font-bold text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-orange-100 text-sm font-bold mb-2" htmlFor="email">
                            E-Posta Adresi
                        </label>
                        <input
                            className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                            id="email"
                            type="email"
                            placeholder="ornek@saha.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                                className="w-full bg-slate-900/50 text-white p-4 pr-12 rounded-xl border border-slate-700 focus:border-orange-500 focus:outline-none font-bold"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 active:text-orange-400 p-1"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        <div className="flex justify-end mt-2">
                            <button
                                type="button"
                                onClick={() => setIsForgotModalOpen(true)}
                                className="text-orange-500 text-sm font-bold hover:underline focus:outline-none"
                            >
                                Şifremi Unuttum
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-orange-600 text-white py-4 rounded-xl font-black text-lg uppercase tracking-wider hover:bg-orange-500 transition-colors shadow-lg shadow-orange-600/20 mt-4"
                    >
                        Giriş Yap
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-slate-400 text-sm mb-4">
                        Hesabın yok mu?{' '}
                        <Link to="/business/register" className="text-orange-500 font-bold hover:underline">
                            İşletme Kaydı Oluştur
                        </Link>
                    </p>

                    <button
                        type="button"
                        onClick={goToCustomer}
                        className="inline-block px-6 py-2 bg-slate-700/50 text-slate-400 border border-slate-600 rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
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
