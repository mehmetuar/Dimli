import React, { useState } from 'react';
import { Palette } from 'lucide-react';
import { ColorPickerModal, TEAM_COLORS } from './ColorPickerModal';

interface TeamColorPickerProps {
    primaryColor: string;
    setPrimaryColor: (color: string) => void;
    secondaryColor: string;
    setSecondaryColor: (color: string) => void;
    isCaptain: boolean;
}

export const TeamColorPicker: React.FC<TeamColorPickerProps> = ({
    primaryColor,
    setPrimaryColor,
    secondaryColor,
    setSecondaryColor,
    isCaptain,
}) => {
    const [colorModal, setColorModal] = useState<'primary' | 'secondary' | null>(null);

    const colorLabel = (hex: string) =>
        TEAM_COLORS.find(c => c.hex.toLowerCase() === hex.toLowerCase())?.label ?? hex.toUpperCase();

    return (
        <>
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700/60 overflow-hidden">
                <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-slate-700/50">
                    <Palette className="w-4 h-4 text-turf-400" />
                    <span className="text-slate-300 text-sm font-bold uppercase tracking-widest">Takım Renkleri</span>
                </div>

                <div className="p-4 space-y-3">
                    {/* Ana Renk */}
                    <button
                        type="button"
                        disabled={!isCaptain}
                        onClick={() => isCaptain && setColorModal('primary')}
                        className="w-full flex items-center justify-between bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-3.5 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed hover:border-slate-600"
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-7 h-7 rounded-full border border-white/20 flex-shrink-0 shadow"
                                style={{ backgroundColor: primaryColor }}
                            />
                            <div className="text-left">
                                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Ana Renk</p>
                                <p className="text-white text-sm font-bold">{colorLabel(primaryColor)}</p>
                            </div>
                        </div>
                        {isCaptain && (
                            <Palette className="w-4 h-4 text-slate-500" />
                        )}
                    </button>

                    {/* İkincil Renk */}
                    <button
                        type="button"
                        disabled={!isCaptain}
                        onClick={() => isCaptain && setColorModal('secondary')}
                        className="w-full flex items-center justify-between bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-3.5 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed hover:border-slate-600"
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-7 h-7 rounded-full border border-white/20 flex-shrink-0 shadow"
                                style={{ backgroundColor: secondaryColor }}
                            />
                            <div className="text-left">
                                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">İkincil Renk</p>
                                <p className="text-white text-sm font-bold">{colorLabel(secondaryColor)}</p>
                            </div>
                        </div>
                        {isCaptain && (
                            <Palette className="w-4 h-4 text-slate-500" />
                        )}
                    </button>

                    {!isCaptain && (
                        <p className="text-slate-500 text-xs text-center pt-1">Renk değiştirmek için kaptan yetkisi gerekir</p>
                    )}
                </div>
            </div>

            <ColorPickerModal
                isOpen={colorModal === 'primary'}
                onClose={() => setColorModal(null)}
                value={primaryColor}
                onChange={setPrimaryColor}
                title="Ana Takım Rengi"
            />
            <ColorPickerModal
                isOpen={colorModal === 'secondary'}
                onClose={() => setColorModal(null)}
                value={secondaryColor}
                onChange={setSecondaryColor}
                title="İkincil Takım Rengi"
            />
        </>
    );
};

export { TEAM_COLORS };
