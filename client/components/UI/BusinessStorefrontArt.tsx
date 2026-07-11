import React from 'react';

interface Props {
    keyboardOpen?: boolean;
}

/**
 * İşletme login "vitrin-kapı" cephesi — kendini çizen saha tesisi binası.
 *
 * HİZALAMA SİSTEMİ (agent.md §64 — bozma!): viewBox 200×100, preserveAspectRatio="none".
 * Wrapper yatay padding clamp(16px,5vw,32px) → telefonlarda tam %5 = X=10; bant
 * clamp(160px,28vh,255px) + alt padding clamp(20px,3.5vh,32px) → oran her uçta %12.5
 * → "Oyuncu Girişine Dön" butonunun ALT KENARI her cihazda Y=87.5. Kapı çerçevesi
 * (dikmeler X45/155, lento Y56, zemin Y90) bu çapaya göre kurulu; buton genişliği
 * %57.78 (X48..152) → çerçeveyle ASLA çakışmaz. Bant yüksekliği string'i
 * BackToCustomerButton.minHeight ile birebir AYNI kalmalı.
 *
 * Kısıtlar: stroke-dashoffset draw + opacity-only fade (SVG'de CSS scale YOK — WebKit);
 * vectorEffect="non-scaling-stroke" ASLA eklenmez (§54).
 */
export const BusinessStorefrontArt: React.FC<Props> = ({ keyboardOpen = false }) => {
    return (
        <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 pointer-events-none transition-opacity duration-500"
            style={{ height: 'clamp(160px, 28vh, 255px)', opacity: keyboardOpen ? 0 : 1, zIndex: 0 }}
        >
            {/* Zemin ışıması — kapının önüne vuran sıcak dükkân ışığı */}
            <div
                className="absolute inset-x-0 bottom-0 sfa-fade"
                style={{
                    height: '45%',
                    background: 'radial-gradient(55% 60% at 50% 100%, rgba(234,88,12,0.10), transparent 70%)',
                    animationDelay: '2s',
                }}
            />

            {/* Çatı tabelası: çember içinde Dimli logosu — banda oranlı boyut, saçağın üstünde (zIndex 2) */}
            <div
                className="absolute left-1/2 sfa-fade"
                style={{
                    top: '4%',
                    transform: 'translateX(-50%)',
                    height: 'clamp(36px, 18%, 48px)',
                    aspectRatio: '1 / 1',
                    borderRadius: '50%',
                    border: '1.5px solid #ea580c',
                    background: '#0f172a',
                    zIndex: 2,
                    animationDelay: '1.2s',
                    boxShadow: '0 0 0 3px rgba(234,88,12,0.15), 0 0 18px rgba(249,115,22,0.28), 0 4px 12px rgba(0,0,0,0.3)',
                }}
            >
                {/* icon.png glifinin sol-alt uzantısı asimetrik → glif çekirdeğini disk merkezine
                    oturtan yüzde bazlı nudge (kendi boyutuna göre → ölçek-bağımsız) */}
                <img
                    src="/icon.png"
                    alt=""
                    className="absolute top-1/2 left-1/2 object-contain"
                    style={{ width: '74%', height: '74%', transform: 'translate(-49%, -41.5%)' }}
                />
            </div>

            {/* Kapı lambası — lento altındaki amber nokta, kapıyı aydınlatır */}
            <div
                className="absolute sfa-fade"
                style={{
                    left: '50%',
                    top: '57%',
                    transform: 'translate(-50%, -50%)',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: '#fbbf24',
                    boxShadow: '0 0 10px 2px rgba(251,191,36,0.5)',
                    animationDelay: '1.95s',
                }}
            />

            <svg
                viewBox="0 0 200 100"
                preserveAspectRatio="none"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
            >
                <defs>
                    {/* gradientUnits="userSpaceOnUse" ŞART: tek parçalı YATAY path'lerin (saçak, zemin,
                        lento) bounding box yüksekliği 0 → objectBoundingBox gradyanı SVG spec gereği
                        HİÇ boyanmaz (çizgi görünmez olur). userSpaceOnUse viewBox koordinatı kullanır
                        ve tüm cepheye tek tutarlı soldan-sağa rampa verir. */}
                    <linearGradient id="storeOrange" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="200" y2="0">
                        <stop offset="0%" stopColor="#c2410c" />
                        <stop offset="15%" stopColor="#ea580c" />
                        <stop offset="50%" stopColor="#f97316" />
                        <stop offset="85%" stopColor="#ea580c" />
                        <stop offset="100%" stopColor="#c2410c" />
                    </linearGradient>

                    <style>
                        {`
                            .anim-line {
                                stroke-dasharray: 100;
                                stroke-dashoffset: 100;
                                animation: dashDraw 1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                            }
                            @keyframes dashDraw {
                                to { stroke-dashoffset: 0; }
                            }
                            @keyframes fade-in {
                                from { opacity: 0; }
                                to { opacity: 1; }
                            }
                            .fade-dot {
                                opacity: 0;
                                animation: fade-in 0.5s ease-out 1.55s forwards;
                            }
                            .sfa-fade {
                                opacity: 0;
                                animation: fade-in 0.8s ease-out forwards;
                            }
                            @media (prefers-reduced-motion: reduce) {
                                .anim-line { animation: none; stroke-dashoffset: 0; }
                                .fade-dot, .sfa-fade { animation: none; opacity: 1; }
                            }
                        `}
                    </style>
                </defs>

                {/* -- İŞLETME CEPHESİ: çatı → vitrin → tente → KAPI çerçevesi → zemin --
                    Buton (kapı kanadı) Y60-87.5 aralığında oturur; dikmeler X45/155, lento Y56,
                    zemin Y90 → buton X48..152 ile her boyutta payı korur (agent.md §64) */}
                <g stroke="url(#storeOrange)" fill="none" strokeLinecap="round" strokeLinejoin="round">

                    {/* Zemin çizgisi (bandın dibinde — kapı eşiği) */}
                    <path pathLength="100" d="M 5 90 L 195 90" strokeWidth="1.5" className="anim-line" style={{ animationDelay: '0.1s' }} />

                    {/* Dış duvarlar (zeminden saçağa) */}
                    <path pathLength="100" d="M 10 90 L 10 22 M 190 90 L 190 22" strokeWidth="1.5" className="anim-line" style={{ animationDelay: '0.25s' }} />

                    {/* Saçak */}
                    <path pathLength="100" d="M 2 22 L 198 22" strokeWidth="2" className="anim-line" style={{ animationDelay: '0.4s' }} />

                    {/* Çatı üçgeni */}
                    <path pathLength="100" d="M 4 22 L 100 0 L 196 22" strokeWidth="2" className="anim-line" style={{ animationDelay: '0.55s' }} />

                    {/* İç çatı (merkezde logo tabelası için boşluk: X=70→130) */}
                    <path pathLength="100" d="M 15 22 L 70 8 M 130 8 L 185 22" strokeWidth="1" className="anim-line" style={{ animationDelay: '0.7s' }} />

                    {/* Yan destekler */}
                    <path pathLength="100" d="M 45 15 L 45 22 M 155 15 L 155 22" strokeWidth="0.8" className="anim-line" style={{ animationDelay: '0.8s' }} />

                    {/* Tente (girişin üstünde) */}
                    <path pathLength="100" d="M 14 52 L 186 52 L 182 46 L 18 46 Z" strokeWidth="1" fill="rgba(234, 88, 12, 0.05)" className="anim-line" style={{ animationDelay: '0.9s' }} />

                    {/* KAPI ÇERÇEVESİ — kaskadın finali: çerçeve butonun etrafında kapanır */}
                    <path pathLength="100" d="M 45 90 L 45 56 M 155 90 L 155 56" strokeWidth="1.2" className="anim-line" style={{ animationDelay: '1.6s' }} />
                    <path pathLength="100" d="M 42 56 L 158 56" strokeWidth="1.5" className="anim-line" style={{ animationDelay: '1.75s' }} />
                </g>

                {/* -- VİTRİN İÇİ SAHA SEMBOLÜ (Y=27..44) -- */}
                <g stroke="#16a34a" fill="none" strokeWidth="0.8">
                    <path pathLength="100" d="M 18 27 L 18 44 L 182 44 L 182 27 Z" className="anim-line" style={{ animationDelay: '1.05s' }} />

                    {/* Orta saha çizgisi ve yuvarlağı */}
                    <path pathLength="100" d="M 100 27 L 100 44" className="anim-line" style={{ animationDelay: '1.15s' }} />
                    <circle pathLength="100" cx="100" cy="35.5" r="5" className="anim-line" style={{ animationDelay: '1.25s' }} />

                    {/* Sol ceza sahası + kale sahası */}
                    <path pathLength="100" d="M 18 30.5 L 30 30.5 L 30 41 L 18 41" className="anim-line" style={{ animationDelay: '1.35s' }} />
                    <path pathLength="100" d="M 18 33 L 24 33 L 24 38.5 L 18 38.5" strokeWidth="0.5" className="anim-line" style={{ animationDelay: '1.45s' }} />

                    {/* Sağ ceza sahası + kale sahası */}
                    <path pathLength="100" d="M 182 30.5 L 170 30.5 L 170 41 L 182 41" className="anim-line" style={{ animationDelay: '1.35s' }} />
                    <path pathLength="100" d="M 182 33 L 176 33 L 176 38.5 L 182 38.5" strokeWidth="0.5" className="anim-line" style={{ animationDelay: '1.45s' }} />
                </g>

                {/* Saha santra noktası */}
                <circle cx="100" cy="35.5" r="0.8" fill="#16a34a" className="fade-dot" />
            </svg>
        </div>
    );
};
