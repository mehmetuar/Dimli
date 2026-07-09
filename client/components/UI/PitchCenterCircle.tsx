import React from 'react';

interface PitchCenterCircleProps {
    /** Klavye açıkken sönükleşir (input'lar öne çıksın); hizalama korunur */
    keyboardOpen?: boolean;
    /** Çember çapının logo kutusuna oranı (icon.png'yi içine alacak şekilde ayarlı) */
    circleScale?: number;
    /** Çemberin dikey merkezi (icon.png'nin görünen "D" çekirdeği canvas'ın %41.5'inde) */
    coreCenterY?: number;
}

// Floodlit tebeşir: beyazımsı, yüksek opak + yumuşak dış glow (hero öğe)
const HERO_LINE = 'rgba(236, 247, 241, 0.66)';
const HERO_GLOW = 'drop-shadow(0 0 3px rgba(200, 255, 225, 0.4))';

// r=47 viewBox biriminde → çevre. dash = çevre → tam kapanan daire (WebKit dash+pathLength
// hatasından kaçınmak için pathLength/non-scaling-stroke YOK).
const R = 47;
const CIRC = 2 * Math.PI * R; // ≈ 295.3

/**
 * Orta saha: logonun tam arkasına çapalı çember + orta nokta + tam ekran-genişliği orta çizgi.
 * Logo sarmalayıcısının içine (img'den ÖNCE, arkada) `absolute inset-0` olarak konur → çember
 * her ekranda logoyla ortalı kalır, orta çizgi logo dikey-merkezinden geçer.
 * Dikey merkez = coreCenterY (icon.png'nin görünen D çekirdeği canvas'ta yukarıda → %41.5).
 * Açılışta kademeli çizilir (orta çizgi → çember → nokta); reduce-motion'da statik son-hâl.
 */
export const PitchCenterCircle: React.FC<PitchCenterCircleProps> = ({
    keyboardOpen = false,
    circleScale = 0.83,
    coreCenterY = 0.415,
}) => {
    const cy = `${coreCenterY * 100}%`;
    // Çizgi çemberin dışında durur (içi/logo temiz): çember yarıçapı ≈ 47*circleScale% + ~%3 boşluk.
    const stopPct = `${(47 * circleScale + 3).toFixed(2)}%`;
    const lineBase: React.CSSProperties = {
        position: 'absolute',
        top: `calc(${cy} - 1px)`,
        height: '2px',
        width: `calc(50vw - ${stopPct})`,
        background: HERO_LINE,
        filter: HERO_GLOW,
        animationDelay: '0.1s',
    };

    return (
        <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none transition-opacity duration-500"
            style={{ opacity: keyboardOpen ? 0.28 : 1, zIndex: 0 }}
        >
            {/* Orta saha çizgisi — çemberin İÇİNDEN GEÇMEZ: sol + sağ iki segment, çember dışında.
                Her segment çember kenarından ekran kenarına doğru çizilir (transform-origin çember tarafı). */}
            <div
                className="pitch-line-h"
                style={{ ...lineBase, left: 'calc(50% - 50vw)', transformOrigin: 'right' }}
            />
            <div
                className="pitch-line-h"
                style={{ ...lineBase, right: 'calc(50% - 50vw)', transformOrigin: 'left' }}
            />

            {/* Orta saha çemberi — logoyu içine alır, D çekirdeğiyle ortalı */}
            <svg
                className="absolute"
                viewBox="0 0 100 100"
                style={{
                    top: cy,
                    left: '50%',
                    width: `${circleScale * 100}%`,
                    height: `${circleScale * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    overflow: 'visible',
                    filter: HERO_GLOW,
                }}
                fill="none"
            >
                <circle
                    className="pitch-draw"
                    style={{ strokeDasharray: CIRC, strokeDashoffset: CIRC, animationDelay: '0.35s' }}
                    cx="50"
                    cy="50"
                    r={R}
                    stroke={HERO_LINE}
                    strokeWidth={1.5}
                />
            </svg>
        </div>
    );
};
