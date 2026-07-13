import React from 'react';
import { ChevronLeft, AlertTriangle } from 'lucide-react';

interface TeamSettingsHeaderProps {
    isCaptain: boolean;
    navigate: (path: number) => void;
}

// Kaydet başlıktan KALDIRILDI (tek kayıt noktası: sayfa altındaki durum-duyarlı
// buton) — diğer ayar sayfalarının sade başlık deseniyle tutarlı.
export const TeamSettingsHeader: React.FC<TeamSettingsHeaderProps> = ({
    isCaptain,
    navigate,
}) => {
    return (
        <header className="bg-pitch/95 backdrop-blur-sm border-b border-slate-800/60">
            <div className="flex items-center gap-3 px-4 py-4 max-w-lg mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-7 h-7" />
                </button>

                <div className="flex-1">
                    <h1 className="font-sport font-black text-xl text-white italic tracking-wide uppercase">
                        Takım Ayarları
                    </h1>
                </div>

            </div>

            {!isCaptain && (
                <div className="px-4 pb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-amber-400">Sadece kaptan değişiklik yapabilir</p>
                </div>
            )}
        </header>
    );
};
