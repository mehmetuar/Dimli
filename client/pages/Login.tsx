import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Trophy } from 'lucide-react';

export const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await api.post('/auth/login', { username, password });
            localStorage.setItem('token', response.data.access_token);
            navigate('/'); // Redirect to home (Marketplace) after login
        } catch (err) {
            setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-pitch flex flex-col items-center justify-center px-4 pt-20 pb-28">
            <div className="w-full max-w-md bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="inline-block bg-turf-600 p-3 rounded-xl skew-x-[-12deg] mb-4">
                        <Trophy className="w-8 h-8 text-white skew-x-[12deg]" />
                    </div>
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
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-turf-600 text-white py-4 rounded-xl font-black text-lg uppercase tracking-wider hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20 mt-4"
                    >
                        Giriş Yap
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-slate-400 text-sm">
                        Hesabın yok mu?{' '}
                        <Link to="/register" className="text-turf-500 font-bold hover:underline">
                            Kayıt Ol
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
