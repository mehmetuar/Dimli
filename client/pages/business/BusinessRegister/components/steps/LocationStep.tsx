import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Navigation, MapPin, Loader2, Lock, Settings } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { locationService } from '../../../../../services/locationService';
import { openLocationSettings } from '../../../../../utils/openLocationSettings';
import { useKeyboardHeight } from '../../../../../utils/useKeyboardHeight';

interface LocationStepProps {
    formData: any;
    updateBusiness: (field: string, value: any) => void;
    isGeocoding: boolean;
    setIsGeocoding: (val: boolean) => void;
    fieldErrors?: Record<string, string>;
}

const MapEffect: React.FC<{ lat: number; lng: number; triggerFly: boolean }> = ({ lat, lng, triggerFly }) => {
    const map = useMap();
    useEffect(() => {
        if (map && triggerFly && lat && lng && lat !== 0 && lng !== 0) {
            map.panTo({ lat, lng });
            map.setZoom(15);
        }
    }, [triggerFly, lat, lng, map]);
    return null;
};

export const LocationStep: React.FC<LocationStepProps> = ({
    formData,
    updateBusiness,
    isGeocoding,
    setIsGeocoding,
    fieldErrors = {},
}) => {
    const keyboardHeight = useKeyboardHeight();
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState('');
    const [locationNeedsSettings, setLocationNeedsSettings] = useState(false);
    const [flyTrigger, setFlyTrigger] = useState(false);
    const [hasAttemptedLocation, setHasAttemptedLocation] = useState(false);

    useEffect(() => {
        if (formData.business.latitude) return;
        handleLocateMe(true);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        setLocationNeedsSettings(false);
        try {
            const permission = await Geolocation.requestPermissions();
            if (permission.location === 'denied') {
                if (!silent) {
                    setLocationError('Konum izni reddedildi. Ayarlardan konum iznini etkinleştirin.');
                    setLocationNeedsSettings(true);
                }
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
            console.error('Geolocation error:', err);
            if (!silent) {
                const code = err?.code;
                if (code === 1) {
                    setLocationError('Konum izni reddedildi. Ayarlardan konum iznini etkinleştirin.');
                    setLocationNeedsSettings(true);
                } else if (code === 2) {
                    setLocationError('GPS kapalı. Cihazınızın konum servislerini açın.');
                    setLocationNeedsSettings(true);
                } else {
                    setLocationError('Konum alınamadı. Haritaya tıklayarak konumunuzu seçebilirsiniz.');
                }
            }
        } finally {
            setIsLocating(false);
            setHasAttemptedLocation(true);
        }
    };

    const handleMapClick = async (e: any) => {
        if (!e.detail.latLng) return;
        const lat = e.detail.latLng.lat;
        const lng = e.detail.latLng.lng;
        updateBusiness('latitude', lat);
        updateBusiness('longitude', lng);
        await doReverseGeocode(lat, lng);
    };

    const hasLocation = !!formData.business.latitude;
    const hasCity = !!(formData.business.city || formData.business.district);
    const addressError = fieldErrors['business.address'];
    const cityError = fieldErrors['business.city'];

    return (
        <div className="space-y-4 animate-fade-in h-full flex flex-col">
            {/* Başlık + GPS butonu */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg md:text-xl font-bold text-white mb-1">Konum Seçimi</h2>
                    <p className="text-xs text-slate-400">
                        Haritaya tıklayın veya{' '}
                        <strong className="text-orange-400">Konumumu Kullan</strong> butonunu kullanın.
                        İl ve ilçe otomatik tespit edilecektir.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => handleLocateMe(false)}
                    disabled={isLocating}
                    className="shrink-0 flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-95 min-h-[44px]"
                >
                    {isLocating
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Navigation className="w-4 h-4" />
                    }
                    {isLocating ? 'Bulunuyor...' : 'Konumu Bul'}
                </button>
            </div>

            {locationError && (
                <div className="text-xs text-amber-400 bg-amber-900/20 border border-amber-500/30 px-3 py-2 rounded-lg flex items-start gap-2">
                    <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                    <span className="flex-1">{locationError}</span>
                    {locationNeedsSettings && (
                        <button
                            type="button"
                            onClick={openLocationSettings}
                            className="flex items-center gap-1 text-orange-400 hover:text-orange-300 font-bold shrink-0 transition-colors"
                        >
                            <Settings className="w-3 h-3" />
                            Ayarlar
                        </button>
                    )}
                </div>
            )}

            {cityError && (
                <div className="text-xs text-red-400 bg-red-900/20 border border-red-500/30 px-3 py-2 rounded-lg flex items-center gap-2">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {cityError}
                </div>
            )}

            {/* Harita — gerçek konum bulunana kadar pulsing animasyon, default koordinat asla gösterilmez */}
            {isLocating || (!formData.business.latitude && !hasAttemptedLocation) ? (
                <div
                    className="rounded-xl border-2 border-slate-700 bg-slate-900/50 flex flex-col items-center justify-center gap-4"
                    style={{ height: 'clamp(180px, 38vw, 260px)' }}
                >
                    <div className="relative flex items-center justify-center">
                        <span className="absolute inline-flex h-14 w-14 rounded-full bg-orange-500/25 animate-ping" />
                        <span className="absolute inline-flex h-9 w-9 rounded-full bg-orange-500/20 animate-ping" style={{ animationDelay: '300ms' }} />
                        <div className="relative z-10 w-12 h-12 rounded-full bg-slate-800 border-2 border-orange-500/50 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-orange-400" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-bold text-white">Konumunuz bulunuyor...</p>
                        <p className="text-xs text-slate-500 mt-1">Lütfen bekleyin</p>
                    </div>
                </div>
            ) : (
                <div className={`rounded-xl overflow-hidden border-2 relative z-[1] ${cityError ? 'border-red-500' : 'border-slate-700'}`} style={{ height: 'clamp(180px, 38vw, 260px)' }}>
                    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                        <Map
                            defaultCenter={
                                formData.business.latitude
                                    ? { lat: formData.business.latitude, lng: formData.business.longitude }
                                    : { lat: 38.9, lng: 35.2 }
                            }
                            defaultZoom={formData.business.latitude ? 13 : 5}
                            gestureHandling={'greedy'}
                            disableDefaultUI={true}
                            mapId="DEMO_MAP_ID"
                            onClick={handleMapClick}
                        >
                            {!!formData.business.latitude && (
                                <AdvancedMarker position={{ lat: formData.business.latitude, lng: formData.business.longitude }} />
                            )}
                            <MapEffect
                                lat={formData.business.latitude}
                                lng={formData.business.longitude}
                                triggerFly={flyTrigger}
                            />
                        </Map>
                    </APIProvider>
                    {!formData.business.latitude && (
                        <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none">
                            <span className="bg-slate-900/80 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg">
                                Haritaya tıklayarak konumunuzu seçin
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Geocoding durumu — klavye açıkken adres alanına yer açmak için gizlenir */}
            {keyboardHeight === 0 && (
                isGeocoding ? (
                    <div className="flex items-center gap-2 text-orange-500 animate-pulse text-xs font-bold">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        KONUM BİLGİSİ ALINIYOR...
                    </div>
                ) : hasCity ? (
                    <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3">
                        <Lock className="w-3.5 h-3.5 text-green-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Tespit Edilen Konum (değiştirilemez)</p>
                            <p className="text-sm font-bold text-green-400 truncate">
                                {formData.business.city}{formData.business.district ? ` / ${formData.business.district}` : ''}
                            </p>
                        </div>
                        {hasLocation && (
                            <span className="text-[10px] text-slate-600 font-mono shrink-0">
                                {Number(formData.business.latitude).toFixed(4)}, {Number(formData.business.longitude).toFixed(4)}
                            </span>
                        )}
                    </div>
                ) : hasLocation ? (
                    <div className="text-xs text-slate-500 text-center">Konum bilgisi alınıyor...</div>
                ) : (
                    <div className="text-xs text-slate-600 text-center">Haritaya tıklayarak konumunuzu belirleyin.</div>
                )
            )}

            {/* Açık Adres */}
            <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-bold uppercase ml-1">
                    Açık Adres <span className="text-red-500">*</span>
                </label>
                <textarea
                    className={`w-full bg-slate-800 border text-white text-sm p-3 rounded-xl focus:outline-none transition-all font-medium min-h-[80px] resize-none ${
                        addressError ? 'border-red-500 focus:border-red-400' : 'border-slate-700 focus:border-orange-500'
                    }`}
                    placeholder="Sokak, cadde, bina no gibi detaylı adres bilgisini girin..."
                    value={formData.business.address}
                    onChange={(e) => updateBusiness('address', e.target.value)}
                />
                {addressError && (
                    <p className="text-red-400 text-xs font-bold ml-1 mt-0.5 animate-fade-in">{addressError}</p>
                )}
            </div>
        </div>
    );
};
