import React from 'react';
import { Palette } from 'lucide-react';

interface TeamColorPickerProps {
    primaryColor: string;
    setPrimaryColor: (color: string) => void;
    secondaryColor: string;
    setSecondaryColor: (color: string) => void;
    isCaptain: boolean;
    PRIMARY_COLORS: Array<{ value: string; label: string; hex: string }>;
    selectedColor: any;
    selectedSecondary: any;
}

export const TeamColorPicker: React.FC<TeamColorPickerProps> = ({
    primaryColor, setPrimaryColor,
    secondaryColor, setSecondaryColor,
    isCaptain,
    PRIMARY_COLORS,
    selectedColor,
    selectedSecondary
}) => {
    return (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <label className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                <Palette className="w-3.5 h-3.5" /> Takım Renkleri
            </label>

            {/* Ana Renk */}
            <div className="space-y-2">
                <p className="text-slate-300 text-sm font-bold">Ana Renk</p>
                <div className="flex flex-wrap gap-3">
                    {PRIMARY_COLORS.map(c => (
                        <button
                            key={c.value}
                            onClick={() => isCaptain && setPrimaryColor(c.value)}
                            disabled={!isCaptain}
                            title={c.label}
                            className={`w-10 h-10 rounded-full transition-all active:scale-90 disabled:cursor-not-allowed ${primaryColor === c.value
                                ? 'ring-4 ring-offset-2 ring-offset-slate-800 ring-white scale-110'
                                : 'hover:scale-105'
                                } ${c.value === 'bg-white' ? 'border border-slate-600' : ''}`}
                            style={{ backgroundColor: c.hex }}
                        />
                    ))}
                </div>
                <p className="text-xs text-slate-500">Seçili: <span className="font-bold text-slate-300">{selectedColor.label}</span></p>
            </div>

            {/* İkincil Renk */}
            <div className="space-y-2 pt-2 border-t border-slate-700">
                <p className="text-slate-300 text-sm font-bold">İkincil Renk</p>
                <div className="flex flex-wrap gap-3">
                    {PRIMARY_COLORS.map(c => (
                        <button
                            key={c.value}
                            onClick={() => isCaptain && setSecondaryColor(c.value)}
                            disabled={!isCaptain}
                            title={c.label}
                            className={`w-10 h-10 rounded-full transition-all active:scale-90 disabled:cursor-not-allowed ${secondaryColor === c.value
                                ? 'ring-4 ring-offset-2 ring-offset-slate-800 ring-white scale-110'
                                : 'hover:scale-105'
                                } ${c.value === 'bg-white' ? 'border border-slate-600' : ''}`}
                            style={{ backgroundColor: c.hex }}
                        />
                    ))}
                </div>
                <p className="text-xs text-slate-500">Seçili: <span className="font-bold text-slate-300">{selectedSecondary.label}</span></p>
            </div>
        </div>
    );
};
