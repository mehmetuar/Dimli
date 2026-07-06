import React, { useState } from 'react';
import { WifiOff, RotateCw } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Ağ hatası boş-durumu — "Veri bulunamadı" / boş liste yerine bağlantı sorununu
// AÇIKÇA söyler + Tekrar Dene sunar (stil emsali: BusinessStats hata ekranı).
// Sayfalar isNetworkError(err) ayrımıyla bunu ya da gerçek boş-durumu gösterir.
// accent: müşteri yüzeyleri 'turf' (yeşil), işletme paneli 'orange'.
// fullScreen: tam-ekran yüzeyler (BusinessDashboard, MyTeam); listelerde inline.
// ─────────────────────────────────────────────────────────────────────────────

interface OfflineEmptyStateProps {
    onRetry: () => void | Promise<void>;
    title?: string;
    description?: string;
    accent?: 'turf' | 'orange';
    fullScreen?: boolean;
}

export const OfflineEmptyState: React.FC<OfflineEmptyStateProps> = ({
    onRetry,
    title = 'Bağlantı yok',
    description = 'İnternet bağlantınızı kontrol edip tekrar deneyin.',
    accent = 'turf',
    fullScreen = false,
}) => {
    const [retrying, setRetrying] = useState(false);

    const handleRetry = async () => {
        if (retrying) return;
        setRetrying(true);
        try {
            await onRetry();
        } finally {
            setRetrying(false);
        }
    };

    const buttonAccent =
        accent === 'orange'
            ? 'bg-orange-500 shadow-orange-500/20'
            : 'bg-turf-500 shadow-turf-500/20';

    const content = (
        <div className="flex flex-col items-center justify-center gap-4 py-10 px-6">
            <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60 max-w-xs">
                <WifiOff className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                <p className="text-white font-black uppercase italic text-sm text-center">{title}</p>
                <p className="text-slate-400 font-bold text-xs text-center mt-1">{description}</p>
            </div>
            <button
                onClick={() => void handleRetry()}
                disabled={retrying}
                className={`flex items-center gap-2 px-6 py-3 ${buttonAccent} text-white rounded-xl font-black uppercase italic text-sm shadow-lg active:scale-95 transition-transform disabled:opacity-60`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
            >
                <RotateCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} /> Tekrar Dene
            </button>
        </div>
    );

    if (!fullScreen) return content;
    return (
        <div className="fixed inset-0 bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center pb-24">
            {content}
        </div>
    );
};
