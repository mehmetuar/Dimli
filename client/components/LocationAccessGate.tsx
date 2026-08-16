import React from 'react';
import { MapPin, Settings, WifiOff, RotateCw } from 'lucide-react';
import { useLocationGate } from '../hooks/useLocationGate';
import { useLocationContext } from '../contexts/LocationContext';
import { openLocationSettings, openLocationServiceSettings } from '../utils/openLocationSettings';
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
    const { requestLocation } = useLocationContext();

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

    // §104: konum AÇIK ama ağ tabanlı konum (Google Konum Doğruluğu) KAPALI —
    // kapalı mekânda GPS tek başına fix üretemez; kullanıcıyı DOĞRU ayara yönlendir.
    if (state === 'network_location_off') {
        return (
            <div className={`flex flex-col items-center justify-center ${py} px-6 text-center`}>
                <div className="w-16 h-16 rounded-2xl bg-turf-600/10 border border-turf-600/20 flex items-center justify-center mb-5">
                    <WifiOff className="w-8 h-8 text-turf-400" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Konum Doğruluğu Kapalı</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    Cihazında ağ tabanlı konum (Google Konum Doğruluğu) kapalı. Kapalı
                    mekânda konum alabilmek için konum ayarlarından bu özelliği aç.
                </p>
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    <button
                        onClick={openLocationServiceSettings}
                        className="flex items-center justify-center gap-2 bg-turf-600 hover:bg-turf-500 active:scale-95 text-white font-bold py-3 px-6 rounded-xl transition-all"
                    >
                        <Settings className="w-4 h-4" />
                        Konum Ayarlarını Aç
                    </button>
                    <button
                        onClick={() => { void requestLocation(); }}
                        className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold py-3 px-6 rounded-xl border border-slate-700 transition-all"
                    >
                        <RotateCw className="w-4 h-4" />
                        Tekrar Dene
                    </button>
                </div>
            </div>
        );
    }

    if (state === 'timeout') {
        return (
            <div className={`flex flex-col items-center justify-center ${py} px-6 text-center`}>
                <div className="w-16 h-16 rounded-2xl bg-turf-600/10 border border-turf-600/20 flex items-center justify-center mb-5">
                    <MapPin className="w-8 h-8 text-turf-400" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Konum alınamadı</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    Konumun şu an alınamadı. Lütfen tekrar dene.
                </p>
                <button
                    onClick={() => { void requestLocation(); }}
                    className="flex items-center gap-2 bg-turf-600 hover:bg-turf-500 active:scale-95 text-white font-bold py-3 px-6 rounded-xl transition-all"
                >
                    <RotateCw className="w-4 h-4" />
                    Tekrar Dene
                </button>
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
