import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TOUR_SCRIPTS } from './tourScripts';
import { TourStep } from './tourTypes';
import { useTour, advanceStep, setDemoPhase } from '../../services/tourStore';
import { TourSheet } from './TourSheet';

// ─────────────────────────────────────────────────────────────────────────────
// Spotlight overlay — kütüphanesiz. Karartma, hedef rect'indeki "delik" div'in
// dev box-shadow'u ile yapılır (shadow tıklama yakalamaz); deliğin 4 kenarındaki
// pointer-events:auto bloker div'ler kalan her dokunuşu yutar → yalnız
// vurgulanan öğe etkileşilebilir kalır. 'next' adımlarında deliğin üstü de
// şeffaf blokerle kapanır (salt gösterim). Hedefsiz adımlarda karartma HAFİF
// (sayfa net görünür) ve anlatım TourSheet'te — ortalanmış modal yok.
// z-[9990]: modallar z-[70] ve DemoChat z-[9980] üstünde, AnimatedSplash
// z-[9999] altında.
// ─────────────────────────────────────────────────────────────────────────────

const TARGET_RETRY_MS = 3000;
const PAD_DEFAULT = 8;
// Karartma YOK denecek kadar az (kullanıcı kararı): sayfa NORMAL parlaklıkta
// görünür; odak vurgusunu karartma değil, hedefin turf çerçeve + IŞIMASI taşır.
// Hedefsiz adımlar tam şeffaf — görünmez bloker yalnız dokunuşu engeller.
const DIM_SPOTLIGHT = 'rgba(2, 6, 23, 0.15)';
const DIM_SOFT = 'rgba(0, 0, 0, 0)';
// Focus "ekstra aydınlatma" ışıması (turf-400 tonunda dış parlama)
const GLOW = '0 0 28px 6px rgba(74, 222, 128, 0.45)';

interface Hole { top: number; left: number; width: number; height: number }

const StepOverlay: React.FC<{ step: TourStep; stepIndex: number; total: number }> = ({ step, stepIndex, total }) => {
    const [hole, setHole] = useState<Hole | null>(null);
    const [targetLost, setTargetLost] = useState(false);
    const lastHoleRef = useRef<Hole | null>(null);

    // Adım giriş yan etkisi (ör. Sahalar son adımı: sahte sohbeti kapat, sayfa geri gelsin)
    useEffect(() => {
        if (step.onEnter === 'close-demo-chat') setDemoPhase('idle');
    }, [step]);

    // KAYDIRMA KİLİDİ: delik dokunuşu alta geçirdiğinden kullanıcı listeyi kaydırıp
    // hedefi ekran dışına çıkarabiliyordu. Tur boyunca touchmove engellenir — delikten
    // yalnız TAP geçer. Sheet'in kendi iç scroll'u ([data-tour-sheet]) serbest.
    // React synthetic değil native non-passive listener (CLAUDE.md long-press kuralıyla
    // aynı gerekçe: passive dinleyicide preventDefault çalışmaz).
    useEffect(() => {
        const preventScroll = (e: TouchEvent) => {
            const t = e.target as HTMLElement | null;
            if (t?.closest?.('[data-tour-sheet]')) return;
            e.preventDefault();
        };
        document.addEventListener('touchmove', preventScroll, { passive: false, capture: true });
        return () => document.removeEventListener('touchmove', preventScroll, true);
    }, []);

    // Hedefi bul + rAF döngüsüyle rect takibi (akordeon animasyonu, scroll, modal
    // mount'u...). Hedef TARGET_RETRY_MS içinde bulunamazsa hedefsiz görünüme düş —
    // tur asla kilitlenmez.
    useEffect(() => {
        if (!step.target) return;
        let rafId = 0;
        let scrolled = false;
        const startedAt = performance.now();
        const pad = step.spotlightPadding ?? PAD_DEFAULT;

        const loop = () => {
            const el = document.querySelector<HTMLElement>(`[data-tour-id="${step.target}"]`);
            if (el) {
                if (!scrolled) {
                    scrolled = true;
                    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { /* eski WebView */ }
                }
                const r = el.getBoundingClientRect();
                // Delik yüksekliği ekranın %50'sini aşamaz: uzun hedeflerde (ör. Rakip
                // Arayanlar bölümü) alt yarı sheet'e kalır — kart/spotlight çakışması
                // yapısal olarak imkânsız. Küçük hedefler etkilenmez.
                const rawTop = r.top - pad;
                const next: Hole = {
                    top: Math.max(rawTop, 8),
                    left: r.left - pad,
                    width: r.width + pad * 2,
                    height: Math.min(r.height + pad * 2 - (Math.max(rawTop, 8) - rawTop), window.innerHeight * 0.5),
                };
                const prev = lastHoleRef.current;
                // Her karede setState olmasın — 0.5px üstü değişimde güncelle
                if (!prev || Math.abs(prev.top - next.top) > 0.5 || Math.abs(prev.left - next.left) > 0.5 ||
                    Math.abs(prev.width - next.width) > 0.5 || Math.abs(prev.height - next.height) > 0.5) {
                    lastHoleRef.current = next;
                    setHole(next);
                }
            } else if (!lastHoleRef.current && performance.now() - startedAt > TARGET_RETRY_MS) {
                setTargetLost(true);
                return; // döngüyü bitir
            }
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [step]);

    // target-tap: hedefe capture-phase dinleyici — uygulamanın kendi onClick'i
    // çalıştıktan SONRAKİ macrotask'te ilerle (senkron state değişimi tamamlanır).
    useEffect(() => {
        if (step.advance !== 'target-tap' || !step.target) return;
        const handler = (e: Event) => {
            const el = document.querySelector(`[data-tour-id="${step.target}"]`);
            if (el && e.target instanceof Node && el.contains(e.target)) {
                setTimeout(() => advanceStep(), 0);
            }
        };
        document.addEventListener('click', handler, true);
        return () => document.removeEventListener('click', handler, true);
    }, [step]);

    const tappable = step.advance === 'target-tap' || step.advance === 'event';
    const showHole = !!step.target && !!hole && !targetLost;

    return (
        <div className="fixed inset-0 z-[9990]" style={{ pointerEvents: 'none' }}>
            {showHole && hole ? (
                <>
                    {/* Delik: hafif karartma + hedefi parlatan turf ışıması — dokunuş yakalamaz */}
                    <div
                        className={`fixed rounded-2xl border-2 border-turf-400 ${tappable ? 'animate-pulse' : ''}`}
                        style={{
                            top: hole.top, left: hole.left, width: hole.width, height: hole.height,
                            boxShadow: `0 0 0 200vmax ${DIM_SPOTLIGHT}, ${GLOW}`,
                            pointerEvents: 'none',
                        }}
                    />
                    {/* 4 kenar bloker — delik dışındaki her dokunuşu yutar */}
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: Math.max(0, hole.top), pointerEvents: 'auto' }} />
                    <div style={{ position: 'fixed', top: hole.top + hole.height, left: 0, right: 0, bottom: 0, pointerEvents: 'auto' }} />
                    <div style={{ position: 'fixed', top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.height, pointerEvents: 'auto' }} />
                    <div style={{ position: 'fixed', top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height, pointerEvents: 'auto' }} />
                    {/* Salt gösterim adımlarında deliğin üstü de kapalı */}
                    {!tappable && (
                        <div style={{ position: 'fixed', top: hole.top, left: hole.left, width: hole.width, height: hole.height, pointerEvents: 'auto' }} />
                    )}
                </>
            ) : (
                // Hedefsiz / hedef bulunamayan adım: görünmez tam ekran bloker — sayfa
                // NORMAL görünür. İstisna: backdrop:'dark' (karşılama kartı) koyu karartır.
                <div
                    className="fixed inset-0"
                    style={{
                        background: step.backdrop === 'dark' ? 'rgba(2, 6, 23, 0.85)' : DIM_SOFT,
                        pointerEvents: 'auto',
                    }}
                />
            )}

            <TourSheet
                step={step}
                stepIndex={stepIndex}
                total={total}
                hole={showHole ? hole : null}
            />
        </div>
    );
};

export const TourOverlay: React.FC = () => {
    const tour = useTour();
    if (!tour.activeTour) return null;
    const steps = TOUR_SCRIPTS[tour.activeTour];
    const step = steps[tour.stepIndex];
    if (!step) return null;

    return createPortal(
        // key: adım değişince ölçüm/dinleyici state'i sıfırdan kurulsun
        <StepOverlay key={`${tour.activeTour}-${tour.stepIndex}`} step={step} stepIndex={tour.stepIndex} total={steps.length} />,
        document.body
    );
};
