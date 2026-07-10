import React from 'react';

/**
 * İşletme login alt bandı: ÜÇGEN ÇATILI DÜKKAN cephesi, açılışta yavaş kendi çizilir.
 * Müşteri login'indeki PitchGoalArea muadili — aynı `.pitch-line-h/-v` + `.pitch-draw` + `.pitch-dot-in`
 * (index.css, renk-bağımsız) primitifleri; renk inline. "Oyuncu Girişine Dön" butonu dükkanın
 * GİRİŞİ olarak sarılır (buton önde/z-10, sanat arkada/z-0, pointer-events-none).
 *
 * Renk dengesi: lacivert zeminle harmonik dursun diye çizgiler yumuşak/sıcak amber; arkada bir
 * sıcak ambient glow navy→turuncu geçişini köprüler; dikey öğeler (duvar/mullion/çatı) aşağıda
 * sıcak → yukarıda sönümlenen gradient ile "geçişli" görünür. Geometri %-tabanlı → iOS/Android aynı.
 */
const LINE = 'rgba(226, 104, 46, 0.48)'; // sıcak amber (yumuşatılmış), yatay kirişler/zemin/şerit
const LINE_SOFT = 'rgba(226, 104, 46, 0.3)';
const ACCENT = 'rgba(253, 188, 128, 0.95)'; // tabela ışığı — yumuşak sıcak
const LINE_W = '2px';
const SIDE = 'clamp(6px, 2.5vw, 18px)';
const AWN = '2px';

// Dikey öğeler: yerden yukarı sönümlenen sıcak gradient (geçişli)
const WALL_GRAD = 'linear-gradient(to top, rgba(226,104,46,0.52) 0%, rgba(226,104,46,0.24) 100%)';
const MULLION_GRAD = 'linear-gradient(to top, rgba(226,104,46,0.34) 0%, rgba(226,104,46,0.16) 100%)';
// Arka sıcak haze: lacivert zemin ile turuncu çizgiyi köprüler (altta en sıcak, yukarı sönümlenir)
const AMBIENT = 'radial-gradient(120% 95% at 50% 90%, rgba(234,88,12,0.1) 0%, rgba(234,88,12,0.03) 42%, transparent 72%)';

const STRIPES = [8, 22, 36, 50, 64, 78, 92];

interface Props {
    keyboardOpen?: boolean;
}

export const BusinessStorefrontArt: React.FC<Props> = ({ keyboardOpen = false }) => {
    const base = { position: 'absolute' as const, background: LINE };

    return (
        <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 pointer-events-none transition-opacity duration-500"
            style={{ height: 'clamp(160px, 28vh, 255px)', opacity: keyboardOpen ? 0.22 : 1, zIndex: 0 }}
        >
            {/* Sıcak ambient — navy zemin ile turuncu çizgi arası geçişi yumuşatır (en arkada) */}
            <div style={{ position: 'absolute', inset: 0, background: AMBIENT }} />

            {/* Zemin çizgisi (alt kenar — cepheyi kapatır, butonun arkasında) */}
            <div className="pitch-line-h" style={{ ...base, left: SIDE, right: SIDE, bottom: 0, height: LINE_W, animationDuration: '0.85s', animationDelay: '0.8s' }} />

            {/* Sol + sağ duvar (yerden yukarı çizilir, dikey gradient) */}
            <div className="pitch-line-v" style={{ position: 'absolute', background: WALL_GRAD, left: SIDE, top: '20%', bottom: 0, width: LINE_W, animationDuration: '0.95s', animationDelay: '1.0s' }} />
            <div className="pitch-line-v" style={{ position: 'absolute', background: WALL_GRAD, right: SIDE, top: '20%', bottom: 0, width: LINE_W, animationDuration: '0.95s', animationDelay: '1.1s' }} />

            {/* Saçak / eave kirişi (çatı tabanı = gövde üstü) */}
            <div className="pitch-line-h" style={{ ...base, left: SIDE, right: SIDE, top: '20%', height: LINE_W, animationDuration: '0.8s', animationDelay: '1.4s' }} />

            {/* Üçgen (beşik) çatı — tepeden iki yana tek sweep'te çizilir; stroke dikey gradient */}
            <svg
                className="absolute"
                viewBox="0 0 100 30"
                preserveAspectRatio="none"
                style={{ left: AWN, right: AWN, top: 0, width: `calc(100% - 2 * ${AWN})`, height: '20%', overflow: 'visible' }}
                fill="none"
            >
                <defs>
                    <linearGradient id="storefrontRoofGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="rgba(244, 138, 74, 0.68)" />
                        <stop offset="1" stopColor="rgba(214, 92, 42, 0.36)" />
                    </linearGradient>
                </defs>
                <path
                    className="pitch-draw"
                    style={{ strokeDasharray: 160, strokeDashoffset: 160, animationDuration: '1s', animationDelay: '1.65s' }}
                    d="M3 30 L50 4 L97 30"
                    stroke="url(#storefrontRoofGrad)"
                    strokeWidth={1.7}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            </svg>

            {/* Tabela bandı (eave ile vitrin arası panel = dükkan tabelası) */}
            <div className="pitch-line-h" style={{ ...base, left: SIDE, right: SIDE, top: '30%', height: LINE_W, animationDuration: '0.7s', animationDelay: '1.95s' }} />

            {/* Vitrin camı mullion'ları (dikey gradient, 3 pano) */}
            <div className="pitch-line-v" style={{ position: 'absolute', background: MULLION_GRAD, left: '36%', top: '30%', height: '18%', width: LINE_W, animationDuration: '0.7s', animationDelay: '2.1s' }} />
            <div className="pitch-line-v" style={{ position: 'absolute', background: MULLION_GRAD, left: '64%', top: '30%', height: '18%', width: LINE_W, animationDuration: '0.7s', animationDelay: '2.2s' }} />

            {/* Tente kirişi (girişin üstünde, duvarlardan biraz taşar) */}
            <div className="pitch-line-h" style={{ ...base, left: AWN, right: AWN, top: '48%', height: LINE_W, animationDuration: '0.75s', animationDelay: '2.35s' }} />

            {/* Çizgili tente şeritleri (kirişten aşağı sarkar) */}
            {STRIPES.map((x, i) => (
                <div
                    key={x}
                    className="pitch-line-v"
                    style={{ position: 'absolute', background: LINE, left: `${x}%`, top: '48%', height: '7%', width: LINE_W, transformOrigin: 'top', animationDuration: '0.4s', animationDelay: `${2.4 + i * 0.04}s` }}
                />
            ))}

            {/* Tabela ışığı (EN SON belirir — sıcak aksan) */}
            <div
                className="pitch-dot-in rounded-full"
                style={{ position: 'absolute', left: '50%', top: '25%', width: '6px', height: '6px', marginLeft: '-3px', marginTop: '-3px', background: ACCENT, animationDelay: '2.9s' }}
            />
        </div>
    );
};
