import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Building2, Search, CheckCircle, Save, MapPin } from 'lucide-react';
import { getProfile, updateProfile, getBusinesses } from '../../../services/api';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';
import { LottiePlayer } from '../../../components/UI/LottiePlayer';
import { useLocationContext } from '../../../contexts/LocationContext';
import { LocationFilterModal, LocationFilter } from '../../../components/Modals/LocationFilterModal';
import { LocationAccessGate } from '../../../components/LocationAccessGate';

export const FavoriteBusinessesSettings: React.FC = () => {
    const navigate = useNavigate();
    const { coords, radius, setRadius } = useLocationContext();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [businesses, setBusinesses] = useState<any[]>([]);
    const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);

    const locationFilter: LocationFilter = { type: 'NEARBY', radius, coords: coords ?? undefined };
    const applyLocationFilter = (filter: LocationFilter) => { if (filter.radius) setRadius(filter.radius); };

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const user = await getProfile();
                setFavoriteIds(user.favoriteBusinessIds || []);
            } catch {
                setMessage({ type: 'error', text: 'Profil yüklenemedi.' });
            } finally {
                setLoading(false);
            }
        };
        loadProfile();
    }, []);

    useEffect(() => {
        if (!coords) {
            setBusinesses([]);
            return;
        }
        let cancelled = false;
        const fetchBusinessesWithCoords = async () => {
            try {
                const data = await getBusinesses({ lat: coords.lat, lng: coords.lng, radius });
                if (!cancelled) setBusinesses(data);
            } catch (error) {
                console.error('Failed to fetch businesses:', error);
            }
        };
        fetchBusinessesWithCoords();
        return () => { cancelled = true; };
    }, [coords, radius]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <div className="fixed inset-0 bg-pitch flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {/* Header */}
            <header className="flex items-center gap-3 px-4 py-4 mb-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
                >
                    <ChevronLeft className="w-7 h-7" />
                </button>
                <div className="min-w-0">
                    <h1 className="font-sport font-black text-xl sm:text-2xl md:text-3xl text-white italic tracking-wide uppercase truncate">
                        FAVORİ İŞLETMELER
                    </h1>
                    <p className="text-slate-400 text-xs font-bold mt-0.5">{favoriteIds.length}/3 seçildi</p>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
            {/* Message */}
            {message && (
                <div className={`mx-4 p-4 rounded-xl mb-4 text-sm font-bold text-center ${message.type === 'success'
                    ? 'bg-green-500/10 border border-green-500/50 text-green-400'
                    : 'bg-red-500/10 border border-red-500/50 text-red-400'
                    }`}>
                    {message.text}
                </div>
            )}

            <div className="px-4 space-y-4 pb-32" style={{ minHeight: 'calc(100% + 1px)' }}>
                {/* Info card */}
                <div className="bg-turf-900/20 border border-turf-500/20 rounded-2xl p-4 flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-turf-400 shrink-0 mt-0.5" />
                    <p className="text-slate-300 text-sm leading-relaxed">
                        En fazla <span className="text-turf-400 font-bold">3 favori işletme</span> seçebilirsiniz. Seçtiğiniz işletmeler maç ilanlarında öncelikli olarak gösterilir.
                    </p>
                </div>

                {/* Search + Konum Filtresi */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="İşletme ara..."
                            className="w-full bg-slate-800 text-white pl-12 pr-4 py-3.5 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none font-bold"
                        />
                    </div>
                    <button
                        onClick={() => setIsLocationFilterOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-3.5 bg-slate-800 border border-slate-700 rounded-xl text-white hover:bg-slate-700 transition-colors shrink-0"
                    >
                        <MapPin className={`w-4 h-4 ${coords ? 'text-turf-400' : 'text-slate-500'}`} />
                        {coords && <span className="text-xs font-bold text-turf-400">{radius}km</span>}
                    </button>
                </div>

                {/* Business list */}
                <LocationAccessGate contentLabel="işletmeleri">
                    {businesses.length === 0 ? (
                        <div className="text-center py-12 px-6 text-slate-400 bg-slate-800/50 rounded-3xl border border-dashed border-slate-700 flex flex-col items-center">
                            {/* Saha çizim animasyonu (tek-sefer); reduce-motion/yüklenme → statik pin */}
                            <div className="w-24 h-24 mb-1">
                                <LottiePlayer
                                    src="/animations/football-pitch.json"
                                    loop={false}
                                    autoplay
                                    ariaLabel="İşletme bulunamadı"
                                    style={{ width: '100%', height: '100%' }}
                                    fallback={<MapPin className="w-8 h-8 mx-auto mt-8 text-slate-600" />}
                                />
                            </div>
                            <p className="text-sm">İşletme bulunamadı.</p>
                            <p className="text-xs text-slate-500 mt-1">Henüz kayıtlı işletme yok.</p>
                        </div>
                    ) : filtered.length > 0 ? (
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
                </LocationAccessGate>
            </div>
            </div>

            <LocationFilterModal
                isOpen={isLocationFilterOpen}
                onClose={() => setIsLocationFilterOpen(false)}
                currentFilter={locationFilter}
                onApply={applyLocationFilter}
            />

            {/* Sticky save button — fixed at bottom since Navbar is hidden on this page */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-pitch/90 backdrop-blur-sm border-t border-slate-800 pb-safe-bottom z-[60]">
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
