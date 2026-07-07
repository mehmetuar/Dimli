import React from 'react';

interface PitchGoalAreaProps {
    /** Klavye açıkken sönükleşir */
    keyboardOpen?: boolean;
}

// Ceza sahası: hero'dan daha sönük, keskin (glow yok — perf)
const BOX_LINE = 'rgba(236, 247, 241, 0.4)';

/**
 * Alt ceza sahası: footer'ın (İşletme geçiş butonu) arkasına çapalı, butonu içine alır.
 * Gol çizgisi = ekran alt kenarı; ceza sahası alttan yükselir (⊓). Kale yayı + penaltı noktası.
 * preserveAspectRatio="none" + non-scaling-stroke → her en-boy oranında düzgün 2px, TAM kutu.
 * Giriş: dash-draw YOK (WebKit dash+pathLength hatasından kaçınmak için) — kapsayıcıya
 * `clip-path` wipe (gol çizgisinden yukarı açılır) → garantili komple. reduce-motion'da statik.
 */
export const PitchGoalArea: React.FC<PitchGoalAreaProps> = ({ keyboardOpen = false }) => {
    return (
        <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 pointer-events-none transition-opacity duration-500"
            style={{
                height: 'clamp(150px, 26vh, 230px)',
                opacity: keyboardOpen ? 0.22 : 1,
                zIndex: 0,
            }}
        >
            <svg
                className="absolute inset-0 w-full h-full pitch-wipe-up"
                viewBox="0 0 300 120"
                preserveAspectRatio="none"
                fill="none"
            >
                {/* Ceza sahası (⊓ — alttan/gol çizgisinden yükselir, butonu içine alır) */}
                <path
                    d="M10 120 V34 H290 V120"
                    stroke={BOX_LINE}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                />
                {/* Penaltı yayı (ceza sahası üstünde, sahaya doğru çıkıntı) */}
                <path
                    d="M126 34 A 32 32 0 0 0 174 34"
                    stroke={BOX_LINE}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                />
                {/* Penaltı noktası */}
                <circle cx="150" cy="58" r="2.5" fill={BOX_LINE} />
            </svg>
        </div>
    );
};
