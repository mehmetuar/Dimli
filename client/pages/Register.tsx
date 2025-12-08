import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Trophy, ChevronRight, ChevronLeft, Check, User, Phone, Mail, Calendar, Shield, Lock } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const Register: React.FC = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        phone: '',
        email: '',
        birthDate: '',
        position: 'Orta Saha',
        secondaryPosition: '',
        foot: 'Sağ'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    // Prevent accidental double-clicks on "Next" triggering "Submit"
    const [isSubmitReady, setIsSubmitReady] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const nextStep = () => {
        setError('');
        if (step === 1) {
            if (!formData.username || !formData.password || !formData.confirmPassword) {
                setError('Lütfen tüm alanları doldurun.');
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                setError('Şifreler eşleşmiyor.');
                return;
            }
            if (formData.password.length < 6) {
                setError('Şifre en az 6 karakter olmalıdır.');
                return;
            }
        }
        if (step === 2) {
            if (!formData.full_name || !formData.phone || !formData.birthDate) {
                setError('Lütfen zorunlu alanları doldurun.');
                return;
            }
            // Moving to Step 3: Add delay to submit button
            setIsSubmitReady(false);
            setTimeout(() => setIsSubmitReady(true), 1000);
        }
        setStep(step + 1);
    };

    const prevStep = () => {
        setError('');
        setStep(step - 1);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        // Critical: Prevent submission if not on the final step
        if (step !== 3) return;

        setLoading(true);
        setError('');

        try {
            // Register
            await api.post('/auth/register', formData);

            // Auto Login
            const loginResponse = await api.post('/auth/login', {
                username: formData.username,
                password: formData.password
            });

            if (loginResponse.data.access_token) {
                localStorage.setItem('token', loginResponse.data.access_token);
                navigate('/');
            } else {
                navigate('/login');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Kayıt başarısız. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">Hesap Bilgileri</h2>
                <p className="text-slate-400 text-sm">Giriş yapmak için kullanacağın bilgiler</p>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Kullanıcı Adı</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                        placeholder="kullaniciadi"
                        required
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Şifre</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                        placeholder="••••••••"
                        required
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Şifre Tekrar</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                        placeholder="••••••••"
                        required
                    />
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">Kişisel Bilgiler</h2>
                <p className="text-slate-400 text-sm">Seni daha yakından tanıyalım</p>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ad Soyad</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                        placeholder="Adınız Soyadınız"
                        required
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Telefon Numarası</label>
                <div className="relative">
                    <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                        placeholder="0555 555 55 55"
                        required
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Doğum Tarihi</label>
                <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="date"
                        name="birthDate"
                        value={formData.birthDate}
                        onChange={handleChange}
                        className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                        required
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email (İsteğe Bağlı)</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                        placeholder="ornek@email.com"
                    />
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">Oyuncu Profili</h2>
                <p className="text-slate-400 text-sm">Saha içindeki özelliklerin</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mevki</label>
                    <div className="relative">
                        <Shield className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                        <select
                            name="position"
                            value={formData.position}
                            onChange={handleChange}
                            className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold appearance-none"
                        >
                            <option value="Kaleci">Kaleci</option>
                            <option value="Defans">Defans</option>
                            <option value="Orta Saha">Orta Saha</option>
                            <option value="Forvet">Forvet</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Yedek Mevki</label>
                    <div className="relative">
                        <Shield className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                        <select
                            name="secondaryPosition"
                            value={formData.secondaryPosition}
                            onChange={handleChange}
                            className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold appearance-none"
                        >
                            <option value="">Seçiniz</option>
                            <option value="Kaleci">Kaleci</option>
                            <option value="Defans">Defans</option>
                            <option value="Orta Saha">Orta Saha</option>
                            <option value="Forvet">Forvet</option>
                        </select>
                    </div>
                </div>

                <div className="mt-4 col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Kullandığı Ayak</label>
                    <div className="relative">
                        <Shield className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                        <select
                            name="foot"
                            value={formData.foot}
                            onChange={handleChange}
                            className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold appearance-none"
                        >
                            <option value="Sağ">Sağ</option>
                            <option value="Sol">Sol</option>
                            <option value="Her İkisi">Her İkisi</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-pitch flex flex-col items-center justify-center px-4 pt-10 pb-10">
            <div className="w-full max-w-md bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden">
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-2 bg-slate-700">
                    <div
                        className="h-full bg-turf-500 transition-all duration-500 ease-out"
                        style={{ width: `${(step / 3) * 100}%` }}
                    ></div>
                </div>

                <div className="text-center mb-6 mt-4">
                    <div className="inline-block bg-turf-600 p-3 rounded-xl skew-x-[-12deg] mb-2">
                        <Trophy className="w-6 h-6 text-white skew-x-[12deg]" />
                    </div>
                    <h1 className="font-sport font-black text-2xl text-white italic">KAYIT OL</h1>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-sm font-bold text-center animate-shake">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister}>
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}

                    <div className="flex gap-4 mt-8">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={prevStep}
                                className="flex-1 bg-slate-700 text-white py-4 rounded-xl font-bold hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <ChevronLeft className="w-5 h-5" /> Geri
                            </button>
                        )}

                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                className="flex-1 bg-turf-600 text-white py-4 rounded-xl font-bold hover:bg-turf-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-turf-600/20"
                            >
                                İleri <ChevronRight className="w-5 h-5" />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={loading || !isSubmitReady}
                                className="flex-1 bg-turf-600 text-white py-4 rounded-xl font-bold hover:bg-turf-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-turf-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <LoadingSpinner size="sm" text="" /> : 'Kaydı Tamamla'} <Check className="w-5 h-5" />
                            </button>
                        )}
                    </div>
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
