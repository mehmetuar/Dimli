import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
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

export const LocationStep: React.FC<LocationStepProps> = ({
    formData,
    updateBusiness,
    isGeocoding,
    setIsGeocoding
}) => {
    const LocationMarker = () => {
        useMapEvents({
            async click(e) {
                updateBusiness('latitude', e.latlng.lat);
                updateBusiness('longitude', e.latlng.lng);

                try {
                    setIsGeocoding(true);
                    const locationInfo = await locationService.reverseGeocode(e.latlng.lat, e.latlng.lng);
                    if (locationInfo) {
                        updateBusiness('city', locationInfo.city);
                        updateBusiness('district', locationInfo.district);
                    }
                } catch (error) {
                    console.error('Reverse geocoding error:', error);
                } finally {
                    setIsGeocoding(false);
                }
            },
        });
        return formData.business.latitude ? (
            <Marker position={[formData.business.latitude, formData.business.longitude]} />
        ) : null;
    };

    return (
        <div className="space-y-4 animate-fade-in h-full flex flex-col">
            <h2 className="text-xl font-bold text-white mb-2">Konum Seçimi</h2>
            <p className="text-sm text-slate-400 mb-4">Harita üzerinde işletmenizin konumunu işaretleyin. İl ve ilçe bilgileriniz otomatik doldurulacaktır.</p>
            <div className="flex-1 min-h-[400px] rounded-xl overflow-hidden border-2 border-slate-700 relative z-[1]">
                <MapContainer
                    center={[formData.business.latitude, formData.business.longitude]}
                    zoom={13}
                    style={{ height: '400px', width: '100%', borderRadius: '12px' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <LocationMarker />
                </MapContainer>
            </div>
            <div className="flex flex-col items-center gap-2 mt-2">
                {isGeocoding ? (
                    <div className="flex items-center gap-2 text-orange-500 animate-pulse text-sm font-bold">
                        <div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        KONUMDAN BİLGİ ALINIYOR...
                    </div>
                ) : (
                    (formData.business.city || formData.business.district) && (
                        <div className="text-sm font-bold text-green-500 bg-green-500/10 px-4 py-1.5 rounded-full border border-green-500/20">
                            {formData.business.city} {formData.business.district ? `/ ${formData.business.district}` : ''}
                        </div>
                    )
                )}
                <div className="text-center text-slate-500 text-[10px] font-mono">
                    {formData.business.latitude.toFixed(6)}, {formData.business.longitude.toFixed(6)}
                </div>
            </div>
        </div>
    );
};
