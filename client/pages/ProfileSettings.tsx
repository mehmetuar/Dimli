import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, User, Phone, Mail, Calendar, Shield, Lock, Save, Key } from 'lucide-react';
import { getProfile, updateProfile, changePassword } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const ProfileSettings: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [profileData, setProfileData] = useState({
        full_name: '',
        username: '',
        phone: '',
        birthDate: '',
        position: '',
        secondaryPosition: '',
        foot: ''
    });

    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const user = await getProfile();
            setProfileData({
                full_name: user.full_name || '',
                username: user.username || '',
                phone: user.phone || '',
                birthDate: user.birthDate ? user.birthDate.split('T')[0] : '',
                position: user.position || '',
                secondaryPosition: user.secondaryPosition || '',
                foot: user.foot || ''
            });
        } catch (error) {
            console.error('Error loading profile:', error);
            setMessage({ type: 'error', text: 'Profil bilgileri yüklenemedi.' });
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        // Sanitize data: convert empty strings to null for optional fields
        const payload = { ...profileData };
        if (!payload.birthDate) {
            delete payload.birthDate; // or set to null if you want to clear it
        }
        if (!payload.secondaryPosition) {
            payload.secondaryPosition = null as any; // Clear secondary position
        }
        // Remove phone if empty to avoid unique constraint issues if any (though phone is nullable unique)
        if (!payload.phone) {
            payload.phone = null as any;
        }
        // Remove email if empty - wait, email is not in state but check if we add it later

        try {
            await updateProfile(payload);
            setMessage({ type: 'success', text: 'Profil başarıyla güncellendi.' });
        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: 'Profil güncellenirken bir hata oluştu.' });
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'Yeni şifreler eşleşmiyor.' });
            return;
        }
        if (passwordData.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Şifre en az 6 karakter olmalıdır.' });
            return;
        }

        setSaving(true);
        setMessage(null);
        try {
            await changePassword({
                oldPassword: passwordData.oldPassword,
                newPassword: passwordData.newPassword
            });
            setMessage({ type: 'success', text: 'Şifre başarıyla değiştirildi.' });
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            console.error(error);
            const errorMsg = error.response?.data?.message || 'Şifre değiştirilemedi. Mevcut şifrenizi kontrol edin.';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-pitch flex items-center justify-center">
                <LoadingSpinner size="lg" text="Profil yükleniyor..." />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-pitch pt-safe-top px-4 pb-20">
            <header className="flex items-center gap-4 py-4 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-8 h-8" />
                </button>
                <h1 className="font-sport font-black text-3xl text-white italic tracking-wide uppercase">
                    PROFİL AYARLARI
                </h1>
            </header>

            {/* Tabs */}
            <div className="flex bg-slate-800/50 p-1 rounded-xl mb-6">
                <button
                    onClick={() => { setActiveTab('profile'); setMessage(null); }}
                    className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'profile'
                        ? 'bg-turf-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white'
                        }`}
                >
                    <User className="w-4 h-4" />
                    Profil Bilgileri
                </button>
                <button
                    onClick={() => { setActiveTab('password'); setMessage(null); }}
                    className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'password'
                        ? 'bg-turf-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white'
                        }`}
                >
                    <Key className="w-4 h-4" />
                    Şifre Değiştir
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-xl mb-6 text-sm font-bold text-center ${message.type === 'success'
                    ? 'bg-green-500/10 border border-green-500/50 text-green-400'
                    : 'bg-red-500/10 border border-red-500/50 text-red-400'
                    }`}>
                    {message.text}
                </div>
            )}

            {activeTab === 'profile' ? (
                <form onSubmit={handleProfileUpdate} className="space-y-4 animate-fade-in">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ad Soyad</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                            <input
                                type="text"
                                value={profileData.full_name}
                                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                                className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Kullanıcı Adı</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                            <input
                                type="text"
                                value={profileData.username}
                                onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                                className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Telefon</label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                            <input
                                type="tel"
                                value={profileData.phone}
                                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Doğum Tarihi</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                            <input
                                type="date"
                                value={profileData.birthDate}
                                onChange={(e) => setProfileData({ ...profileData, birthDate: e.target.value })}
                                className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mevki</label>
                            <div className="relative">
                                <Shield className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                                <select
                                    value={profileData.position}
                                    onChange={(e) => setProfileData({ ...profileData, position: e.target.value })}
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
                                    value={profileData.secondaryPosition}
                                    onChange={(e) => setProfileData({ ...profileData, secondaryPosition: e.target.value })}
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

                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Kullandığı Ayak</label>
                            <div className="relative">
                                <Shield className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                                <select
                                    value={profileData.foot}
                                    onChange={(e) => setProfileData({ ...profileData, foot: e.target.value })}
                                    className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold appearance-none"
                                >
                                    <option value="Sağ">Sağ</option>
                                    <option value="Sol">Sol</option>
                                    <option value="Her İkisi">Her İkisi</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-turf-600 text-white py-4 rounded-xl font-black text-lg uppercase tracking-wider hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20 mt-4 flex items-center justify-center gap-2"
                    >
                        {saving ? <LoadingSpinner size="sm" text="" /> : <><Save className="w-5 h-5" /> Kaydet</>}
                    </button>
                </form>
            ) : (
                <form onSubmit={handlePasswordChange} className="space-y-4 animate-fade-in">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mevcut Şifre</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                            <input
                                type="password"
                                value={passwordData.oldPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Yeni Şifre</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                            <input
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Yeni Şifre (Tekrar)</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                            <input
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                className="w-full bg-slate-900 text-white pl-12 pr-4 py-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-turf-600 text-white py-4 rounded-xl font-black text-lg uppercase tracking-wider hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20 mt-4 flex items-center justify-center gap-2"
                    >
                        {saving ? <LoadingSpinner size="sm" text="" /> : <><Save className="w-5 h-5" /> Şifreyi Güncelle</>}
                    </button>
                </form>
            )}
        </div>
    );
};
