import React from 'react';
import { Store, Plus, MapPin } from 'lucide-react';
import { Business, Team } from '../../../../types';
import { LocationFilterModal, LocationFilter } from '../../../../components/Modals/LocationFilterModal';
import { LocationAccessGate } from '../../../../components/LocationAccessGate';

interface TeamHomeBusinessProps {
    myTeam: Team;
    /** Yalnız edit-modu seçim listesi (lazy — "Değiştir"e basılınca çekilir) */
    businesses: Business[];
    isBusinessListLoading: boolean;
    /** Kartın veri kaynağı — yarıçap listesinden bağımsız tekil fetch */
    homeBusiness: Business | null;
    isCaptain: boolean;
    isEditingPitch: boolean;
    setIsEditingPitch: (isEditing: boolean) => void;
    handleSetHomeBusiness: (id: string) => void;
    setIsCreateMatchModalOpen: (isOpen: boolean) => void;
    isLocationFilterOpen: boolean;
    setIsLocationFilterOpen: (open: boolean) => void;
    locationFilter: LocationFilter;
    applyLocationFilter: (filter: LocationFilter) => void;
}

export const TeamHomeBusiness: React.FC<TeamHomeBusinessProps> = ({
    myTeam, businesses, isBusinessListLoading, homeBusiness, isCaptain, isEditingPitch, setIsEditingPitch,
    handleSetHomeBusiness, setIsCreateMatchModalOpen,
    isLocationFilterOpen, setIsLocationFilterOpen, locationFilter, applyLocationFilter
}) => {
    // Eski hali yarıçap listesinden find() yapıyordu — ev işletmesi yarıçap
    // dışındaysa kart yanlışlıkla boş görünüyordu; artık tekil fetch sonucu.
    const selectedHomeBusiness = homeBusiness;

    return (
        <>
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <h3 className="font-sport font-bold text-base sm:text-xl text-white flex items-center gap-2 min-w-0">
                    <Store className="w-5 h-5 text-turf-500 shrink-0" />
                    <span className="truncate">EV SAHİBİ SAHA</span>
                </h3>
                {isCaptain && (
                    <button
                        onClick={() => setIsEditingPitch(!isEditingPitch)}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-lg transition-colors"
                    >
                        {myTeam?.homeBusinessId ? 'Değiştir' : 'İşletme Seç'}
                    </button>
                )}
            </div>

            {isEditingPitch ? (
                <div className="p-4 bg-slate-900">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-slate-400">Takımınızın favori işletmesini seçin:</p>
                        <button
                            onClick={() => setIsLocationFilterOpen(true)}
                            className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <MapPin className="w-3.5 h-3.5 text-turf-400" />
                            {locationFilter.coords ? `${locationFilter.radius} km` : 'Konum Filtresi'}
                        </button>
                    </div>
                    <LocationAccessGate contentLabel="işletmeleri" compact>
                        {isBusinessListLoading ? (
                            <div className="flex justify-center py-6">
                                <div className="w-6 h-6 border-2 border-turf-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : businesses.length === 0 ? (
                            <div className="text-center py-6 text-slate-500 text-xs flex flex-col items-center gap-2">
                                <MapPin className="w-5 h-5" />
                                Yakınında işletme bulunamadı.
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {businesses.map(business => (
                                    <button
                                        key={business.id}
                                        onClick={() => handleSetHomeBusiness(business.id)}
                                        className="w-full text-left p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex justify-between items-center"
                                    >
                                        <span className="text-white text-sm font-bold">{business.name}</span>
                                        <span className="text-xs text-slate-400">{business.district}, {business.city}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </LocationAccessGate>
                </div>
            ) : (
                selectedHomeBusiness ? (
                    <div className="relative group">
                        {(() => {
                            const pitchImage = selectedHomeBusiness.pitches?.[0]?.imageUrl;
                            return pitchImage ? (
                                <img
                                    src={pitchImage}
                                    className="w-full h-32 object-cover opacity-60"
                                    alt="Business"
                                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                        const t = e.target as HTMLImageElement;
                                        t.style.display = 'none';
                                        t.nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                            ) : null;
                        })()}
                        <div className={`w-full h-32 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 flex items-center justify-center ${selectedHomeBusiness.pitches?.[0]?.imageUrl ? 'hidden' : ''}`}>
                            <svg viewBox="0 0 120 80" className="w-24 h-16 opacity-20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="5" y="5" width="110" height="70" rx="4" stroke="white" strokeWidth="3"/>
                                <line x1="60" y1="5" x2="60" y2="75" stroke="white" strokeWidth="2"/>
                                <circle cx="60" cy="40" r="12" stroke="white" strokeWidth="2"/>
                                <rect x="5" y="25" width="15" height="30" rx="2" stroke="white" strokeWidth="2"/>
                                <rect x="100" y="25" width="15" height="30" rx="2" stroke="white" strokeWidth="2"/>
                            </svg>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 to-transparent">
                            <div className="text-white font-bold text-lg">{selectedHomeBusiness.name}</div>
                            <div className="text-slate-300 text-xs">{selectedHomeBusiness.district}, {selectedHomeBusiness.city}</div>
                        </div>
                        {isCaptain && myTeam.homeBusinessId && (
                            <button
                                onClick={() => setIsCreateMatchModalOpen(true)}
                                className="absolute top-3 right-3 bg-turf-600 hover:bg-turf-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" /> İlan Oluştur
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="p-8 text-center">
                        <p className="text-slate-500 text-sm">Henüz bir favori işletme seçmediniz.</p>
                    </div>
                )
            )}
        </div>
        <LocationFilterModal
            isOpen={isLocationFilterOpen}
            onClose={() => setIsLocationFilterOpen(false)}
            currentFilter={locationFilter}
            onApply={applyLocationFilter}
        />
        </>
    );
};
