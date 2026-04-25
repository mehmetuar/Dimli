import React from 'react';
import { Store, Plus, MapPin } from 'lucide-react';
import { Business, Team } from '../../../../types';
import { LocationFilterModal, LocationFilter } from '../../../../components/Modals/LocationFilterModal';
import { LoadingSpinner } from '../../../../components/UI/LoadingSpinner';

interface TeamHomeBusinessProps {
    myTeam: Team;
    businesses: Business[];
    isCaptain: boolean;
    isEditingPitch: boolean;
    setIsEditingPitch: (isEditing: boolean) => void;
    handleSetHomeBusiness: (id: string) => void;
    setIsCreateMatchModalOpen: (isOpen: boolean) => void;
    isLocationFilterOpen: boolean;
    setIsLocationFilterOpen: (open: boolean) => void;
    locationFilter: LocationFilter;
    applyLocationFilter: (filter: LocationFilter) => void;
    isLoadingLocation: boolean;
}

export const TeamHomeBusiness: React.FC<TeamHomeBusinessProps> = ({
    myTeam, businesses, isCaptain, isEditingPitch, setIsEditingPitch,
    handleSetHomeBusiness, setIsCreateMatchModalOpen,
    isLocationFilterOpen, setIsLocationFilterOpen, locationFilter, applyLocationFilter, isLoadingLocation
}) => {
    const selectedHomeBusiness = businesses.find(b => b.id === myTeam?.homeBusinessId);

    return (
        <>
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <h3 className="font-sport font-bold text-xl text-white flex items-center gap-2">
                    <Store className="w-5 h-5 text-turf-500" />
                    EV SAHİBİ SAHA
                </h3>
                {isCaptain && (
                    <button
                        onClick={() => setIsEditingPitch(!isEditingPitch)}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-lg transition-colors"
                    >
                        {selectedHomeBusiness ? 'Değiştir' : 'İşletme Seç'}
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
                    {isLoadingLocation ? (
                        <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                            <LoadingSpinner size="sm" text="" />
                            <p className="mt-2 text-xs">Konumunuz alınıyor...</p>
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
                </div>
            ) : (
                selectedHomeBusiness ? (
                    <div className="relative group">
                        <img src={selectedHomeBusiness.coverImageUrl || 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&q=80&w=2070'} className="w-full h-32 object-cover opacity-60" alt="Business" />
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
