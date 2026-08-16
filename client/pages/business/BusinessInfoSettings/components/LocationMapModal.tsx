import React, { useEffect } from 'react';
import { MapPin, Loader2, Navigation, X } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';

// Sub-component: flies map to new coords
const MapEffect: React.FC<{ lat: number; lng: number; trigger: number }> = ({ lat, lng, trigger }) => {
    const map = useMap();
    useEffect(() => {
        if (map && trigger > 0 && lat && lng) {
            map.panTo({ lat, lng });
            map.setZoom(15);
        }
    }, [trigger, lat, lng, map]);
    return null;
};

interface LocationMapModalProps {
    isOpen: boolean;
    onClose: () => void;
    mapCoords: { lat: number; lng: number };
    mapFlyTrigger: number;
    isLocating: boolean;
    isGeocoding: boolean;
    mapLocationLabel: string;
    onLocateMe: () => void;
    onMapClick: (e: any) => void;
    onApply: () => void;
}

export const LocationMapModal: React.FC<LocationMapModalProps> = ({
    isOpen,
    onClose,
    mapCoords,
    mapFlyTrigger,
    isLocating,
    isGeocoding,
    mapLocationLabel,
    onLocateMe,
    onMapClick,
    onApply,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 animate-fade-in">
            {/* Header / Floating Bar */}
            <div 
                className="absolute top-0 left-0 right-0 z-10 px-4 pointer-events-none"
                style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
            >
                <div className="flex items-center gap-3 p-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] pointer-events-auto">
                    <button
                        onClick={onClose}
                        className="p-2.5 bg-slate-800 rounded-xl hover:bg-slate-700 active:scale-95 transition-all"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-black text-white text-[13px] truncate">Haritadan Konum Seç</h2>
                        <p className="text-[10px] text-slate-400 truncate">Haritaya tıkla veya konumunu bul</p>
                    </div>
                    <button
                        onClick={onLocateMe}
                        disabled={isLocating}
                        className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white text-[11px] font-bold px-3 py-2.5 rounded-xl transition-all active:scale-95 shadow-md shadow-orange-600/20 shrink-0"
                    >
                        {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                        {isLocating ? 'Bulunuyor' : 'Konumumu Bul'}
                    </button>
                </div>
            </div>

            {/* Map */}
            <div className="flex-1 relative z-[1]">
                <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                    <Map
                        defaultCenter={{ lat: mapCoords.lat, lng: mapCoords.lng }}
                        defaultZoom={14}
                        gestureHandling={'greedy'}
                        disableDefaultUI={true}
                        mapId="DEMO_MAP_ID_2"
                        onClick={onMapClick}
                    >
                        <AdvancedMarker position={{ lat: mapCoords.lat, lng: mapCoords.lng }} />
                        <MapEffect lat={mapCoords.lat} lng={mapCoords.lng} trigger={mapFlyTrigger} />
                    </Map>
                </APIProvider>
            </div>

            {/* Footer */}
            <div 
                className="bg-slate-900 border-t border-white/5 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.5)] relative z-10"
                style={{ paddingBottom: 'var(--safe-bottom)' }}
            >
                <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3 bg-slate-800/50 rounded-xl p-3 border border-white/5">
                        <div className="flex items-center gap-2 min-h-[28px] min-w-0">
                            {isGeocoding ? (
                                <div className="flex items-center gap-2 text-orange-400 text-[11px] font-bold animate-pulse">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Konum bilgisi alınıyor...
                                </div>
                            ) : mapLocationLabel ? (
                                <div className="flex items-center gap-1.5 text-green-400 text-[11px] font-bold bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20 truncate">
                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{mapLocationLabel}</span>
                                </div>
                            ) : (
                                <span className="text-slate-500 text-[11px] font-medium">Haritaya tıklayarak konum seçin</span>
                            )}
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono shrink-0 bg-slate-950/40 px-2 py-1 rounded-md">
                            {mapCoords.lat.toFixed(5)}, {mapCoords.lng.toFixed(5)}
                        </div>
                    </div>

                    <button
                        onClick={onApply}
                        className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-xl font-black uppercase tracking-wider transition-all shadow-lg shadow-orange-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        <MapPin className="w-5 h-5" />
                        BU KONUMU KAYDET
                    </button>
                </div>
            </div>
        </div>
    );
};
