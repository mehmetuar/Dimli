import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../../services/api';
import { Briefcase } from 'lucide-react';
import { initializePushNotifications } from '../../../services/pushNotificationService';
import { BusinessForgotPasswordModal } from './BusinessForgotPasswordModal';
import { useAuth } from '../../../contexts/AuthContext';

export const BusinessLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
    const navigate = useNavigate();
    const { loginAsBusiness } = useAuth();

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

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 pt-20 pb-28">
            <div className="w-full max-w-md bg-slate-800 p-8 rounded-3xl border border-orange-500/30 shadow-2xl shadow-orange-900/20">
                <div className="text-center mb-8">
                    <img src="/icon.png" alt="DİMLİ" className="h-14 w-auto object-contain mx-auto mb-3" />
                    <h1 className="font-sport font-black text-4xl text-white italic">İŞLETME PANELİ</h1>
                    <p className="text-slate-400 mt-2">DİMLİ Business</p>
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
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-900/50 text-white p-4 rounded-xl border border-slate-700 focus:border-orange-500 focus:outline-none font-bold"
                            placeholder="••••••••"
                            required
                        />
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

                    <Link
                        to="/login"
                        className="inline-block px-6 py-2 bg-slate-700/50 text-slate-400 border border-slate-600 rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors"
                    >
                        Oyuncu Girişine Dön
                    </Link>
                </div>
            </div>

            <BusinessForgotPasswordModal 
                isOpen={isForgotModalOpen} 
                onClose={() => setIsForgotModalOpen(false)} 
            />
        </div>
    );
};
