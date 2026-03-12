import React from 'react';
import { ChevronLeft, AlertTriangle } from 'lucide-react';

interface TeamSettingsHeaderProps {
    isCaptain: boolean;
    navigate: (path: number) => void;
}

export const TeamSettingsHeader: React.FC<TeamSettingsHeaderProps> = ({ isCaptain, navigate }) => {
    return (
        <header className="sticky top-0 z-10 bg-pitch/95 backdrop-blur-md border-b border-slate-700/50 flex items-center gap-3 px-4 py-3">
            <button
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
                <ChevronLeft className="w-7 h-7" />
            </button>
            <div className="flex-1">
                <h1 className="font-sport font-black text-2xl text-white italic tracking-wide uppercase">
                    Takım Ayarları
                </h1>
                {!isCaptain && (
                    <p className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3" /> Sadece kaptan değişiklik yapabilir
                    </p>
                )}
            </div>
        </header>
    );
};
