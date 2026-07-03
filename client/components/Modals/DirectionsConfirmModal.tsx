import React from 'react';
import { createPortal } from 'react-dom';
import { Navigation, X } from 'lucide-react';

// Cihazın varsayılan harita uygulamasında yol tarifini açar.
export const openDirectionsUrl = (lat: number, lng: number): void => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const url = isIOS
        ? `maps://?daddr=${lat},${lng}`
        : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_system');
};

interface DirectionsConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    businessName?: string;
    latitude?: number | null;
    longitude?: number | null;
}

// Yol Tarifi onay modalı — createPortal(document.body) + z-[90]: ata stacking
// context'leri fixed overlay'i hapsedemez (agent.md §35), z-[80] detay modallarının üstünde kalır.
export const DirectionsConfirmModal: React.FC<DirectionsConfirmModalProps> = ({
    isOpen, onClose, businessName, latitude, longitude
}) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        if (latitude != null && longitude != null) openDirectionsUrl(latitude, longitude);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-turf-400" />
                        <h3 className="text-white font-bold text-base">Yol Tarifi</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-slate-300 text-sm mb-6">
                    <span className="font-semibold text-white">{businessName}</span> için haritalar uygulaması açılacak. Devam etmek istiyor musunuz?
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl font-bold text-sm transition-all"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 bg-turf-600 hover:bg-turf-500 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-all"
                    >
                        <Navigation className="w-4 h-4" />
                        Haritayı Aç
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
