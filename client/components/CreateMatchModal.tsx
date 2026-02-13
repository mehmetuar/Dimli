
import React, { useState, useEffect } from 'react';
import { X, MapPin, Calendar, Clock, Shield, ChevronRight, CheckCircle, Trophy, Filter, Store } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SkillLevel, Business, Pitch } from '../types';
import api from '../services/api';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    preSelectedPitchId?: string;
    preSelectedHour?: number;
}

export const CreateMatchModal: React.FC<Props> = ({ isOpen, onClose, preSelectedPitchId, preSelectedHour }) => {
    if (!isOpen) return null;

    const [businesses, setBusinesses] = useState<Business[]>([]);

    // Selection state
    const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
    const [selectedPitchId, setSelectedPitchId] = useState(preSelectedPitchId || '');

    // Derived state
    const [selectedRegion, setSelectedRegion] = useState('TÜMÜ');

    // Get today's date in YYYY-MM-DD format
    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [date, setDate] = useState(getTodayDate());
    const [time, setTime] = useState(preSelectedHour ? `${preSelectedHour}:00` : '');
    const [level, setLevel] = useState(SkillLevel.INTERMEDIATE);
    const [note, setNote] = useState('');
    const [playerCount, setPlayerCount] = useState(7);
    const [isLoading, setIsLoading] = useState(false); // For submission
    const [isFetchingData, setIsFetchingData] = useState(false); // For initial data
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Fetch initial data (User & Businesses)
    useEffect(() => {
        const fetchInitialData = async () => {
            setIsFetchingData(true);
            try {
                // 1. Fetch User
                const userRes = await api.get('/users/me');
                console.log('📝 Current User:', userRes.data);
                setCurrentUser(userRes.data);
                if (userRes.data.team?.level) {
                    setLevel(userRes.data.team.level);
                }

                // 2. Fetch Businesses (with Pitches)
                const businessRes = await api.get('/businesses');
                const fetchedBusinesses: Business[] = businessRes.data;
                setBusinesses(fetchedBusinesses);

                // 3. Handle Pre-selection
                if (preSelectedPitchId) {
                    // Find business for this pitch
                    const business = fetchedBusinesses.find(b => b.pitches?.some(p => p.id === preSelectedPitchId));
                    if (business) {
                        setSelectedBusinessId(business.id);
                        setSelectedPitchId(preSelectedPitchId);
                    }
                }

            } catch (error) {
                console.error('Failed to fetch data:', error);
                setErrorMessage('Veriler yüklenirken hata oluştu.');
            } finally {
                setIsFetchingData(false);
            }
        };

        if (isOpen) {
            fetchInitialData();
            // Reset state if opening fresh (optional, but good for UX if not pre-selected)
            if (!preSelectedPitchId) {
                setSelectedBusinessId(null);
                setSelectedPitchId('');
                setSuccessMessage('');
                setErrorMessage('');
            }
        }
    }, [isOpen, preSelectedPitchId]);

    const myTeam = currentUser?.team;

    const handleSubmit = async () => {
        if (!myTeam || !selectedPitchId || !time || !date) {
            setErrorMessage('Lütfen tüm alanları doldurun');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');

        try {
            const response = await api.post('/match-announcements', {
                pitchId: selectedPitchId,
                date,
                time,
                requiredLevel: level,
                playerCount,
                description: note
            });

            console.log('✅ Announcement created:', response.data);
            setSuccessMessage('İlan başarıyla oluşturuldu!');

            setTimeout(() => {
                onClose();
                window.location.reload();
            }, 1500);
        } catch (error: any) {
            console.error('❌ Failed to create announcement:', error);
            if (error.response?.status === 409) {
                setErrorMessage(error.response.data.message || 'Bu saat için zaten aktif bir ilanınız var');
            } else {
                setErrorMessage('İlan oluşturulurken bir hata oluştu');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to find selected pitch object
    const getSelectedPitch = () => {
        if (!selectedPitchId) return null;
        for (const b of businesses) {
            const p = b.pitches?.find(pitch => pitch.id === selectedPitchId);
            if (p) return p;
        }
        return null;
    };
    const selectedPitch = getSelectedPitch();

    // Filter Logic for Businesses
    const regions = ['TÜMÜ', ...new Set(businesses.map(b => b.district || b.city || ''))].filter(Boolean);
    const filteredBusinesses = selectedRegion === 'TÜMÜ'
        ? businesses
        : businesses.filter(b => (b.district === selectedRegion || b.city === selectedRegion));

    return (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 w-full max-w-lg sm:rounded-3xl rounded-t-3xl border border-slate-700 shadow-2xl shadow-turf-500/10 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-slate-700 bg-slate-900 flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h2 className="font-sport font-black text-2xl text-white italic uppercase tracking-wide">
                            MAÇ <span className="text-turf-500">KUR</span>
                        </h2>
                        <p className="text-slate-400 text-xs">Takımını topla, rakibini çağır.</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {/* State Messages */}
                    {successMessage && (
                        <div className="mb-4 bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in">
                            <CheckCircle className="w-5 h-5" />
                            <p className="font-bold text-sm">{successMessage}</p>
                        </div>
                    )}
                    {errorMessage && (
                        <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 animate-fade-in">
                            <X className="w-5 h-5" />
                            <p className="font-bold text-sm">{errorMessage}</p>
                        </div>
                    )}

                    {isFetchingData ? (
                        <div className="flex justify-center py-10">
                            <LoadingSpinner />
                        </div>
                    ) : (
                        <>
                            {/* Step 1: Pitch/Business Selection */}
                            <div className="mb-8 animate-fade-in">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-3 block flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-turf-600 text-slate-900 flex items-center justify-center text-[10px]">1</span>
                                    Saha Seçimi
                                </label>

                                {preSelectedPitchId ? (
                                    // READ ONLY VIEW if pre-selected
                                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 flex items-center gap-3 relative">
                                        <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-turf-500">
                                            <MapPin className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-sm">{selectedPitch?.name}</div>
                                            <div className="text-xs text-slate-500">
                                                {businesses.find(b => b.pitches?.some(p => p.id === selectedPitchId))?.name}
                                            </div>
                                        </div>
                                        <span className="ml-auto text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 border border-slate-700">Sabitlendi</span>
                                        <div className="absolute top-2 right-20 bg-slate-800 px-2 py-0.5 rounded border border-slate-600">
                                            <span className="text-white font-sport font-bold text-xs">₺{selectedPitch?.pricePerHour}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Region Filters */}
                                        <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-2">
                                            {regions.map(region => (
                                                <button
                                                    key={region}
                                                    onClick={() => setSelectedRegion(region)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${selectedRegion === region
                                                        ? 'bg-turf-600 text-white'
                                                        : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-turf-500'
                                                        }`}
                                                >
                                                    {region}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Business List */}
                                        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                                            {filteredBusinesses.map(business => (
                                                <div key={business.id} className={`rounded-xl border transition-all overflow-hidden ${selectedBusinessId === business.id ? 'border-turf-500 bg-slate-900' : 'border-slate-700 bg-slate-900/50'}`}>
                                                    <div
                                                        onClick={() => setSelectedBusinessId(selectedBusinessId === business.id ? null : business.id)}
                                                        className="p-3 cursor-pointer flex items-center gap-3 hover:bg-slate-800 transition-colors"
                                                    >
                                                        <Store className={`w-5 h-5 ${selectedBusinessId === business.id ? 'text-turf-500' : 'text-slate-500'}`} />
                                                        <div className="flex-1">
                                                            <div className="font-bold text-white text-sm">{business.name}</div>
                                                            <div className="text-xs text-slate-500">{business.district}, {business.city}</div>
                                                        </div>
                                                        <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform ${selectedBusinessId === business.id ? 'rotate-90' : ''}`} />
                                                    </div>

                                                    {/* Pitches List (if expanded) */}
                                                    {selectedBusinessId === business.id && (
                                                        <div className="bg-slate-950/50 p-2 space-y-1 border-t border-slate-800">
                                                            {business.pitches?.map(pitch => (
                                                                <div
                                                                    key={pitch.id}
                                                                    onClick={() => setSelectedPitchId(pitch.id)}
                                                                    className={`p-2 rounded-lg flex items-center justify-between cursor-pointer text-xs ${selectedPitchId === pitch.id ? 'bg-turf-900/40 text-turf-400 border border-turf-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <span>{pitch.name}</span>
                                                                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] uppercase">{pitch.type}</span>
                                                                    </div>
                                                                    <div className="font-bold">₺{pitch.pricePerHour}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Step 2: Date & Time */}
                            <div className="mb-8 animate-fade-in delay-75">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-3 block flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-turf-600 text-slate-900 flex items-center justify-center text-[10px]">2</span>
                                    Zamanlama
                                </label>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                            <input
                                                type="date"
                                                min={getTodayDate()}
                                                max={(() => {
                                                    const maxDate = new Date();
                                                    maxDate.setDate(maxDate.getDate() + 30);
                                                    return maxDate.toISOString().split('T')[0];
                                                })()}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-white text-sm focus:border-turf-500 focus:outline-none"
                                                value={date}
                                                onChange={(e) => setDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                            <select
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-white text-sm focus:border-turf-500 focus:outline-none appearance-none"
                                                value={time}
                                                onChange={(e) => setTime(e.target.value)}
                                            >
                                                <option value="">Saat Seç</option>
                                                {Array.from({ length: 14 }, (_, i) => i + 10)
                                                    .filter(h => {
                                                        const today = getTodayDate();
                                                        if (date === today) {
                                                            const currentHour = new Date().getHours();
                                                            return h > currentHour;
                                                        }
                                                        return true;
                                                    })
                                                    .map(h => (
                                                        <option key={h} value={`${h}:00`}>{h}:00 - {h + 1}:00</option>
                                                    ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3: Details */}
                            <div className="mb-4 animate-fade-in delay-150">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-3 block flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-turf-600 text-slate-900 flex items-center justify-center text-[10px]">3</span>
                                    Detaylar
                                </label>

                                <div className="space-y-4">
                                    <div>
                                        <span className="text-xs text-slate-400 mb-2 block">Aranan Rakip Seviyesi</span>
                                        <div className="flex p-1 bg-slate-900 rounded-lg">
                                            {Object.values(SkillLevel).map((lvl) => (
                                                <button
                                                    key={lvl}
                                                    onClick={() => setLevel(lvl)}
                                                    className={`flex-1 py-2 text-[10px] font-bold rounded transition-colors ${level === lvl ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    {lvl}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-xs text-slate-400 mb-2 block">Kadro Boyutu</span>
                                        <div className="flex p-1 bg-slate-900 rounded-lg overflow-x-auto">
                                            {[5, 6, 7, 8, 11].map((count) => (
                                                <button
                                                    key={count}
                                                    onClick={() => setPlayerCount(count)}
                                                    className={`flex-1 py-2 px-2 text-[10px] font-bold rounded transition-colors whitespace-nowrap ${playerCount === count ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    {count}v{count}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-xs text-slate-400 mb-2 block">Kaptan Notu</span>
                                        <textarea
                                            rows={3}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-turf-500 focus:outline-none"
                                            placeholder="Örn: Forma rengimiz siyah. İddialıyız."
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-slate-900 border-t border-slate-800 sticky bottom-0 z-10">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div>
                            <div className="text-[10px] text-slate-500 uppercase font-bold">Tahmini Saha Payı</div>
                            <div className="text-lg font-bold text-white">₺{selectedPitch ? selectedPitch.pricePerHour / 2 : '0'}</div>
                        </div>
                        {myTeam && (
                            <div className="flex items-center gap-2">
                                <img src={myTeam.logoUrl} className="w-8 h-8 rounded-full border border-slate-600" />
                                <span className="text-sm font-bold text-white">{myTeam.name}</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!selectedPitchId || !date || !time || isLoading}
                        className="w-full bg-turf-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black uppercase italic py-4 rounded-xl text-lg shadow-lg shadow-turf-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {isLoading ? <LoadingSpinner size="sm" /> : <><Trophy className="w-5 h-5" /> İlanı Yayınla</>}
                    </button>
                </div>

            </div>
        </div>
    );
};
