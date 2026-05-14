import React, { useState, useEffect } from 'react';
import { X, Navigation, Check } from 'lucide-react';
import { useLocationContext } from '../../contexts/LocationContext';
import { useModalBodyClass } from '../../utils/useModalBodyClass';

interface LocationFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFilter: LocationFilter;
    onApply: (filter: LocationFilter) => void;
}

export interface LocationFilter {
    type: 'ALL' | 'NEARBY';
    radius?: number; // km
    coords?: { lat: number; lng: number }; // User's location for "NEARBY"
}

export const LocationFilterModal: React.FC<LocationFilterModalProps> = ({ isOpen, onClose, currentFilter, onApply }) => {
    const { coords, isLocating, requestLocation } = useLocationContext();

    const [radius, setRadius] = useState(currentFilter.radius || 20);

    // Sync radius from currentFilter when modal opens
    useEffect(() => {
        if (isOpen) {
            setRadius(currentFilter.radius || 20);
        }
    }, [isOpen, currentFilter.radius]);

    useModalBodyClass(isOpen);

    const handleApply = () => {
        if (!coords) return; // should not happen — button disabled when no coords
        onApply({
            type: 'NEARBY',
            radius,
            coords,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 w-full max-w-sm rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900">
                    <h3 className="font-sport font-black text-xl text-white italic uppercase">KONUM FİLTRESİ</h3>
                    <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-6 overflow-y-auto">

                    {/* Yakınlık Filtresi */}
                    <div className="p-4 rounded-xl border bg-turf-900/20 border-turf-500">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-5 h-5 rounded-full border flex items-center justify-center border-turf-500 bg-turf-500">
                                <Check className="w-3 h-3 text-slate-900" />
                            </div>
                            <span className="font-bold flex-1 text-white">Yakınımda</span>
                            {isLocating && <span className="text-xs text-turf-500 animate-pulse">Konum alınıyor...</span>}
                        </div>

                        <div className="pl-8 animate-fade-in">
                            {!coords ? (
                                <button
                                    onClick={requestLocation}
                                    disabled={isLocating}
                                    className="text-xs bg-slate-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-600 mb-2 disabled:opacity-50"
                                >
                                    <Navigation className="w-3 h-3" />
                                    {isLocating ? 'Konum alınıyor...' : 'Konumumu Bul'}
                                </button>
                            ) : (
                                <div className="mb-4">
                                    <span className="text-xs text-green-400 flex items-center gap-1 mb-2">
                                        <Check className="w-3 h-3" /> Konum alındı
                                    </span>
                                    <label className="text-xs text-slate-500 block mb-1">Mesafe: <span className="text-white font-bold">{radius} km</span></label>
                                    <input
                                        type="range"
                                        min="5"
                                        max="100"
                                        step="5"
                                        value={radius}
                                        onChange={(e) => setRadius(Number(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-turf-500"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                        <span>5km</span>
                                        <span>100km</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {!coords && !isLocating && (
                        <div className="text-amber-400 text-xs bg-amber-900/20 p-3 rounded-lg flex items-center gap-2">
                            <Navigation className="w-3 h-3" /> Yakınındaki içerikleri görmek için konumunu paylaş.
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-slate-700 bg-slate-900">
                    <button
                        onClick={handleApply}
                        disabled={!coords}
                        className="w-full bg-turf-600 hover:bg-turf-500 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-turf-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Filtreyi Uygula
                    </button>
                </div>
            </div>
        </div>
    );
};
