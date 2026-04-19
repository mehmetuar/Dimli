import React from 'react';
import { ChevronLeft, AlertTriangle, Save, Loader2 } from 'lucide-react';

interface TeamSettingsHeaderProps {
    isCaptain: boolean;
    isSaving: boolean;
    navigate: (path: number) => void;
    onSave: () => void;
}

export const TeamSettingsHeader: React.FC<TeamSettingsHeaderProps> = ({
    isCaptain,
    isSaving,
    navigate,
    onSave,
}) => {
    return (
        <header className="sticky top-0 z-10 bg-pitch/95 backdrop-blur-md border-b border-slate-700/50">
            <div className="flex items-center gap-3 px-4 py-3">
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

                {isCaptain && (
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 bg-turf-600 hover:bg-turf-500 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-xl transition-all active:scale-95"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Kaydet
                    </button>
                )}
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
