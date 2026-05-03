import React from 'react';
import { MapPin, Settings, X, WifiOff } from 'lucide-react';
import { openLocationSettings } from '../utils/openLocationSettings';

export type LocationErrorType =
    | 'permission_denied'
    | 'gps_disabled'
    | 'timeout'
    | 'unknown';

interface Props {
    errorType: LocationErrorType | null;
    onClose: () => void;
}

const CONTENT: Record<'permission_denied' | 'gps_disabled', { title: string; body: string }> = {
    permission_denied: {
        title: 'Konum İzni Gerekli',
        body: "Dimli'nin konumunuza erişmesi için ayarlardan konum iznini etkinleştirin.",
    },
    gps_disabled: {
        title: 'Konum Servisleri Kapalı',
        body: 'GPS kapalı. Yakınındaki içerikleri görmek için cihazınızın konum servislerini açın.',
    },
};

export const LocationPermissionSheet: React.FC<Props> = ({ errorType, onClose }) => {
    if (!errorType || errorType === 'timeout' || errorType === 'unknown') return null;

    const { title, body } = CONTENT[errorType];
    const Icon = errorType === 'gps_disabled' ? WifiOff : MapPin;

    const handleOpenSettings = async () => {
        onClose();
        await openLocationSettings();
    };

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 z-40"
                onClick={onClose}
            />

            {/* Bottom Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700 rounded-t-2xl px-6 pt-5 pb-10 animate-slide-up">
                {/* Drag handle */}
                <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-5" />

                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                        <Icon className="w-7 h-7 text-orange-400" />
                    </div>
                </div>

                {/* Text */}
                <h2 className="text-white text-lg font-bold text-center mb-2">{title}</h2>
                <p className="text-slate-400 text-sm text-center leading-relaxed mb-6">{body}</p>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleOpenSettings}
                        className="flex items-center justify-center gap-2 w-full bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-bold py-3.5 rounded-xl transition-all"
                    >
                        <Settings className="w-4 h-4" />
                        Ayarlara Git
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full text-slate-400 hover:text-white font-medium py-2.5 text-sm transition-colors"
                    >
                        Şimdi Değil
                    </button>
                </div>
            </div>
        </>
    );
};
