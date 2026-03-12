import React from 'react';
import { Type, BarChart2, MapPin, Image } from 'lucide-react';

interface TeamSettingsFormProps {
    name: string;
    setName: (name: string) => void;
    level: string;
    setLevel: (level: string) => void;
    location: string;
    setLocation: (location: string) => void;
    logoUrl: string;
    setLogoUrl: (url: string) => void;
    isCaptain: boolean;
    LEVELS: Array<{ value: string; label: string; color: string; bg: string }>;
}

export const TeamSettingsForm: React.FC<TeamSettingsFormProps> = ({
    name, setName,
    level, setLevel,
    location, setLocation,
    logoUrl, setLogoUrl,
    isCaptain,
    LEVELS
}) => {
    return (
        <>
            {/* Takım Adı */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-2 animate-fade-in">
                <label className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <Type className="w-3.5 h-3.5" /> Takım Adı
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    disabled={!isCaptain}
                    maxLength={40}
                    placeholder="Takım adınızı girin..."
                    className="w-full bg-slate-900/70 text-white font-bold text-lg px-4 py-3 rounded-xl border border-slate-600 focus:border-turf-500 focus:outline-none placeholder-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 text-right">{name.length}/40</p>
            </div>

            {/* Seviye */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <label className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <BarChart2 className="w-3.5 h-3.5" /> Takım Seviyesi
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {LEVELS.map(l => (
                        <button
                            key={l.value}
                            onClick={() => isCaptain && setLevel(l.value)}
                            disabled={!isCaptain}
                            className={`py-3 px-4 rounded-xl border font-bold text-sm transition-all active:scale-95 ${level === l.value
                                ? `${l.bg} ${l.color} shadow-lg`
                                : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-700'
                                } disabled:cursor-not-allowed`}
                        >
                            {l.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Konum */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <label className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <MapPin className="w-3.5 h-3.5" /> Konum
                </label>
                <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    disabled={!isCaptain}
                    placeholder="İstanbul, Kadıköy..."
                    className="w-full bg-slate-900/70 text-white px-4 py-3 rounded-xl border border-slate-600 focus:border-turf-500 focus:outline-none placeholder-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
                />
            </div>

            {/* Logo URL */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <label className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <Image className="w-3.5 h-3.5" /> Logo URL
                </label>
                <input
                    type="url"
                    value={logoUrl}
                    onChange={e => setLogoUrl(e.target.value)}
                    disabled={!isCaptain}
                    placeholder="https://example.com/logo.png"
                    className="w-full bg-slate-900/70 text-white px-4 py-3 rounded-xl border border-slate-600 focus:border-turf-500 focus:outline-none placeholder-slate-600 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                />
                <p className="text-xs text-slate-500">Takım logonuzun internet bağlantısı olan bir resim URL'si girin.</p>
            </div>
        </>
    );
};
