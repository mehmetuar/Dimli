import React from 'react';

interface PitchGoalAreaProps {
    /** Klavye açıkken sönükleşir */
    keyboardOpen?: boolean;
}

// Ceza sahası: hero'dan daha sönük, keskin (glow yok — perf)
const BOX_LINE = 'rgba(236, 247, 241, 0.4)';
const LINE_W = '2px';
const BOX_X = 'clamp(6px, 2.5vw, 18px)'; // ceza sahası kenar boşluğu (butonu içine alır)

/**
 * Alt ceza sahası: footer'ın (İşletme geçiş butonu) arkasına çapalı, butonu içine alır.
 * Gol çizgisi = alt kenar; ceza sahası ⊓ + gol çizgisi (kapalı kutu) + kale alanı (6-pas) +
 * penaltı yayı + penaltı noktası. Çizgiler DOM (scaleX/scaleY, üniform 2px, GPU, tüm cihaz) →
 * kademeli YAVAŞ çizim; yay uniform SVG stroke-dash; nokta en son scale-in. reduce-motion'da statik.
 */
export const PitchGoalArea: React.FC<PitchGoalAreaProps> = ({ keyboardOpen = false }) => {
    const base = { position: 'absolute' as const, background: BOX_LINE };

    return (
        <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 pointer-events-none transition-opacity duration-500"
            style={{ height: 'clamp(140px, 26vh, 235px)', opacity: keyboardOpen ? 0.22 : 1, zIndex: 0 }}
        >
            {/* Ceza sahası — sol/sağ dikey (gol çizgisinden yukarı çizilir) */}
            <div className="pitch-line-v" style={{ ...base, left: BOX_X, top: '24%', bottom: 0, width: LINE_W, animationDuration: '0.95s', animationDelay: '0.8s' }} />
            <div className="pitch-line-v" style={{ ...base, right: BOX_X, top: '24%', bottom: 0, width: LINE_W, animationDuration: '0.95s', animationDelay: '0.88s' }} />

            {/* Gol çizgisi (alt — kutuyu kapatır) */}
            <div className="pitch-line-h" style={{ ...base, left: BOX_X, right: BOX_X, bottom: 0, height: LINE_W, animationDuration: '0.85s', animationDelay: '0.95s' }} />

            {/* Ceza sahası üst çizgisi */}
            <div className="pitch-line-h" style={{ ...base, left: BOX_X, right: BOX_X, top: '24%', height: LINE_W, animationDuration: '0.8s', animationDelay: '1.5s' }} />

            {/* Kale alanı (6-pas) — gol çizgisinde küçük ⊓ (butonun altında) */}
            <div className="pitch-line-v" style={{ ...base, left: '32%', top: '89%', bottom: 0, width: LINE_W, animationDuration: '0.6s', animationDelay: '1.85s' }} />
            <div className="pitch-line-v" style={{ ...base, right: '32%', top: '89%', bottom: 0, width: LINE_W, animationDuration: '0.6s', animationDelay: '1.9s' }} />
            <div className="pitch-line-h" style={{ ...base, left: '32%', right: '32%', top: '89%', height: LINE_W, animationDuration: '0.6s', animationDelay: '2.0s' }} />

            {/* Penaltı yayı — uçları kutu üst çizgisine TAM oturur (chord = viewBox tabanı),
                yay yukarı çıkar; alta taşma yok. */}
            <svg
                className="absolute"
                viewBox="0 0 100 24"
                style={{ left: '50%', top: '24%', width: '46%', maxWidth: '170px', transform: 'translate(-50%, -100%)', overflow: 'visible' }}
                fill="none"
            >
                <path
                    className="pitch-draw"
                    style={{ strokeDasharray: 120, strokeDashoffset: 120, animationDuration: '0.9s', animationDelay: '2.2s' }}
                    d="M14 24 A 44 44 0 0 0 86 24"
                    stroke={BOX_LINE}
                    strokeWidth={2}
                />
            </svg>

            {/* Penaltı noktası (EN SON yavaş belirir) */}
            <div
                className="pitch-dot-in rounded-full"
                style={{ position: 'absolute', left: '50%', top: '45%', width: '6px', height: '6px', marginLeft: '-3px', marginTop: '-3px', background: BOX_LINE, animationDelay: '2.75s' }}
            />
        </div>
    );
};
