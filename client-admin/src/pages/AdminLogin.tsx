import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../services/adminApi';

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
            navigate('/applications');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Giriş başarısız.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-white italic">DİMLİ</h1>
                    <p className="text-slate-400 text-sm mt-1">Admin Paneli</p>
                </div>

                <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/40 text-red-400 p-3 rounded-xl text-sm font-bold">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-bold uppercase">E-posta</label>
                        <input
                            type="email" required value={email} onChange={e => setEmail(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-bold uppercase">Şifre</label>
                        <input
                            type="password" required value={password} onChange={e => setPassword(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all"
                        />
                    </div>

                    <button
                        type="submit" disabled={loading}
                        className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white py-3 rounded-xl font-black transition-colors"
                    >
                        {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                    </button>
                </form>
            </div>
        </div>
    );
}
