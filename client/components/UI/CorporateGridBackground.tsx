import React from 'react';

interface CorporateGridBackgroundProps {
    keyboardOpen?: boolean;
}

export const CorporateGridBackground: React.FC<CorporateGridBackgroundProps> = ({ keyboardOpen }) => {
    return (
        <svg
            className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.25] transition-all duration-300"
            style={{
                transform: keyboardOpen ? 'scale(1.1) translateY(-10%)' : 'scale(1) translateY(0)',
            }}
            viewBox="0 0 400 400"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
        >
            <defs>
                <pattern id="hex-pattern" x="0" y="0" width="60" height="103.9" patternUnits="userSpaceOnUse">
                    <path d="M30 0 L60 17.32 L60 51.96 L30 69.28 L0 51.96 L0 17.32 Z" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
                    <path d="M30 103.92 L60 86.6 L60 51.96 L30 69.28 L0 51.96 L0 86.6 Z" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5"/>
                </pattern>

                <radialGradient id="fade-gradient" cx="50%" cy="0%" r="70%">
                    <stop offset="0%" stopColor="white" stopOpacity="1" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                </radialGradient>
            </defs>

            <rect width="100%" height="100%" fill="url(#hex-pattern)" mask="url(#grid-mask)" />
            
            <mask id="grid-mask">
                <rect width="100%" height="100%" fill="url(#fade-gradient)" />
            </mask>
        </svg>
    );
};
