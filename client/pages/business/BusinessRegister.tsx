import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { Briefcase } from 'lucide-react';

export const BusinessRegister: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/auth/business/register', { email, password, fullName, phone });
            // Auto login or redirect to login?
            navigate('/business/login');
        } catch (err) {
            setError('Kayıt başarısız. Lütfen bilgilerinizi kontrol edin.');
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 pt-10 pb-20">
            <div className="w-full max-w-md bg-slate-800 p-8 rounded-3xl border border-orange-500/30 shadow-2xl shadow-orange-900/20">
                <div className="text-center mb-8">
                    <h1 className="font-sport font-black text-3xl text-white italic">İŞLETME KAYDI</h1>
                    <p className="text-slate-400 mt-2">SahaPro Ailesine Katılın</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-sm font-bold text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-orange-100 text-sm font-bold mb-2">Ad Soyad</label>
                        <input
                            className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-orange-500 transition-colors"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-orange-100 text-sm font-bold mb-2">Telefon</label>
                        <input
                            className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-orange-500 transition-colors"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-orange-100 text-sm font-bold mb-2">E-Posta</label>
                        <input
                            className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-orange-500 transition-colors"
                            type="email"
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
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-orange-600 text-white py-4 rounded-xl font-black text-lg uppercase tracking-wider hover:bg-orange-500 transition-colors shadow-lg shadow-orange-600/20 mt-4"
                    >
                        Kayıt Ol
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-slate-400 text-sm">
                        Zaten hesabın var mı?{' '}
                        <Link to="/business/login" className="text-orange-500 font-bold hover:underline">
                            Giriş Yap
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
