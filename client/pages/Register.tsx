import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Trophy } from 'lucide-react';

export const Register: React.FC = () => {
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        position: 'Forvet'
    });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError('Şifreler eşleşmiyor.');
            return;
        }
        try {
            await api.post('/auth/register', formData);
            // Auto login after register or redirect to login
            navigate('/login');
        } catch (err) {
            setError('Kayıt başarısız. Lütfen tekrar deneyin.');
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
                    <h1 className="font-sport font-black text-4xl text-white italic">KAYIT OL</h1>
                    <p className="text-slate-400 mt-2">Takımını kur, maça başla.</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-sm font-bold text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Kullanıcı Adı</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                            placeholder="Benzersiz kullanıcı adı"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ad Soyad</label>
                        <input
                            type="text"
                            name="full_name"
                            value={formData.full_name}
                            onChange={handleChange}
                            className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                            placeholder="Adınız Soyadınız"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                            placeholder="ornek@email.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Telefon Numarası</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                            placeholder="0555 555 55 55"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Şifre</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Şifre Tekrar</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mevki</label>
                        <select
                            name="position"
                            value={formData.position}
                            onChange={handleChange}
                            className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold appearance-none"
                        >
                            <option value="Kaleci">Kaleci</option>
                            <option value="Defans">Defans</option>
                            <option value="Orta Saha">Orta Saha</option>
                            <option value="Forvet">Forvet</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-turf-600 text-white py-4 rounded-xl font-black text-lg uppercase tracking-wider hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20 mt-4"
                    >
                        Kayıt Ol
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-slate-400 text-sm">
                        Zaten hesabın var mı?{' '}
                        <Link to="/login" className="text-turf-500 font-bold hover:underline">
                            Giriş Yap
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
