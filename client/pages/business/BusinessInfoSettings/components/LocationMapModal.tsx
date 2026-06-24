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
            {/* Header */}
            <div className="flex items-center gap-3 p-4 bg-slate-900 border-b border-slate-700">
                <button
                    onClick={onClose}
                    className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                >
                    <X className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1">
                    <h2 className="font-bold text-white text-base">Haritadan Konum Seç</h2>
                    <p className="text-xs text-slate-400">Haritaya tıklayın veya konumunuzu kullanın</p>
                </div>
                <button
                    onClick={onLocateMe}
                    disabled={isLocating}
                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all"
                >
                    {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                    {isLocating ? 'Bulunuyor' : 'Konumumu Bul'}
                </button>
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
            <div className="p-4 bg-slate-900 border-t border-slate-700 space-y-3">
                <div className="flex items-center gap-2 min-h-[28px]">
                    {isGeocoding ? (
                        <div className="flex items-center gap-2 text-orange-400 text-sm animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Konum bilgisi alınıyor...
                        </div>
                    ) : mapLocationLabel ? (
                        <div className="flex items-center gap-1.5 text-green-400 text-sm font-bold bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
                            <MapPin className="w-3.5 h-3.5" />
                            {mapLocationLabel}
                        </div>
                    ) : (
                        <span className="text-slate-500 text-xs">Haritaya tıklayarak konum seçin</span>
                    )}
                    <div className="ml-auto text-[10px] text-slate-600 font-mono">
                        {mapCoords.lat.toFixed(5)}, {mapCoords.lng.toFixed(5)}
                    </div>
                </div>

                <button
                    onClick={onApply}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-xl font-black uppercase tracking-wider transition-all shadow-lg shadow-orange-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    <MapPin className="w-5 h-5" />
                    BU KONUMU KAYDET
                </button>
            </div>
        </div>
    );
};
