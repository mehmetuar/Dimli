import React from 'react';
import { Type, BarChart2 } from 'lucide-react';

interface TeamSettingsFormProps {
    name: string;
    setName: (name: string) => void;
    level: string;
    setLevel: (level: string) => void;
    isCaptain: boolean;
    LEVELS: Array<{ value: string; label: string; color: string; bg: string }>;
    /** Bölümde kaydedilmemiş değişiklik var (amber pil gösterilir) */
    isDirty?: boolean;
}

export const TeamSettingsForm: React.FC<TeamSettingsFormProps> = ({
    name, setName,
    level, setLevel,
    isCaptain,
    LEVELS,
    isDirty,
}) => {
    return (
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700/60 overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-slate-700/50">
                <Type className="w-4 h-4 text-turf-400" />
                <span className="text-slate-300 text-sm font-bold uppercase tracking-widest flex-1">Takım Kimliği</span>
                {isDirty && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider animate-fade-in">
                        Kaydedilmedi
                    </span>
                )}
            </div>

            <div className="p-4 space-y-4">
                {/* Takım Adı */}
                <div className="space-y-1.5">
                    <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Takım Adı</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        disabled={!isCaptain}
                        maxLength={40}
                        placeholder="Takım adınızı girin..."
                        className="w-full bg-slate-900/70 text-white font-bold text-base px-4 py-3 rounded-xl border border-slate-600/60 focus:border-turf-500 focus:outline-none placeholder-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    />
                    <p className="text-xs text-slate-600 text-right">{name.length}/40</p>
                </div>

                {/* Seviye */}
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                        <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
                        <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Seviye</label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {LEVELS.map(l => (
                            <button
                                key={l.value}
                                onClick={() => isCaptain && setLevel(l.value)}
                                disabled={!isCaptain}
                                className={`py-3 px-4 rounded-xl border font-bold text-sm transition-all active:scale-95 ${level === l.value
                                    ? `${l.bg} ${l.color} shadow-lg`
                                    : 'bg-slate-900/50 border-slate-700/60 text-slate-500 hover:bg-slate-700/50'
                                    } disabled:cursor-not-allowed`}
                            >
                                {l.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
