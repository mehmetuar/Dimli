import React from 'react';
import { User, Phone, Calendar, Shield, Save } from 'lucide-react';
import { LoadingSpinner } from '../../../../components/UI/LoadingSpinner';

interface ProfileFormProps {
    profileData: any;
    setProfileData: (data: any) => void;
    handleProfileUpdate: (e: React.FormEvent) => void;
    saving: boolean;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
    profileData,
    setProfileData,
    handleProfileUpdate,
    saving
}) => {
    return (
        <form onSubmit={handleProfileUpdate} className="space-y-6 animate-fade-in">
            {/* Kişisel Bilgiler */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-turf-500" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kişisel Bilgiler</span>
                </div>
                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Ad Soyad</label>
                        <input
                            type="text"
                            value={profileData.full_name}
                            onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                            className="w-full bg-slate-900 text-white px-4 py-3.5 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Kullanıcı Adı</label>
                        <input
                            type="text"
                            value={profileData.username}
                            onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                            className="w-full bg-slate-900 text-white px-4 py-3.5 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Telefon</label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                            <input
                                type="tel"
                                value={profileData.phone}
                                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                className="w-full bg-slate-900 text-white pl-11 pr-4 py-3.5 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Doğum Tarihi</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                            <input
                                type="date"
                                value={profileData.birthDate}
                                onChange={(e) => setProfileData({ ...profileData, birthDate: e.target.value })}
                                className="w-full bg-slate-900 text-white pl-11 pr-4 py-3.5 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Oyuncu Bilgileri */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-turf-500" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Oyuncu Bilgileri</span>
                </div>
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Mevki</label>
                            <select
                                value={profileData.position}
                                onChange={(e) => setProfileData({ ...profileData, position: e.target.value })}
                                className="w-full bg-slate-900 text-white px-4 py-3.5 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold appearance-none"
                            >
                                <option value="Kaleci">Kaleci</option>
                                <option value="Defans">Defans</option>
                                <option value="Orta Saha">Orta Saha</option>
                                <option value="Forvet">Forvet</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Yedek Mevki</label>
                            <select
                                value={profileData.secondaryPosition}
                                onChange={(e) => setProfileData({ ...profileData, secondaryPosition: e.target.value })}
                                className="w-full bg-slate-900 text-white px-4 py-3.5 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold appearance-none"
                            >
                                <option value="">Seçiniz</option>
                                <option value="Kaleci">Kaleci</option>
                                <option value="Defans">Defans</option>
                                <option value="Orta Saha">Orta Saha</option>
                                <option value="Forvet">Forvet</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Kullandığı Ayak</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['Sağ', 'Sol', 'Her İkisi'].map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setProfileData({ ...profileData, foot: opt })}
                                    className={`py-3 rounded-xl font-bold text-sm transition-all ${
                                        profileData.foot === opt
                                            ? 'bg-turf-600 text-white shadow-lg'
                                            : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-500'
                                    }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <button
                type="submit"
                disabled={saving}
                className="w-full bg-turf-600 text-white py-4 rounded-xl font-black text-lg uppercase tracking-wider hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20 flex items-center justify-center gap-2"
            >
                {saving ? <LoadingSpinner size="sm" text="" /> : <><Save className="w-5 h-5" /> Kaydet</>}
            </button>
        </form>
    );
};
