import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, MapPin, Loader2 } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { locationService } from '../../../../../services/locationService';

// Fix for default marker icon in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationStepProps {
    formData: any;
    updateBusiness: (field: string, value: any) => void;
    isGeocoding: boolean;
    setIsGeocoding: (val: boolean) => void;
}

// Inner component that can call useMap hook
const MapFlyTo: React.FC<{ lat: number; lng: number; triggerFly: boolean }> = ({ lat, lng, triggerFly }) => {
    const map = useMap();
    const prevTrigger = useRef(false);
    useEffect(() => {
        if (triggerFly && !prevTrigger.current) {
            map.flyTo([lat, lng], 15, { duration: 1.5 });
        }
        prevTrigger.current = triggerFly;
    }, [triggerFly, lat, lng, map]);
    return null;
};

export const LocationStep: React.FC<LocationStepProps> = ({
    formData,
    updateBusiness,
    isGeocoding,
    setIsGeocoding
}) => {
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState('');
    const [flyTrigger, setFlyTrigger] = useState(false);

    // On mount: try to get device location to center map
    useEffect(() => {
        handleLocateMe(true);
    }, []);

    const doReverseGeocode = async (lat: number, lng: number) => {
        try {
            setIsGeocoding(true);
            const locationInfo = await locationService.reverseGeocode(lat, lng);
            if (locationInfo) {
                updateBusiness('city', locationInfo.city);
                updateBusiness('district', locationInfo.district);
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
        } finally {
            setIsGeocoding(false);
        }
    };

    const handleLocateMe = async (silent = false) => {
        setIsLocating(true);
        setLocationError('');
        try {
            // Use Capacitor Geolocation (works on iOS, Android, and Web)
            const permission = await Geolocation.requestPermissions();
            if (permission.location === 'denied') {
                if (!silent) setLocationError('Konum izni reddedildi. Lütfen ayarlardan izin verin.');
                return;
            }
            const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            updateBusiness('latitude', lat);
            updateBusiness('longitude', lng);
            setFlyTrigger(f => !f as any);

            await doReverseGeocode(lat, lng);
        } catch (err: any) {
            if (!silent) {
                setLocationError('Konum alınamadı. Haritaya tıklayarak konumunuzu seçebilirsiniz.');
            }
            console.error('Geolocation error:', err);
        } finally {
            setIsLocating(false);
        }
    };

    const LocationMarker = () => {
        useMapEvents({
            async click(e) {
                updateBusiness('latitude', e.latlng.lat);
                updateBusiness('longitude', e.latlng.lng);
                await doReverseGeocode(e.latlng.lat, e.latlng.lng);
            },
        });
        return formData.business.latitude ? (
            <Marker position={[formData.business.latitude, formData.business.longitude]} />
        ) : null;
    };

    return (
        <div className="space-y-4 animate-fade-in h-full flex flex-col">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-white mb-1">Konum Seçimi</h2>
                    <p className="text-xs text-slate-400">
                        Haritaya tıklayın veya <strong className="text-orange-400">Konumumu Kullan</strong> butonunu kullanın.
                        İl ve ilçe bilgileriniz otomatik doldurulacaktır.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => handleLocateMe(false)}
                    disabled={isLocating}
                    className="flex-shrink-0 flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-95"
                >
                    {isLocating
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Navigation className="w-4 h-4" />
                    }
                    {isLocating ? 'Bulunuyor...' : 'Konumumu Kullan'}
                </button>
            </div>

            {locationError && (
                <div className="text-xs text-amber-400 bg-amber-900/20 border border-amber-500/30 px-3 py-2 rounded-lg flex items-center gap-2">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {locationError}
                </div>
            )}

            <div className="flex-1 min-h-[380px] rounded-xl overflow-hidden border-2 border-slate-700 relative z-[1]">
                <MapContainer
                    center={[formData.business.latitude || 41.0082, formData.business.longitude || 28.9784]}
                    zoom={13}
                    style={{ height: '380px', width: '100%' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <LocationMarker />
                    <MapFlyTo
                        lat={formData.business.latitude || 41.0082}
                        lng={formData.business.longitude || 28.9784}
                        triggerFly={flyTrigger}
                    />
                </MapContainer>
            </div>

            <div className="flex flex-col items-center gap-1.5">
                {isGeocoding ? (
                    <div className="flex items-center gap-2 text-orange-500 animate-pulse text-sm font-bold">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        KONUM BİLGİSİ ALINIYOR...
                    </div>
                ) : (
                    (formData.business.city || formData.business.district) && (
                        <div className="text-sm font-bold text-green-400 bg-green-500/10 px-4 py-1.5 rounded-full border border-green-500/20 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {formData.business.city}{formData.business.district ? ` / ${formData.business.district}` : ''}
                        </div>
                    )
                )}
                {formData.business.latitude && (
                    <div className="text-center text-slate-600 text-[10px] font-mono">
                        {Number(formData.business.latitude).toFixed(6)}, {Number(formData.business.longitude).toFixed(6)}
                    </div>
                )}
            </div>
        </div>
    );
};
