import React from 'react';
import { MapPin, Settings, WifiOff } from 'lucide-react';
import { useLocationGate } from '../hooks/useLocationGate';
import { openLocationSettings } from '../utils/openLocationSettings';
import { LoadingSpinner } from './UI/LoadingSpinner';

interface LocationAccessGateProps {
    children?: React.ReactNode;
    /** Görünür içeriği tanımlayan isim, örn. "sahaları", "maç ilanlarını", "joker oyuncuları" */
    contentLabel: string;
    /** Modal/gömülü bölümler için daha az dikey boşluk kullan */
    compact?: boolean;
}

export const LocationAccessGate: React.FC<LocationAccessGateProps> = ({ children, contentLabel, compact }) => {
    const { state } = useLocationGate();

    if (state === 'ready') return <>{children}</>;

    const py = compact ? 'py-10' : 'py-16';

    if (state === 'loading') {
        return (
            <div className={`flex flex-col items-center justify-center ${py} text-slate-400`}>
                <LoadingSpinner />
                <p className="mt-4 text-sm font-medium">Konumunuz alınıyor...</p>
                <p className="text-xs text-slate-500 mt-1">Yakınındaki {contentLabel} yükleniyor</p>
            </div>
        );
    }

    const isGpsDisabled = state === 'gps_disabled';
    return (
        <div className={`flex flex-col items-center justify-center ${py} px-6 text-center`}>
            <div className="w-16 h-16 rounded-2xl bg-turf-600/10 border border-turf-600/20 flex items-center justify-center mb-5">
                {isGpsDisabled ? <WifiOff className="w-8 h-8 text-turf-400" /> : <MapPin className="w-8 h-8 text-turf-400" />}
            </div>
            <h3 className="text-white font-bold text-lg mb-2">
                {isGpsDisabled ? 'Konum Servisleri Kapalı' : 'Konum İzni Gerekli'}
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
                {isGpsDisabled
                    ? 'GPS kapalı. Yakınındaki içerikleri görmek için cihazının konum servislerini aç.'
                    : `Yakınındaki ${contentLabel} görmek için ayarlardan konum iznini etkinleştir.`}
            </p>
            <button
                onClick={openLocationSettings}
                className="flex items-center gap-2 bg-turf-600 hover:bg-turf-500 active:scale-95 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
                <Settings className="w-4 h-4" />
                Ayarlara Git
            </button>
        </div>
    );
};
