import React from 'react';
import { Palette, Check } from 'lucide-react';

export const TEAM_COLORS = [
    // Mavi ailesi
    { label: 'Mavi', hex: '#3b82f6' },
    { label: 'Lacivert', hex: '#1e3a8a' },
    { label: 'Gökyüzü', hex: '#38bdf8' },
    // Yeşil ailesi
    { label: 'Yeşil', hex: '#22c55e' },
    { label: 'Koyu Yeşil', hex: '#15803d' },
    { label: 'Çimen', hex: '#84cc16' },
    // Kırmızı & Sıcak
    { label: 'Kırmızı', hex: '#ef4444' },
    { label: 'Bordo', hex: '#9f1239' },
    { label: 'Turuncu', hex: '#f97316' },
    // Sarı
    { label: 'Sarı', hex: '#facc15' },
    { label: 'Altın', hex: '#d97706' },
    // Mor & Pembe
    { label: 'Mor', hex: '#a855f7' },
    { label: 'Koyu Mor', hex: '#6d28d9' },
    { label: 'Pembe', hex: '#ec4899' },
    { label: 'Fuşya', hex: '#d946ef' },
    // Cyan & Teal
    { label: 'Turkuaz', hex: '#06b6d4' },
    { label: 'Teal', hex: '#14b8a6' },
    // Nötrler
    { label: 'Beyaz', hex: '#f1f5f9' },
    { label: 'Gümüş', hex: '#94a3b8' },
    { label: 'Grafit', hex: '#475569' },
    { label: 'Siyah', hex: '#111827' },
    // Özel
    { label: 'Mercan', hex: '#f87171' },
    { label: 'İndigo', hex: '#6366f1' },
    { label: 'Kahve', hex: '#92400e' },
];

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
    const primaryLabel = TEAM_COLORS.find(c => c.hex === primaryColor)?.label ?? 'Özel';
    const secondaryLabel = TEAM_COLORS.find(c => c.hex === secondaryColor)?.label ?? 'Özel';

    const ColorGrid = ({
        selected,
        onSelect,
    }: {
        selected: string;
        onSelect: (hex: string) => void;
    }) => (
        <div className="grid grid-cols-6 gap-2.5">
            {TEAM_COLORS.map(c => (
                <button
                    key={c.hex}
                    onClick={() => isCaptain && onSelect(c.hex)}
                    disabled={!isCaptain}
                    title={c.label}
                    className="relative w-9 h-9 rounded-full transition-all active:scale-90 disabled:cursor-not-allowed hover:scale-110 focus:outline-none"
                    style={{ backgroundColor: c.hex }}
                >
                    {selected === c.hex && (
                        <span className="absolute inset-0 flex items-center justify-center">
                            <span className="absolute inset-0 rounded-full ring-2 ring-white ring-offset-2 ring-offset-slate-800" />
                            <Check className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] relative z-10" strokeWidth={3} />
                        </span>
                    )}
                </button>
            ))}
        </div>
    );

    return (
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700/60 overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-slate-700/50">
                <Palette className="w-4 h-4 text-turf-400" />
                <span className="text-slate-300 text-sm font-bold uppercase tracking-widest">Takım Renkleri</span>
            </div>

            <div className="p-4 space-y-5">
                {/* Ana Renk */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Ana Renk</p>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: primaryColor }} />
                            <span className="text-slate-300 text-xs font-bold">{primaryLabel}</span>
                        </div>
                    </div>
                    <ColorGrid selected={primaryColor} onSelect={setPrimaryColor} />
                </div>

                {/* İkincil Renk */}
                <div className="space-y-3 pt-3 border-t border-slate-700/50">
                    <div className="flex items-center justify-between">
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">İkincil Renk</p>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: secondaryColor }} />
                            <span className="text-slate-300 text-xs font-bold">{secondaryLabel}</span>
                        </div>
                    </div>
                    <ColorGrid selected={secondaryColor} onSelect={setSecondaryColor} />
                </div>
            </div>
        </div>
    );
};
