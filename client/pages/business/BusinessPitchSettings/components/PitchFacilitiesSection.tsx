import React from 'react';
import { ListChecks, Plus, Clock, Wifi, Droplets, Car, Zap, ShowerHead, Coffee, Wind, Shirt, Utensils, ParkingCircle, Dumbbell, Sun, Shield, Check } from 'lucide-react';

interface PitchFacilitiesSectionProps {
    allFacilities: string[];
    selectedFacilities: string[];
    onToggle: (facility: string) => void;
    onOpenModal: () => void;
    hasPendingFacility: boolean;
}

const FACILITY_ICONS: Record<string, React.ElementType> = {
    'Wifi': Wifi,
    'WiFi': Wifi,
    'Duş': ShowerHead,
    'Soyunma Odası': Shirt,
    'Otopark': ParkingCircle,
    'Araba Parkı': Car,
    'Kafe': Coffee,
    'Kafeterya': Utensils,
    'Aydınlatma': Zap,
    'Işıklandırma': Sun,
    'Su': Droplets,
    'İçecek': Droplets,
    'Spor Salonu': Dumbbell,
    'Klima': Wind,
    'Güvenlik': Shield,
};

function getFacilityIcon(name: string): React.ElementType {
    const key = Object.keys(FACILITY_ICONS).find(k =>
        name.toLowerCase().includes(k.toLowerCase())
    );
    return key ? FACILITY_ICONS[key] : ListChecks;
}

export const PitchFacilitiesSection: React.FC<PitchFacilitiesSectionProps> = ({
    allFacilities, selectedFacilities,
    onToggle, onOpenModal, hasPendingFacility,
}) => {
    return (
        <div className="bg-slate-800/70 rounded-2xl border border-slate-700/60 overflow-hidden"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>

            {/* Section Header */}
            <div className="px-4 py-3.5 border-b border-slate-700/50"
                style={{ background: 'linear-gradient(90deg, rgba(249,115,22,0.06) 0%, transparent 100%)' }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-orange-500/15 rounded-lg border border-orange-500/20">
                            <ListChecks className="w-4 h-4 text-orange-400" />
                        </div>
                        <div>
                            <h2 className="text-[clamp(13px,3.8vw,15px)] font-black text-white">Saha İmkanları</h2>
                            <p className="text-[clamp(9px,2.5vw,11px)] text-slate-400 mt-0.5">
                                {selectedFacilities.length} imkan seçili
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-2.5">
                    {allFacilities.map((facility) => {
                        const isSelected = selectedFacilities.includes(facility);
                        const Icon = getFacilityIcon(facility);
                        return (
                            <button key={facility} type="button"
                                onClick={() => onToggle(facility)}
                                className={`relative p-3 rounded-xl border text-left transition-all active:scale-[0.97] min-h-[52px] ${isSelected
                                    ? 'bg-orange-500/15 border-orange-500/50 text-orange-400'
                                    : 'bg-slate-900/50 border-slate-700/50 text-slate-400'
                                }`}
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-orange-400' : 'text-slate-500'}`} />
                                    <span className="text-[clamp(10px,2.8vw,12px)] font-bold leading-tight truncate">{facility}</span>
                                </div>
                                {isSelected && (
                                    <div className="absolute top-1.5 right-1.5">
                                        <Check className="w-3 h-3 text-orange-400" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {hasPendingFacility && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/25 rounded-xl flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                        <p className="text-[clamp(10px,2.8vw,12px)] text-yellow-400 font-medium">
                            Manuel imkan ekleme isteğiniz inceleme bekliyor.
                        </p>
                    </div>
                )}

                <button
                    type="button"
                    onClick={onOpenModal}
                    disabled={hasPendingFacility}
                    className="w-full py-3 bg-slate-900/50 border border-dashed border-slate-600/60 rounded-xl text-slate-400 hover:text-white hover:border-slate-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                    <Plus className="w-4 h-4" /> Manuel İmkan Ekle
                </button>
            </div>
        </div>
    );
};
