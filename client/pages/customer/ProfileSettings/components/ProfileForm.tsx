import React from 'react';
import { User, Phone, Calendar, Shield, Building, Search, CheckCircle, Save } from 'lucide-react';
import { LoadingSpinner } from '../../../../components/UI/LoadingSpinner';

interface ProfileFormProps {
    profileData: any;
    setProfileData: (data: any) => void;
    businesses: any[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    handleToggleFavorite: (id: string) => void;
    handleProfileUpdate: (e: React.FormEvent) => void;
    saving: boolean;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
    profileData,
    setProfileData,
    businesses,
    searchQuery,
    setSearchQuery,
    handleToggleFavorite,
    handleProfileUpdate,
    saving
}) => {
    const availableBusinesses = businesses.filter(b =>
        !searchQuery || b.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
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

            <div className="pt-4 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-400 uppercase mb-3 block flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><Building className="w-4 h-4 text-turf-500" /> Favori İşletmeleriniz (En Fazla 3)</span>
                    <span className="text-[10px] text-turf-400">({profileData.favoriteBusinessIds?.length || 0}/3 Seçildi)</span>
                </label>

                <div className="relative mb-3">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="İşletme ara..."
                        className="w-full bg-slate-900 text-white pl-12 pr-4 py-3 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold text-sm"
                    />
                </div>
                {availableBusinesses.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {availableBusinesses.map(business => {
                            const isSelected = profileData.favoriteBusinessIds?.includes(business.id);
                            return (
                                <div
                                    key={business.id}
                                    onClick={() => handleToggleFavorite(business.id)}
                                    className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition-all ${isSelected
                                        ? 'bg-turf-900/20 border-turf-500/50'
                                        : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-turf-500 border-turf-500' : 'border-slate-600 bg-slate-800'}`}>
                                        {isSelected && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
                                    </div>
                                    <div className="flex-1 truncate">
                                        <div className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-slate-400'}`}>{business.name}</div>
                                        <div className="text-[10px] text-slate-500 truncate">{business.location || business.district || business.city}</div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-sm text-slate-500 text-center py-4 bg-slate-900 rounded-xl border border-slate-800">
                        Bu konuma uygun işletme bulunamadı.
                    </div>
                )}
            </div>

            <button
                type="submit"
                disabled={saving}
                className="w-full bg-turf-600 text-white py-4 rounded-xl font-black text-lg uppercase tracking-wider hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20 mt-4 flex items-center justify-center gap-2"
            >
                {saving ? <LoadingSpinner size="sm" text="" /> : <><Save className="w-5 h-5" /> Kaydet</>}
            </button>
        </form>
    );
};
