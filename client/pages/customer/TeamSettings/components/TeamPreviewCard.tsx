import React from 'react';

interface TeamPreviewCardProps {
    name: string;
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
    selectedLevel: any;
    toHex: (cls: string) => string;
}

export const TeamPreviewCard: React.FC<TeamPreviewCardProps> = ({
    name,
    logoUrl,
    primaryColor,
    secondaryColor,
    selectedLevel,
    toHex
}) => {
    return (
        <div className="flex flex-col items-center gap-3 py-4 animate-fade-in">
            <div
                className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center shadow-xl"
                style={{ border: `3px solid ${toHex(primaryColor)}80`, background: `linear-gradient(135deg, ${toHex(primaryColor)}, ${toHex(secondaryColor)}88)` }}
            >
                {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                    <span className="text-white font-black text-2xl">{name ? name.slice(0, 2).toUpperCase() : '?'}</span>
                )}
            </div>
            <div className="text-center">
                <p className="text-white font-bold text-lg">{name || 'Takım Adı'}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${selectedLevel.bg} ${selectedLevel.color}`}>
                    {selectedLevel.label}
                </span>
            </div>
            {/* Color strip preview */}
            <div className="flex gap-1.5 items-center">
                <div className="w-6 h-6 rounded-full shadow" style={{ backgroundColor: toHex(primaryColor) }} />
                <span className="text-slate-500 text-xs">+</span>
                <div className="w-6 h-6 rounded-full shadow" style={{ backgroundColor: toHex(secondaryColor) }} />
            </div>
        </div>
    );
};
