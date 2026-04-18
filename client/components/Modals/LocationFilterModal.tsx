import React, { useState, useEffect } from 'react';
import { X, Navigation, Check } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';

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
    const [radius, setRadius] = useState(currentFilter.radius || 20);
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(currentFilter.coords || null);
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setRadius(currentFilter.radius || 60);
            setUserCoords(currentFilter.coords || null);
        }
    }, [isOpen, currentFilter]);

    const handleLocateMe = async () => {
        setIsLocating(true);
        setLocationError('');
        try {
            const permission = await Geolocation.requestPermissions();
            if (permission.location === 'denied') {
                setLocationError('Konum izni reddedildi. Lütfen ayarlardan izin verin.');
                return;
            }
            const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
            setUserCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        } catch (error) {
            setLocationError('Konum alınamadı. Lütfen izin verin.');
            console.error(error);
        } finally {
            setIsLocating(false);
        }
    };

    const handleApply = () => {
        if (!userCoords) {
            setLocationError('Konumunuzu belirlemelisiniz.');
            return;
        }

        onApply({
            type: 'NEARBY',
            radius,
            coords: userCoords
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
                            {!userCoords ? (
                                <button
                                    onClick={handleLocateMe}
                                    className="text-xs bg-slate-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-600 mb-2"
                                >
                                    <Navigation className="w-3 h-3" /> Konumumu Bul
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

                    {locationError && (
                        <div className="text-red-400 text-xs bg-red-900/20 p-3 rounded-lg flex items-center gap-2">
                            <X className="w-3 h-3" /> {locationError}
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-slate-700 bg-slate-900">
                    <button
                        onClick={handleApply}
                        className="w-full bg-turf-600 hover:bg-turf-500 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-turf-600/20"
                    >
                        Filtreyi Uygula
                    </button>
                </div>
            </div>
        </div>
    );
};
