import React, { useEffect, useMemo, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { markBootSplashDone } from '../../services/bootSplashStore';
import { WORDMARK_LETTERS, WORDMARK_DOT_REVEALS } from './splashWordmark';

/**
 * AnimatedSplash — uygulama açılış animasyonu ("perde" mimarisi).
 *
 * App() içinde provider ağacının KARDEŞİ olarak mount edilir; arkasında gerçek uygulama
 * (auth restore, guard'lar, lazy chunk'lar) boot olurken tam ekran opak perde olarak oynar.
 * Perde solmaya başlarken markBootSplashDone() → Login koreografisi tam o anda başlar.
 *
 * ── KARE-ZAMANLI rAF SÜRÜCÜSÜ (agent.md §66 — boot yolunda duvar-saatli CSS animasyonu YASAK) ──
 * CSS keyframe animasyonları belge zaman çizelgesinde (DUVAR SAATİ) akar; soğuk süreç
 * açılışında ana iş parçacığı ilk boyadan SONRA saniyelerce duraklayabilir (lazy chunk parse,
 * provider'lar) → ekran güncellenmezken CSS saatleri tükenir, animasyon hiç görünmez
 * (Redmi 10S "recents'ten öldür → hemen aç" vakası; saat-kapısı/started denemesi de yetmedi).
 * Bu yüzden tüm zaman çizelgesi TEK requestAnimationFrame döngüsünden sürülür: her tick'te
 * dt = min(gerçek dt, 50ms) birikir — kare gelmezse animasyon DURAKLAR, kare akınca kaldığı
 * yerden sürer. Reveal/finish de aynı birikimli saatten tetiklenir → görünenle hep senkron.
 *
 * - Saf inline SVG; kare başına React render YOK (stiller imperatif yazılır) — §28: boot
 *   yolunda Lottie/lib YASAK.
 * - NETLİK (§63): SVG'ye filter (glow) ve sürekli transform katmanı EKLENMEZ; çizim yalnız
 *   stroke-dashoffset (paint-level, vektör-keskin).
 * - Wordmark "DİMLİ" FONT DEĞİL, baked vektör kontur (splashWordmark.ts).
 * - §54 KALICI GOTCHA: path'lere ASLA vectorEffect="non-scaling-stroke" EKLEME
 *   (vectorEffect + pathLength/dasharray üçlüsü iOS/WebKit'te stroke-draw'u kırar).
 * - dvh/svh YASAK (eski MIUI WebView) — sahne yalnızca vh/vw ile ölçülür.
 */

const INTRO_SEEN_KEY = 'dimli_splash_intro_seen';
const VARIANT_HINT_KEY = 'dimli_splash_variant'; // GELECEK: işletme login'i 'business' yazınca varyant seçilir

/** Saha yeşili — canlı ama koyu; parlama/glow olmadan lacivert zeminde net (kullanıcı seçimi) */
const GREEN = '#2f8a22';

function safeRead(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
}

// Boot anında BİR KEZ okunur: StrictMode'un anlık remount'u ilk açılışın temposunu bozamaz.
const INTRO_SEEN_AT_BOOT = safeRead(INTRO_SEEN_KEY) === '1';
// İlk açılış 0.75× (~4.4sn), sonraki açılışlar 0.45× (~2.6sn) — taban çizelge 5.85sn
const SPEED = INTRO_SEEN_AT_BOOT ? 0.45 : 0.75;
const TOTAL_S = 5.85;          // taban zaman çizelgesi (solma 5.45'te başlar + 0.4sn)
const REVEAL_S = 5.45;         // perde solmaya başladığı an (Login koreografisi tetiklenir)
const FADE_S = 0.4;            // perde solma süresi (taban)
const REDUCED_TOTAL_MS = 1250; // reduce-motion: ~0.9sn statik son kare + 0.3sn solma

// ── Kare-ısınma kapısı (agent.md §66) ──
// rAF ana iş parçacığında koşar; soğuk başlangıçta boot blokajlarının arasında tek-tük ateşlenir
// ama compositor basmaz → acc EKRANA YANSIMADAN yürürse animasyon kaybolur (Redmi/WebView 92 vakası).
// Bu yüzden acc yalnız AKICI kareler basılırken ilerler: ardışık WARM_STREAK adet, birbirine
// WARM_FRAME_MS'ten yakın kare. Boot blokajı rAF gap'leri >> 100ms; düzenli basım < 100ms → ayrışır.
const WARM_FRAME_MS = 100;     // ardışık kareler bu gap'in altındaysa = akıcı/düzenli basım
const WARM_STREAK = 4;         // 4 ardışık akıcı kare → ısındı (hızlı cihazda ~66ms)
const WARM_FAILSAFE_MS = 4500; // bu süreye kadar ısınmazsa statik son kareye düş

// Cihaz teşhisi için (logcat'e düşer). Redmi doğrulaması tamamlandı → kapalı.
const __SPLASH_DEBUG = false;
const slog = (msg: string) => { if (__SPLASH_DEBUG) { try { console.log('[splash] ' + msg); } catch { /* */ } } };

// ── Cubic-bezier değerlendirici (CSS easing'lerin JS eşleniği; Newton + ikiye bölme) ──
function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
    const ax = 3 * x1 - 3 * x2 + 1, bx = 3 * x2 - 6 * x1, cx = 3 * x1;
    const ay = 3 * y1 - 3 * y2 + 1, by = 3 * y2 - 6 * y1, cy = 3 * y1;
    const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
    const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
    const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
    return (x: number): number => {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        let t = x;
        for (let i = 0; i < 6; i++) {
            const err = sampleX(t) - x;
            if (Math.abs(err) < 1e-5) return sampleY(t);
            const d = sampleDX(t);
            if (Math.abs(d) < 1e-6) break;
            t -= err / d;
        }
        let lo = 0, hi = 1;
        t = x;
        while (hi - lo > 1e-5) {
            if (sampleX(t) < x) lo = t; else hi = t;
            t = (lo + hi) / 2;
        }
        return sampleY(t);
    };
}

const EASE_DRAW = cubicBezier(0.65, 0, 0.35, 1);
const EASE_PEN_D = cubicBezier(0.55, 0, 0.45, 1);
const EASE_PEN = cubicBezier(0.5, 0, 0.5, 1);
const EASE_POP = cubicBezier(0.34, 1.56, 0.64, 1);
const EASE_CSS = cubicBezier(0.25, 0.1, 0.25, 1); // CSS 'ease' eşleniği (tam-reveal + perde solması)

// ── Zaman çizelgesi (taban saniye — SPEED çarpanı sürücüde uygulanır) ──
type Kind = 'draw' | 'pop' | 'fadein';
interface Step { key: string; kind: Kind; dur: number; delay: number; ease: (t: number) => number }
const TIMELINE: Step[] = [
    // Faz 1 — dış D harfi
    { key: 'd1', kind: 'draw', dur: 0.9, delay: 0, ease: EASE_DRAW },
    { key: 'd2', kind: 'draw', dur: 0.9, delay: 0.15, ease: EASE_DRAW },
    { key: 'd3', kind: 'draw', dur: 0.3, delay: 0.45, ease: EASE_DRAW },
    { key: 'd4', kind: 'draw', dur: 0.35, delay: 0.62, ease: EASE_DRAW },
    // Faz 2 — saha çizgileri
    { key: 's1', kind: 'draw', dur: 0.4, delay: 1.05, ease: EASE_DRAW },
    { key: 's2', kind: 'draw', dur: 0.45, delay: 1.25, ease: EASE_DRAW },
    { key: 's3', kind: 'draw', dur: 0.3, delay: 1.55, ease: EASE_DRAW },
    // Faz 3 — orta yuvarlak + nokta
    { key: 'c1', kind: 'draw', dur: 0.45, delay: 1.95, ease: EASE_DRAW },
    { key: 'c2', kind: 'pop', dur: 0.18, delay: 2.45, ease: EASE_POP },
    // Wordmark kalem maskesi
    { key: 'm1', kind: 'draw', dur: 0.4, delay: 3.12, ease: EASE_PEN_D },
    { key: 'm2', kind: 'draw', dur: 0.2, delay: 3.56, ease: EASE_PEN },
    { key: 'm3', kind: 'draw', dur: 0.13, delay: 3.78, ease: EASE_PEN },
    { key: 'm4', kind: 'pop', dur: 0.14, delay: 3.93, ease: EASE_POP },
    { key: 'm5', kind: 'draw', dur: 0.32, delay: 4.02, ease: EASE_PEN },
    { key: 'm6', kind: 'draw', dur: 0.22, delay: 4.38, ease: EASE_PEN },
    { key: 'm7', kind: 'draw', dur: 0.2, delay: 4.64, ease: EASE_PEN },
    { key: 'm8', kind: 'draw', dur: 0.13, delay: 4.86, ease: EASE_PEN },
    { key: 'm9', kind: 'pop', dur: 0.14, delay: 5.01, ease: EASE_POP },
    // Tam-reveal katmanı (final kare garantisi)
    { key: 'fr', kind: 'fadein', dur: 0.25, delay: 5.05, ease: EASE_CSS },
];

export type SplashVariant = 'default' | 'business';

/**
 * Frame-0'da senkron varyant seçimi (auth restore async, ~100ms sonra biter — beklenemez).
 * GELECEK: AuthContext.loginAsBusiness 'business' yazıp logout/loginAsCustomer sildiğinde
 * App() bunu variant prop'una geçirir; bugün hiçbir yer key yazmıyor → hep 'default'.
 */
export function getBootSplashVariant(): SplashVariant {
    return safeRead(VARIANT_HINT_KEY) === 'business' ? 'business' : 'default';
}

interface AnimatedSplashProps {
    onFinish: () => void;
    /** GELECEK: işletme-özel açılış sanatı — bugün iki varyant da aynı timeline'ı render eder */
    variant?: SplashVariant;
}

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({ onFinish }) => {
    // Tek seferlik okuma yeterli — splash birkaç saniye yaşar, canlı izlemeye gerek yok
    const reduce = useMemo(
        () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
        []
    );

    const rootRef = useRef<HTMLDivElement>(null);
    const onFinishRef = useRef(onFinish);
    onFinishRef.current = onFinish;

    // Baz stiller: reduce → statik SON KARE; değilse BAŞLANGIÇ karesi (gizli) — sürücü ilerletir
    const base = (kind: Kind): React.CSSProperties =>
        reduce
            ? kind === 'draw' ? {} : { opacity: 1 }
            : kind === 'draw'
                ? { strokeDasharray: 1.05, strokeDashoffset: 1.08 }
                : kind === 'pop'
                    ? { opacity: 0, transformBox: 'fill-box', transformOrigin: 'center' }
                    : { opacity: 0 };

    useEffect(() => {
        // Başta yazılır: hız modül scope'ta yakalandığından bu açılış planlanan tempoda oynar;
        // animasyon ortasında çökme olsa bile "görüldü" sayılır.
        try { localStorage.setItem(INTRO_SEEN_KEY, '1'); } catch { /* ignore */ }

        // Native splash gizleme — artık İLK AKICI KAREDE (warm) çağrılır, ilk rAF'ta değil:
        // boot boyunca native navy splash durur, WebView gerçekten akıcı basınca devralınır
        // (dikişsiz + gerçek-boya garantili). Çift çağrı plugin'de no-op (isVisible guard).
        let hidden = false;
        const hideNative = () => {
            if (hidden) return;
            hidden = true;
            if (Capacitor.isNativePlatform()) {
                SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => { });
            }
        };

        if (__SPLASH_DEBUG) {
            try {
                const paints = performance.getEntriesByType('paint')
                    .map((e) => e.name + ':' + Math.round(e.startTime)).join(',');
                slog(`mount seen=${INTRO_SEEN_AT_BOOT} speed=${SPEED} reduce=${reduce} paints=[${paints}]`);
            } catch { /* */ }
        }

        if (reduce) {
            // Statik son kare zaten render'da; yalnız reveal/finish duvar zamanlayıcıları
            const backstop = setTimeout(hideNative, 300);
            const reveal = setTimeout(markBootSplashDone, 900);
            const finish = setTimeout(() => {
                markBootSplashDone();
                onFinishRef.current();
            }, REDUCED_TOTAL_MS);
            const raf = requestAnimationFrame(hideNative);
            return () => {
                cancelAnimationFrame(raf);
                clearTimeout(backstop);
                clearTimeout(reveal);
                clearTimeout(finish);
            };
        }

        // ── rAF sürücüsü (kare-ısınma kapılı) ──
        const rootEl = rootRef.current;
        const els = new Map<string, SVGElement>();
        rootEl?.querySelectorAll<SVGElement>('[data-splash-key]').forEach((el) => {
            const k = el.getAttribute('data-splash-key');
            if (k) els.set(k, el);
        });

        const S = SPEED;
        const revealAt = REVEAL_S * S;
        const totalAt = TOTAL_S * S;
        let acc = 0;          // birikimli KARE zamanı (sn) — yalnız warm olduktan sonra ilerler
        let last = -1;
        let warm = false;     // ısınma kapısı: acc yalnız akıcı basım başlayınca ilerler
        let goodStreak = 0;
        let revealed = false;
        let done = false;
        let rafId = 0;
        let frameNo = 0;
        let failsafeFinish: ReturnType<typeof setTimeout> | undefined;

        const applyFinalStatic = () => {
            for (const step of TIMELINE) {
                const el = els.get(step.key);
                if (!el) continue;
                if (step.kind === 'draw') el.style.strokeDashoffset = '0';
                else {
                    el.style.opacity = '1';
                    if (step.kind === 'pop') el.style.transform = 'scale(1)';
                }
            }
        };

        const applyFrame = () => {
            for (const step of TIMELINE) {
                const el = els.get(step.key);
                if (!el) continue;
                const local = (acc - step.delay * S) / (step.dur * S);
                if (local <= 0) continue; // baz stil = başlangıç karesi
                const e = step.ease(local >= 1 ? 1 : local);
                if (step.kind === 'draw') {
                    el.style.strokeDashoffset = String(1.08 * (1 - e));
                } else if (step.kind === 'pop') {
                    // CSS keyframe eşleniği: 0%→70% opacity 0→1 + scale 0→1.3; 70%→100% scale 1.3→1
                    el.style.opacity = String(Math.min(1, e / 0.7));
                    const sc = e <= 0.7 ? (1.3 * e) / 0.7 : 1.3 - ((e - 0.7) / 0.3) * 0.3;
                    el.style.transform = `scale(${sc})`;
                } else {
                    el.style.opacity = String(e);
                }
            }
            // Perde solması — aynı birikimli saatten (görünenle hep senkron)
            if (rootEl && acc >= revealAt) {
                const f = Math.min(1, (acc - revealAt) / (FADE_S * S));
                rootEl.style.opacity = String(1 - EASE_CSS(f));
            }
        };

        const tick = (now: number) => {
            if (done) return;
            if (last < 0) { last = now; rafId = requestAnimationFrame(tick); return; } // referans kare

            const rawDt = now - last;
            last = now;
            frameNo++;

            if (!warm) {
                // Isınma: ardışık akıcı kare say. Boot blokajı boşluğundaki büyük-gap kareler sıfırlar.
                if (rawDt < WARM_FRAME_MS) goodStreak++; else goodStreak = 0;
                if (__SPLASH_DEBUG && frameNo <= 80) slog(`warmup f=${frameNo} dt=${Math.round(rawDt)} good=${goodStreak}`);
                if (goodStreak >= WARM_STREAK) {
                    warm = true;
                    hideNative(); // WebView akıcı basıyor → native splash'ı şimdi devral (dikişsiz)
                    slog(`WARM @f=${frameNo} → animasyon görünür başlıyor`);
                }
                rafId = requestAnimationFrame(tick);
                return;
            }

            // dt clamp 50ms: ısınma sonrası tek büyük kare gelse bile animasyon SIÇRAMAZ
            const dt = Math.min(rawDt, 50);
            acc += dt / 1000;
            applyFrame();
            if (__SPLASH_DEBUG && frameNo <= 140) slog(`play f=${frameNo} dt=${Math.round(rawDt)} acc=${acc.toFixed(2)}`);
            if (!revealed && acc >= revealAt) {
                revealed = true;
                markBootSplashDone();
                slog(`reveal acc=${acc.toFixed(2)}`);
            }
            if (acc >= totalAt) {
                done = true;
                markBootSplashDone(); // sigorta — idempotent
                slog('finish');
                onFinishRef.current();
                return;
            }
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);

        // Isınma felaket sigortası: bu süreye kadar akıcı kare akışı başlamadıysa (cihaz patolojik
        // yavaş / hiç ısınmadı) → native hide + statik SON KARE (amblem + DİMLİ tam) + kısa sonra
        // bitir. Boş lacivert ekran İMKÂNSIZ; kullanıcı en kötü ihtimalle markalı statik kare görür.
        const failsafe = setTimeout(() => {
            if (!warm && !done) {
                done = true;
                cancelAnimationFrame(rafId);
                hideNative();
                applyFinalStatic();
                markBootSplashDone();
                slog('FAILSAFE statik son kare (ısınmadı)');
                failsafeFinish = setTimeout(() => onFinishRef.current(), 1200);
            }
        }, WARM_FAILSAFE_MS);

        return () => {
            done = true;
            cancelAnimationFrame(rafId);
            clearTimeout(failsafe);
            if (failsafeFinish) clearTimeout(failsafeFinish);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            ref={rootRef}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{
                background: '#0f172a',
                // Solma: normal akışta rAF sürücüsü opacity'yi imperatif yazar;
                // reduce'da kısa CSS solması yeterli (statik karede duraklama riski önemsiz)
                animation: reduce ? 'splash-fadeout 0.3s ease 0.9s forwards' : undefined,
            }}
        >
            {/* 9:16 sahne — her telefonda birebir aynı kompozisyon; tablette lacivert letterbox (görünmez) */}
            <div
                style={{
                    width: 'min(100vw, calc(100vh * 9 / 16))',
                    height: 'min(100vh, calc(100vw * 16 / 9))',
                    background: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <div style={{ width: '74%' }}>
                    <svg viewBox="0 0 400 560" fill="none" style={{ display: 'block', width: '100%' }}>
                        {/* Faz 1 — dış D harfi */}
                        <g stroke={GREEN} strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round">
                            <path
                                data-splash-key="d1"
                                d="M24 36 H215 C282 42 330 74 355 122 C370 152 376 180 376 208 C376 236 370 264 355 294 C330 342 282 372 259 378 H25"
                                pathLength={1} style={base('draw')}
                            />
                            <path
                                data-splash-key="d2"
                                d="M24 37 C24 45 24.5 52 25.5 59 C36 70 52 84 79 96 C110 104.5 160 104.5 205 104 C232 108 255 120 272 137 A70 70 0 0 1 272 277 C247 297 205 312 162 320 C110 330 58 352 25 376"
                                pathLength={1} style={base('draw')}
                            />
                            <path data-splash-key="d3" d="M85 126 L25 375" pathLength={1} style={base('draw')} />
                            <path
                                data-splash-key="d4"
                                d="M85 126 C115 141 143 165 143 195 C143 233 126 268 111 298"
                                pathLength={1} style={base('draw')}
                            />
                        </g>

                        {/* Faz 2 — saha çizgileri */}
                        <g stroke={GREEN} strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round">
                            <path data-splash-key="s1" d="M198 36 V378" pathLength={1} style={base('draw')} />
                            <path
                                data-splash-key="s2"
                                d="M302 138 H356 V173 H374 V247 H356 V278 H302 Z"
                                pathLength={1} style={base('draw')}
                            />
                            <path data-splash-key="s3" d="M302 175 A42 42 0 0 0 302 252" pathLength={1} style={base('draw')} />
                        </g>

                        {/* Faz 3 — orta yuvarlak + nokta */}
                        <g stroke={GREEN} strokeWidth="8.5">
                            <circle data-splash-key="c1" cx="198" cy="207" r="42" pathLength={1} style={base('draw')} />
                            <circle data-splash-key="c2" cx="198" cy="207" r="5.5" fill={GREEN} stroke="none" style={base('pop')} />
                        </g>

                        {/* Wordmark — "DİMLİ" baked vektör konturlar (splashWordmark.ts), fonta bağımsız.
                            Gizli kalem-yolu maskesi her harfin yazım yolu boyunca süpürülür; yazı el
                            yazısıyla yazılıyormuş gibi belirir. Sondaki tam-reveal katmanı, süpürme
                            dışında kalabilecek px'lik kenarları da açarak KUSURSUZ final kare garantiler. */}
                        <defs>
                            <mask id="splash-pen-reveal" maskUnits="userSpaceOnUse" x="0" y="395" width="400" height="150">
                                <g fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round">
                                    <path
                                        data-splash-key="m1"
                                        d="M40 448 C40 468 35 494 32 514 C52 509 70 497 77 483 C83 468 80 455 69 451 C61 447 47 447 40 448"
                                        strokeWidth="30" pathLength={1} style={base('draw')}
                                    />
                                    <path
                                        data-splash-key="m2"
                                        d="M131 454 C139 448 150 447 157 450 C151 453 146 455 143 459 C138 470 133 482 128 492"
                                        strokeWidth="24" pathLength={1} style={base('draw')}
                                    />
                                    <path
                                        data-splash-key="m3"
                                        d="M104 503 C118 508 135 505 147 499"
                                        strokeWidth="28" pathLength={1} style={base('draw')}
                                    />
                                    <circle
                                        data-splash-key="m4"
                                        cx={WORDMARK_DOT_REVEALS[0].cx} cy={WORDMARK_DOT_REVEALS[0].cy} r={WORDMARK_DOT_REVEALS[0].r + 3}
                                        fill="#ffffff" stroke="none" style={base('pop')}
                                    />
                                    <path
                                        data-splash-key="m5"
                                        d="M176 511 C182 490 198 464 206 447 C209 466 212 488 215 503 C221 484 231 463 238 445 C241 466 244 492 246 510"
                                        strokeWidth="30" pathLength={1} style={base('draw')}
                                    />
                                    <path
                                        data-splash-key="m6"
                                        d="M298 444 C291 442 286 445 285 450 C281 468 278 489 273 504 C284 510 298 506 309 500"
                                        strokeWidth="28" pathLength={1} style={base('draw')}
                                    />
                                    <path
                                        data-splash-key="m7"
                                        d="M360 454 C368 448 379 447 386 450 C380 453 375 455 372 459 C367 470 362 482 357 492"
                                        strokeWidth="24" pathLength={1} style={base('draw')}
                                    />
                                    <path
                                        data-splash-key="m8"
                                        d="M333 503 C347 508 364 505 376 499"
                                        strokeWidth="28" pathLength={1} style={base('draw')}
                                    />
                                    <circle
                                        data-splash-key="m9"
                                        cx={WORDMARK_DOT_REVEALS[1].cx} cy={WORDMARK_DOT_REVEALS[1].cy} r={WORDMARK_DOT_REVEALS[1].r + 3}
                                        fill="#ffffff" stroke="none" style={base('pop')}
                                    />
                                    {/* Tam-reveal: kalem süpürmesinin dışında kalan px'lik kenarlar da açılır */}
                                    <rect data-splash-key="fr" x="0" y="395" width="400" height="150" fill="#ffffff" stroke="none" style={base('fadein')} />
                                </g>
                            </mask>
                        </defs>
                        <g mask="url(#splash-pen-reveal)">
                            {WORDMARK_LETTERS.map((l, i) => (
                                <path
                                    key={`${l.ch}-${i}`}
                                    d={l.d}
                                    fill={GREEN}
                                    stroke={GREEN}
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            ))}
                        </g>
                    </svg>
                </div>
            </div>
            <style>{`
        @keyframes splash-fadeout { to { opacity: 0; } }
      `}</style>
        </div>
    );
};
