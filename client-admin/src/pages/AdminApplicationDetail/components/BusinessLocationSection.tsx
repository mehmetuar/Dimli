import React from 'react';
import { APIProvider, Map as GoogleMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import { IconPin } from '../../../components/Icons';
import Section from './Section';

interface BusinessLocationSectionProps {
    app: any;
}

const BusinessLocationSection: React.FC<BusinessLocationSectionProps> = ({ app }) => {
    if (!app.latitude || !app.longitude) return null;

    return (
        <Section title="Konum" icon={<IconPin size={13} />}>
            <div className="rounded-xl overflow-hidden border border-slate-700/60" style={{ height: '220px' }}>
                <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                    <GoogleMap
                        defaultCenter={{ lat: app.latitude, lng: app.longitude }}
                        defaultZoom={15}
                        gestureHandling={'none'}
                        disableDefaultUI={true}
                        mapId="ADMIN_MAP_ID"
                        style={{ width: '100%', height: '100%' }}
                    >
                        <AdvancedMarker position={{ lat: app.latitude, lng: app.longitude }} />
                    </GoogleMap>
                </APIProvider>
            </div>
            <p className="flex items-center gap-1 text-slate-400 text-xs mt-2">
                <IconPin size={11} className="text-slate-500" />
                {app.latitude.toFixed(6)}, {app.longitude.toFixed(6)}
                <a
                    href={`https://www.google.com/maps?q=${app.latitude},${app.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-orange-400 hover:text-orange-300 text-xs font-bold transition-colors"
                >
                    Google Maps'te Aç →
                </a>
            </p>
        </Section>
    );
};

export default BusinessLocationSection;
