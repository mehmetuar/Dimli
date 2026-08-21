import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Login coach overlay v2 (agent.md §106) — "renkli yol" tasarımı.
// Kartlar [data-coach-anchor] öğesinin (logo/başlık) ALTINDA yan yana durur;
// her karttan kendi hedefine kenar koridorundan akan KESİKLİ RENKLİ YOL iner
// (yeşil yol → Kayıt Ol, turuncu yol → işletme). %45 tek parça karartma
// (SVG mask ile yuvarlak delikli), vurgulu hedefler tıklanabilir kalır, delik
// DIŞINA her dokunuş = atlama (onDismiss). Kilit yok, adım yok, sheet yok.
//
// - Karartma: tek tam-ekran SVG + <mask> (delik başına siyah rounded-rect) —
//   çift-delikte bile tint tek parça (iki ayrı box-shadow deliği birbirinin
//   içine tint basardı; tur tekniği burada KULLANILMAZ).
// - Dokunma yakalayıcı: delikler dışını kaplayan bant div'leri (TourOverlay
//   4-kenar bloker deseninin çok-delikli genellemesi). Delik alanı boş →
//   dokunuş alttaki GERÇEK öğeye geçer; capture-phase click dinleyicisi
//   onTargetTap'ı hedefin kendi onClick'inden SONRAKİ macrotask'te bildirir.
// - Yol akışı stroke-dashoffset keyframe'i (§54'ün pitch-draw çember istisnası
//   ile aynı sınıf — eski-WebView güvenli, paint-level); diğer her animasyon
//   yalnız transform/opacity. Boot-sonrası yüzey → CSS keyframe serbest (§66
//   kuralı boot yoluna özgü). reduce-motion: akış/nabız durur, statik görünüm.
// - z-[9985]: sayfa içeriği üstünde, TourOverlay 9990 / AnimatedSplash 9999 altında.
// ─────────────────────────────────────────────────────────────────────────────

export interface CoachHintDef {
    /** Hedef öğedeki data-coach-id değeri */
    targetId: string;
    title: string;
    body: string;
    accent: 'turf' | 'orange';
}

interface CoachOverlayProps {
    hints: CoachHintDef[];
    /** Delik dışına dokunma = atla (bayrağı çağıran yazar) */
    onDismiss: () => void;
    /** Vurgulu hedefe dokunma — hedefin kendi onClick'i de normal çalışır */
    onTargetTap: (targetId: string) => void;
}

const PAD = 8;           // delik nefes payı (tur PAD_DEFAULT ile aynı)
const HOLE_RADIUS = 20;  // rounded-2xl (16) hedef + pad → uyumlu köşe
const SCRIM = 'rgba(2, 6, 23, 0.45)'; // belirgin ama boğmayan karartma (v2, cihaz geri bildirimi)
const CHEV_H = 28;       // sıçrayan ok yüksekliği
const CHEV_GAP = 10;     // ok ile delik arası (bounce 7px + pay — halkaya değmez)
const ROW_GAP = 14;      // çapa (logo/başlık) ile kart sırası arası
const PATH_MARGIN = 24;  // yolun kenar koridoru (kontrol noktalarının x'i)

const ACCENTS = {
    turf: { ring: 'rgba(74, 222, 128, 0.9)', glow: 'rgba(74, 222, 128, 0.32)', text: '#4ade80' },
    orange: { ring: 'rgba(251, 146, 60, 0.95)', glow: 'rgba(249, 115, 22, 0.38)', text: '#fb923c' },
} as const;

interface Hole { top: number; left: number; width: number; height: number }
interface CardRect { cx: number; bottom: number }

export const CoachOverlay: React.FC<CoachOverlayProps> = ({ hints, onDismiss, onTargetTap }) => {
    const [holes, setHoles] = useState<Record<string, Hole>>({});
    const [anchorBottom, setAnchorBottom] = useState<number | null>(null);
    const [cardRects, setCardRects] = useState<Record<string, CardRect>>({});
    const lastHolesRef = useRef<Record<string, Hole>>({});
    const cardElsRef = useRef<Record<string, HTMLDivElement | null>>({});

    // Ölçüm: mount'ta senkron + rAF döngüsü (TourOverlay deseni) — hedef delikleri,
    // kart çapası (logo/başlık) ve yol başlangıçları (kart rect'leri) birlikte izlenir;
    // 0.5px altı değişimde setState yok.
    useEffect(() => {
        let rafId = 0;
        const measure = () => {
            // Hedef delikleri
            const next: Record<string, Hole> = {};
            let changed = false;
            for (const hint of hints) {
                const el = document.querySelector<HTMLElement>(`[data-coach-id="${hint.targetId}"]`);
                if (!el) continue;
                const r = el.getBoundingClientRect();
                const left = Math.max(r.left - PAD, 8);
                const hole: Hole = {
                    top: r.top - PAD,
                    left,
                    width: Math.min(r.width + PAD * 2 - (left - (r.left - PAD)), window.innerWidth - left - 8),
                    height: r.height + PAD * 2,
                };
                const prev = lastHolesRef.current[hint.targetId];
                if (!prev || Math.abs(prev.top - hole.top) > 0.5 || Math.abs(prev.left - hole.left) > 0.5 ||
                    Math.abs(prev.width - hole.width) > 0.5 || Math.abs(prev.height - hole.height) > 0.5) {
                    changed = true;
                }
                next[hint.targetId] = hole;
            }
            if (changed || Object.keys(next).length !== Object.keys(lastHolesRef.current).length) {
                lastHolesRef.current = next;
                setHoles(next);
            }
            // Kart sırası çapası (logo/başlık altı)
            const anchor = document.querySelector<HTMLElement>('[data-coach-anchor]');
            const ab = anchor ? anchor.getBoundingClientRect().bottom : null;
            setAnchorBottom((prev) => (prev === ab || (prev != null && ab != null && Math.abs(prev - ab) < 0.5)) ? prev : ab);
            // Yol başlangıçları: kartların alt-orta noktaları
            setCardRects((prev) => {
                let dirty = false;
                const out: Record<string, CardRect> = {};
                for (const hint of hints) {
                    const el = cardElsRef.current[hint.targetId];
                    if (!el) continue;
                    const r = el.getBoundingClientRect();
                    const rect: CardRect = { cx: r.left + r.width / 2, bottom: r.bottom };
                    out[hint.targetId] = rect;
                    const p = prev[hint.targetId];
                    if (!p || Math.abs(p.cx - rect.cx) > 0.5 || Math.abs(p.bottom - rect.bottom) > 0.5) dirty = true;
                }
                if (!dirty && Object.keys(out).length === Object.keys(prev).length) return prev;
                return out;
            });
        };
        const loop = () => {
            measure();
            rafId = requestAnimationFrame(loop);
        };
        measure();
        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [hints]);

    // Hedef dokunuşu: capture-phase — hedefin kendi handler'ı (navigate/flip)
    // çalıştıktan SONRAKİ macrotask'te bildir (TourOverlay target-tap deseni).
    useEffect(() => {
        const handler = (e: Event) => {
            if (!(e.target instanceof Node)) return;
            for (const hint of hints) {
                const el = document.querySelector(`[data-coach-id="${hint.targetId}"]`);
                if (el && el.contains(e.target)) {
                    setTimeout(() => onTargetTap(hint.targetId), 0);
                    return;
                }
            }
        };
        document.addEventListener('click', handler, true);
        return () => document.removeEventListener('click', handler, true);
    }, [hints, onTargetTap]);

    const found = hints
        .map((hint) => ({ hint, hole: holes[hint.targetId] }))
        .filter((x): x is { hint: CoachHintDef; hole: Hole } => !!x.hole);

    // Hiç hedef bulunamadıysa hiçbir şey çizme (kilitlenme yok) — hedefler bu
    // ekranlarda statik JSX olduğundan pratikte ilk karede bulunur.
    if (found.length === 0) return null;

    const sorted = [...found].sort((a, b) => a.hole.top - b.hole.top);

    // Delikler DIŞINI kaplayan dokunma bantları: üst şerit → her delik satırında
    // yan şeritler → ara şeritler → alt şerit. Dikey örtüşmede yükseklik 0'a kırpılır.
    const bands: React.CSSProperties[] = [];
    let cursor = 0;
    for (const { hole } of sorted) {
        const rowTop = Math.max(hole.top, cursor);
        if (rowTop > cursor) bands.push({ top: cursor, left: 0, right: 0, height: rowTop - cursor });
        const rowBottom = hole.top + hole.height;
        const rowH = Math.max(0, rowBottom - rowTop);
        bands.push({ top: rowTop, left: 0, width: Math.max(0, hole.left), height: rowH });
        bands.push({ top: rowTop, left: hole.left + hole.width, right: 0, height: rowH });
        cursor = Math.max(cursor, rowBottom);
    }
    bands.push({ top: cursor, left: 0, right: 0, bottom: 0 });

    // Ok, deliği ile bir ÜSTTEKİ delik arasındaki boşluğa göre küçülür; 16px'e
    // sığmıyorsa hiç çizilmez (dar ekranda üst halkanın içine taşmasın).
    const chevrons: Record<string, { top: number; size: number } | null> = {};
    for (const { hint, hole } of sorted) {
        const aboveBottom = Math.max(
            0,
            ...sorted
                .filter((o) => o.hint.targetId !== hint.targetId && o.hole.top + o.hole.height <= hole.top + 1)
                .map((o) => o.hole.top + o.hole.height)
        );
        const size = Math.min(CHEV_H, hole.top - CHEV_GAP - (aboveBottom + 4));
        chevrons[hint.targetId] = size >= 16 ? { top: hole.top - CHEV_GAP - size, size } : null;
    }

    // Renkli yol: kartın alt-orta noktasından hedefin (ok varsa okun) üstüne kübik
    // bezier — kontrol noktaları kartın kendi tarafındaki kenar koridorunda, yol
    // diğer halkayı/yolu kesmeden kenardan akar. Tek kartta sağ koridor kullanılır.
    const paths: { targetId: string; d: string; accent: 'turf' | 'orange' }[] = [];
    for (const { hint, hole } of sorted) {
        const card = cardRects[hint.targetId];
        if (!card) continue;
        const chev = chevrons[hint.targetId];
        const ex = hole.left + hole.width / 2;
        const ey = (chev ? chev.top : hole.top) - 3;
        const sx = card.cx;
        const sy = card.bottom + 4;
        if (ey - sy < 24) continue; // kart hedefe bitişikse yol çizme (dejenere)
        // Ortalanmış tek kartta kayan-nokta yön flip'i olmasın: belirgin solda ise sol,
        // aksi halde (orta dahil) sağ koridor — müşteri ekranındaki turuncu yolla tutarlı.
        const side = sx < window.innerWidth / 2 - 4 ? -1 : 1;
        const mx = side < 0 ? PATH_MARGIN : window.innerWidth - PATH_MARGIN;
        const cp1y = sy + (ey - sy) * 0.3;
        const cp2y = sy + (ey - sy) * 0.72;
        paths.push({
            targetId: hint.targetId,
            d: `M ${sx} ${sy} C ${mx} ${cp1y}, ${mx} ${cp2y}, ${ex} ${ey}`,
            accent: hint.accent,
        });
    }

    return createPortal(
        <div className="fixed inset-0 z-[9985]" style={{ pointerEvents: 'none' }} role="presentation">
            <style>{`
                @keyframes coach-fade { from { opacity: 0 } to { opacity: 1 } }
                @keyframes coach-pop {
                    from { opacity: 0; transform: translateY(6px) scale(.96) }
                    to   { opacity: 1; transform: translateY(0) scale(1) }
                }
                @keyframes coach-echo-kf {
                    0%   { opacity: .55; transform: scale(1) }
                    70%  { opacity: 0;   transform: scale(1.07) }
                    100% { opacity: 0;   transform: scale(1.07) }
                }
                @keyframes coach-bounce-kf {
                    0%, 100% { transform: translateY(0) }
                    50%      { transform: translateY(7px) }
                }
                @keyframes coach-march-kf { to { stroke-dashoffset: -13 } }
                .coach-fade-in { animation: coach-fade .35s ease-out both }
                .coach-pop { animation: coach-pop .3s cubic-bezier(0.22, 1, 0.36, 1) both }
                .coach-echo { animation: coach-echo-kf 1.9s ease-out infinite }
                .coach-bounce { animation: coach-bounce-kf 1.1s ease-in-out infinite }
                .coach-march { animation: coach-march-kf 1.1s linear infinite }
                @media (prefers-reduced-motion: reduce) {
                    .coach-fade-in, .coach-pop { animation: none; opacity: 1 }
                    .coach-echo { animation: none; opacity: 0 }
                    .coach-bounce { animation: none }
                    .coach-march { animation: none }
                }
            `}</style>

            {/* Tek parça karartma — görsel katman, dokunuş yakalamaz */}
            <svg className="fixed inset-0 w-full h-full coach-fade-in" style={{ pointerEvents: 'none' }} aria-hidden="true">
                <defs>
                    <mask id="coach-scrim-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {sorted.map(({ hint, hole }) => (
                            <rect key={hint.targetId} x={hole.left} y={hole.top} width={hole.width} height={hole.height} rx={HOLE_RADIUS} fill="black" />
                        ))}
                    </mask>
                </defs>
                <rect x="0" y="0" width="100%" height="100%" fill={SCRIM} mask="url(#coach-scrim-mask)" />
            </svg>

            {/* Delik dışı dokunma bantları — her dokunuş atlamadır */}
            {bands.map((style, i) => (
                <div key={i} style={{ position: 'fixed', pointerEvents: 'auto', ...style }} onClick={onDismiss} />
            ))}

            {/* Renkli yollar — kenar koridorundan hedefe akan kesikli iz + yumuşak glow */}
            {paths.length > 0 && (
                <svg className="fixed inset-0 w-full h-full" style={{ pointerEvents: 'none' }} aria-hidden="true">
                    <g className="coach-fade-in" style={{ animationDelay: '200ms' }}>
                        {paths.map((p) => (
                            <path key={`glow-${p.targetId}`} d={p.d} fill="none" stroke={ACCENTS[p.accent].glow} strokeWidth={7} strokeLinecap="round" opacity={0.5} />
                        ))}
                        {paths.map((p) => (
                            <path
                                key={`dash-${p.targetId}`}
                                className="coach-march"
                                d={p.d}
                                fill="none"
                                stroke={ACCENTS[p.accent].text}
                                strokeWidth={3}
                                strokeLinecap="round"
                                strokeDasharray="1 12"
                            />
                        ))}
                    </g>
                </svg>
            )}

            {/* Halka + yankı + ok (hepsi dokunuş geçirmez) */}
            {sorted.map(({ hint, hole }, i) => {
                const a = ACCENTS[hint.accent];
                const delay = `${i * 150}ms`;
                const holeCenterX = hole.left + hole.width / 2;
                const chev = chevrons[hint.targetId];
                return (
                    <React.Fragment key={hint.targetId}>
                        {/* Sabit halka + yumuşak ışıma */}
                        <div
                            className="fixed coach-pop"
                            style={{
                                top: hole.top, left: hole.left, width: hole.width, height: hole.height,
                                borderRadius: HOLE_RADIUS,
                                border: `2px solid ${a.ring}`,
                                boxShadow: `0 0 22px 4px ${a.glow}`,
                                pointerEvents: 'none',
                                animationDelay: delay,
                            }}
                        />
                        {/* Dışa yayılan yankı halkası (radar nabzı — yalnız transform/opacity) */}
                        <div
                            className="fixed coach-echo"
                            style={{
                                top: hole.top, left: hole.left, width: hole.width, height: hole.height,
                                borderRadius: HOLE_RADIUS,
                                border: `2px solid ${a.ring}`,
                                pointerEvents: 'none',
                                animationDelay: `${450 + i * 150}ms`,
                            }}
                        />
                        {/* Sıçrayan ok — yolun vardığı yerde, deliğin hemen üstünde (sığmazsa yok).
                            Koyu alt-katman: parlak zeminlere (GİRİŞ YAP) denk gelince kontrast verir */}
                        {chev && (
                            <div
                                className="fixed coach-pop"
                                style={{
                                    top: chev.top,
                                    left: holeCenterX - chev.size / 2,
                                    pointerEvents: 'none',
                                    animationDelay: delay,
                                }}
                            >
                                <div className="coach-bounce relative" style={{ width: chev.size, height: chev.size }}>
                                    <ChevronDown className="absolute" style={{ width: '100%', height: '100%', color: 'rgba(2, 6, 23, 0.8)', top: 1.5, left: 0 }} strokeWidth={5} />
                                    <ChevronDown className="absolute inset-0" style={{ width: '100%', height: '100%', color: a.text }} strokeWidth={3} />
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                );
            })}

            {/* Kart sırası — çapanın (logo/başlık) altında yan yana; tek kartta ortalanır */}
            <div
                className="fixed flex items-stretch"
                style={{
                    top: anchorBottom != null ? anchorBottom + ROW_GAP : '24vh',
                    left: 16,
                    right: 16,
                    gap: 12,
                    justifyContent: 'center',
                    pointerEvents: 'none',
                }}
            >
                {hints.map((hint, i) => {
                    const a = ACCENTS[hint.accent];
                    return (
                        <div
                            key={hint.targetId}
                            ref={(el) => { cardElsRef.current[hint.targetId] = el; }}
                            className="coach-pop rounded-2xl"
                            style={{
                                flex: hints.length > 1 ? 1 : undefined,
                                maxWidth: hints.length > 1 ? undefined : 300,
                                minWidth: 0,
                                background: 'rgba(15, 23, 42, 0.96)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderLeft: `3px solid ${a.ring}`,
                                boxShadow: '0 14px 34px -12px rgba(0, 0, 0, 0.6)',
                                padding: 'clamp(10px, 1.6vh, 14px)',
                                animationDelay: `${i * 150}ms`,
                            }}
                        >
                            <p className="font-bold" style={{ color: a.text, fontSize: 'clamp(0.82rem, 2.1vh, 0.95rem)', marginBottom: 4 }}>
                                {hint.title}
                            </p>
                            <p className="text-slate-200 font-medium" style={{ fontSize: 'clamp(0.72rem, 1.85vh, 0.82rem)', lineHeight: 1.4 }}>
                                {hint.body}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>,
        document.body
    );
};
