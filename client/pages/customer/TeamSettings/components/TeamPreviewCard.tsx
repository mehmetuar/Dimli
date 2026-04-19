import React, { useState } from 'react';

interface TeamPreviewCardProps {
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    levelLabel: string;
    levelStyle: string;
}

export const TeamPreviewCard: React.FC<TeamPreviewCardProps> = ({
    name,
    logoUrl,
    primaryColor,
    secondaryColor,
    levelLabel,
    levelStyle,
}) => {
    const [imgError, setImgError] = useState(false);
    const initials = name ? name.slice(0, 2).toUpperCase() : '??';
    const showLogo = logoUrl && !imgError;

    return (
        <div
            className="relative rounded-2xl overflow-hidden p-6 flex flex-col items-center gap-3"
            style={{
                background: `linear-gradient(135deg, ${primaryColor}40 0%, ${secondaryColor}25 100%)`,
                borderTop: `3px solid ${primaryColor}60`,
                borderBottom: `1px solid ${secondaryColor}30`,
                borderLeft: `1px solid ${primaryColor}20`,
                borderRight: `1px solid ${secondaryColor}20`,
            }}
        >
            {/* Decorative blobs */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-2xl"
                style={{ background: primaryColor, transform: 'translate(30%, -30%)' }} />
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-10 blur-2xl"
                style={{ background: secondaryColor, transform: 'translate(-30%, 30%)' }} />

            {/* Logo */}
            <div
                className="relative w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl border-2"
                style={{
                    borderColor: `${primaryColor}60`,
                    background: showLogo ? undefined : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                }}
            >
                {showLogo ? (
                    <img
                        src={logoUrl!}
                        alt={name}
                        className="w-full h-full object-cover"
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <span className="text-white font-black text-xl select-none">{initials}</span>
                )}
            </div>

            {/* Name & Level */}
            <div className="text-center relative z-10">
                <p className="text-white font-black text-xl tracking-wide">
                    {name || 'Takım Adı'}
                </p>
                <span className={`inline-block mt-1 text-xs font-bold px-3 py-0.5 rounded-full border ${levelStyle}`}>
                    {levelLabel}
                </span>
            </div>

            {/* Color swatches */}
            <div className="flex items-center gap-2 relative z-10">
                <div className="w-5 h-5 rounded-full shadow-lg border border-white/20" style={{ backgroundColor: primaryColor }} />
                <div className="w-3 h-0.5 bg-slate-500/60 rounded" />
                <div className="w-5 h-5 rounded-full shadow-lg border border-white/20" style={{ backgroundColor: secondaryColor }} />
            </div>
        </div>
    );
};
