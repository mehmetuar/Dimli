import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Building2, Search, CheckCircle, Save } from 'lucide-react';
import api, { getProfile, updateProfile, getBusinesses } from '../../../services/api';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';

export const FavoriteBusinessesSettings: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [user, allBusinesses] = await Promise.all([getProfile(), getBusinesses()]);
                setFavoriteIds(user.favoriteBusinessIds || []);
                setBusinesses(allBusinesses);
            } catch {
                setMessage({ type: 'error', text: 'Veriler yüklenemedi.' });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleToggle = (id: string) => {
        setFavoriteIds(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            if (prev.length >= 3) {
                setMessage({ type: 'error', text: 'En fazla 3 favori işletme seçebilirsiniz.' });
                setTimeout(() => setMessage(null), 3000);
                return prev;
            }
            return [...prev, id];
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await updateProfile({ favoriteBusinessIds: favoriteIds });
            setMessage({ type: 'success', text: 'Favori işletmeler kaydedildi.' });
            setTimeout(() => setMessage(null), 3000);
        } catch {
            setMessage({ type: 'error', text: 'Kaydetme başarısız oldu.' });
        } finally {
            setSaving(false);
        }
    };

    const filtered = businesses.filter(b =>
        !searchQuery || b.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-pitch flex items-center justify-center">
                <LoadingSpinner size="lg" text="Yükleniyor..." />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-pitch pt-safe-top pb-28 overflow-x-hidden w-full max-w-full">
            {/* Header */}
            <header className="flex items-center gap-4 px-4 py-4 mb-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-8 h-8" />
                </button>
                <div>
                    <h1 className="font-sport font-black text-3xl text-white italic tracking-wide uppercase">
                        FAVORİ İŞLETMELER
                    </h1>
                    <p className="text-slate-400 text-xs font-bold mt-0.5">{favoriteIds.length}/3 seçildi</p>
                </div>
            </header>

            {/* Message */}
            {message && (
                <div className={`mx-4 p-4 rounded-xl mb-4 text-sm font-bold text-center ${message.type === 'success'
                    ? 'bg-green-500/10 border border-green-500/50 text-green-400'
                    : 'bg-red-500/10 border border-red-500/50 text-red-400'
                    }`}>
                    {message.text}
                </div>
            )}

            <div className="px-4 space-y-4">
                {/* Info card */}
                <div className="bg-turf-900/20 border border-turf-500/20 rounded-2xl p-4 flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-turf-400 shrink-0 mt-0.5" />
                    <p className="text-slate-300 text-sm leading-relaxed">
                        En fazla <span className="text-turf-400 font-bold">3 favori işletme</span> seçebilirsiniz. Seçtiğiniz işletmeler maç ilanlarında öncelikli olarak gösterilir.
                    </p>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="İşletme ara..."
                        className="w-full bg-slate-800 text-white pl-12 pr-4 py-3.5 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                    />
                </div>

                {/* Business list */}
                {filtered.length > 0 ? (
                    <div className="space-y-2">
                        {filtered.map(business => {
                            const isSelected = favoriteIds.includes(business.id);
                            return (
                                <div
                                    key={business.id}
                                    onClick={() => handleToggle(business.id)}
                                    className={`p-4 rounded-xl border cursor-pointer flex items-center gap-3 transition-all active:scale-[0.98] ${isSelected
                                        ? 'bg-turf-900/20 border-turf-500/50'
                                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                                        }`}
                                >
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-turf-500 border-turf-500' : 'border-slate-600 bg-slate-800'}`}>
                                        {isSelected && <CheckCircle className="w-4 h-4 text-slate-900" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`font-bold truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                            {business.name}
                                        </div>
                                        <div className="text-xs text-slate-500 truncate mt-0.5">
                                            {business.location || business.district || business.city || ''}
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <span className="text-xs text-turf-400 font-bold shrink-0">Seçili</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-sm text-slate-500 text-center py-8 bg-slate-800/50 rounded-xl border border-slate-800">
                        Arama sonucu bulunamadı.
                    </div>
                )}
            </div>

            {/* Sticky save button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-pitch/90 backdrop-blur-sm border-t border-slate-800 pb-safe-bottom">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-turf-600 text-white py-4 rounded-xl font-black text-lg uppercase tracking-wider hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20 flex items-center justify-center gap-2"
                >
                    {saving ? <LoadingSpinner size="sm" text="" /> : <><Save className="w-5 h-5" /> Kaydet</>}
                </button>
            </div>
        </div>
    );
};
