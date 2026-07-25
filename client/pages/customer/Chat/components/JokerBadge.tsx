import React from 'react';

// Joker rozeti — tek kaynak (mesaj balonu + Mesaj Bilgisi modalı).
// Açık sarı yuvarlak zemin + siyah kalın "J" + harfin üstünde yıldız parlaması.
// CSS tabanlı, asset/ağ bağımlılığı yok; 14-18px aralığında keskin çizilir.
export const JokerBadge: React.FC<{ size?: number }> = ({ size = 15 }) => (
    <span
        className="relative inline-flex items-center justify-center shrink-0 rounded-full"
        style={{
            width: size,
            height: size,
            // Açık sarı: merkezden kenara hafif ton — düz boyadan daha canlı
            background: 'radial-gradient(circle at 35% 30%, #fefce8 0%, #fde047 62%, #facc15 100%)',
            boxShadow: '0 0 0 1px rgba(202,138,4,0.55), 0 1px 2.5px rgba(0,0,0,0.4)',
        }}
        aria-label="Joker"
    >
        <span
            className="font-black leading-none"
            style={{ fontSize: Math.round(size * 0.64), color: '#0a0a0a' }}
        >
            J
        </span>
        {/* Yıldız parlaması — harfin sağ üstünde küçük ışıltı */}
        <span
            className="absolute pointer-events-none leading-none"
            style={{
                top: '-8%',
                right: '-4%',
                fontSize: Math.round(size * 0.5),
                color: '#ffffff',
                textShadow: '0 0 2px rgba(255,255,255,0.9), 0 0 4px rgba(250,204,21,0.8)',
            }}
        >
            ✦
        </span>
    </span>
);
