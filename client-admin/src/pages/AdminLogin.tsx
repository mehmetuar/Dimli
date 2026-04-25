import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../services/adminApi';
import { DimliLogo } from '../components/Icons';

export default function AdminLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await adminApi.post('/admin/auth/login', { email, password });
            localStorage.setItem('admin_token', res.data.access_token);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Giriş başarısız.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#101828] via-[#17213a] to-[#101828]">
            <div className="w-full max-w-sm">
                {/* Brand block */}
                <div className="text-center mb-8">
                    <div className="flex flex-col items-center gap-3 mb-2">
                        <DimliLogo size={72} className="drop-shadow-[0_0_18px_rgba(74,222,128,0.25)]" />
                        <div>
                            <p className="text-orange-400/80 text-xs font-bold uppercase tracking-[0.2em]">Admin Paneli</p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleLogin}
                    className="bg-[#1e2d47] border border-slate-700/60 rounded-2xl p-8 space-y-4 shadow-2xl shadow-black/60"
                >
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/40 text-red-300 p-3 rounded-xl text-sm font-bold">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs text-slate-300 font-bold uppercase tracking-wider">E-posta</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-[#253352] border border-slate-600/60 text-white p-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all placeholder-slate-500"
                            placeholder="admin@dimli.com"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs text-slate-300 font-bold uppercase tracking-wider">Şifre</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-[#253352] border border-slate-600/60 text-white p-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white py-3 rounded-xl font-black transition-colors mt-2 shadow-lg shadow-orange-900/30"
                    >
                        {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                    </button>
                </form>

                <p className="text-center text-slate-500 text-xs mt-5">
                    Sporcu sahaları yönetim paneli
                </p>
            </div>
        </div>
    );
}
