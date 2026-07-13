import React, { useLayoutEffect, useRef, useState } from 'react';
import {
    Sparkles, MapPin, Clock, Megaphone, Shield, MessageSquare,
    Phone, Users, Zap, UserPlus, Flag, SlidersHorizontal,
} from 'lucide-react';
import { TourStep, TourStepIcon } from './tourTypes';
import { useTour, advanceStep, skipTour, requestTourSkipConfirm, cancelTourSkipConfirm } from '../../services/tourStore';

// ─────────────────────────────────────────────────────────────────────────────
// Tur kartı v2 — repo bottom-sheet dili (rounded-t-3xl + animate-slide-up +
// grab-handle + safe-area). Varsayılan konum EKRAN ALTI: sayfa üstte net
// görünür (oyun tarzı anlatıcı paneli). Delik sheet alanına girerse sheet
// ÜSTE geçer — sheet yüksekliği GERÇEKTEN ölçülür (sabit px varsayımı yok,
// taşma yapısal olarak imkânsız). Tipografi clamp() ile akışkan: ekran
// küçüldükçe font küçülür, sıkışma/taşma olmaz (JokerPool başlık deseni).
// ─────────────────────────────────────────────────────────────────────────────

const ICONS: Record<TourStepIcon, { node: React.ReactNode; chip: string }> = {
    welcome: { node: <Sparkles className="w-4 h-4" />, chip: 'bg-turf-500/20 text-turf-400' },
    pitch: { node: <MapPin className="w-4 h-4" />, chip: 'bg-turf-500/20 text-turf-400' },
    clock: { node: <Clock className="w-4 h-4" />, chip: 'bg-amber-500/20 text-amber-400' },
    megaphone: { node: <Megaphone className="w-4 h-4" />, chip: 'bg-orange-500/20 text-orange-400' },
    shield: { node: <Shield className="w-4 h-4" />, chip: 'bg-blue-500/20 text-blue-400' },
    chat: { node: <MessageSquare className="w-4 h-4" />, chip: 'bg-sky-500/20 text-sky-400' },
    phone: { node: <Phone className="w-4 h-4" />, chip: 'bg-turf-500/20 text-turf-400' },
    team: { node: <Users className="w-4 h-4" />, chip: 'bg-blue-500/20 text-blue-400' },
    zap: { node: <Zap className="w-4 h-4" />, chip: 'bg-yellow-500/20 text-yellow-400' },
    'user-plus': { node: <UserPlus className="w-4 h-4" />, chip: 'bg-turf-500/20 text-turf-400' },
    flag: { node: <Flag className="w-4 h-4" />, chip: 'bg-turf-500/20 text-turf-400' },
    filter: { node: <SlidersHorizontal className="w-4 h-4" />, chip: 'bg-turf-500/20 text-turf-400' },
};

interface Props {
    step: TourStep;
    stepIndex: number;
    total: number;
    hole: { top: number; left: number; width: number; height: number } | null;
}

export const TourSheet: React.FC<Props> = ({ step, stepIndex, total, hole }) => {
    const { skipConfirmOpen } = useTour();
    const sheetRef = useRef<HTMLDivElement>(null);
    const [sheetH, setSheetH] = useState(0);
    // FLIP KİLİDİ: çakışma ilk tespit edildiğinde üste geçilir ve adım boyunca
    // ORADA KALINIR — türetilmiş flip, sınır durumda her ölçümde alt↔üst
    // osilasyonu yapıyordu (Android'de 6. joker adımında kart yanıp sönüp
    // dokunuşu tıkıyordu). TourSheet her adımda StepOverlay key'iyle yeniden
    // mount olduğundan kilit adım değişince doğal sıfırlanır.
    const [flipToTop, setFlipToTop] = useState(false);

    // Sheet yüksekliğini gerçekten ölç — flip kararı buna dayanır.
    useLayoutEffect(() => {
        const el = sheetRef.current;
        if (!el) return;
        const measure = () => setSheetH(el.getBoundingClientRect().height);
        measure();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
        ro?.observe(el);
        return () => ro?.disconnect();
    }, [step, skipConfirmOpen]);

    // Delik alttaki sheet bölgesiyle çakışıyorsa üste kilitle (tek yönlü).
    // Compact adımlarda flip YOK: sheet hep altta, delik tavanı overlay'de kısılır.
    useLayoutEffect(() => {
        if (step.compact || flipToTop || !hole || sheetH <= 0) return;
        if (hole.top + hole.height > window.innerHeight - sheetH - 8) {
            setFlipToTop(true);
        }
    }, [hole, sheetH, flipToTop, step.compact]);

    const icon = step.icon ? ICONS[step.icon] : null;

    // ── Mini düzen: kompakt adımlar (altta) VE üste açılan kart (flipToTop) —
    // "yukarıdan açılan modal" da artık küçük, içerik kapanmaz (kullanıcı kararı)
    const miniTop = flipToTop && !step.compact;
    if ((step.compact || flipToTop) && !skipConfirmOpen) {
        return (
            <div
                ref={sheetRef}
                data-tour-sheet
                className={`fixed left-0 right-0 bg-slate-900/95 backdrop-blur-md shadow-2xl shadow-black/60 ${
                    miniTop
                        ? 'top-0 rounded-b-3xl border-b border-slate-700 animate-fade-in'
                        : 'bottom-0 rounded-t-3xl border-t border-slate-700 animate-slide-up'
                }`}
                style={{
                    pointerEvents: 'auto',
                    paddingTop: miniTop ? 'max(10px, env(safe-area-inset-top))' : undefined,
                    paddingBottom: miniTop ? undefined : 'max(12px, env(safe-area-inset-bottom))',
                }}
            >
                <div className={`absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-turf-500 to-transparent ${miniTop ? 'bottom-0' : 'top-0'}`} />
                <div className="max-w-md mx-auto px-4 pt-3 pb-1">
                    <div className="flex items-center gap-2 mb-1.5">
                        {icon && <div className={`p-1 rounded-lg shrink-0 ${icon.chip}`}>{icon.node}</div>}
                        <span className="text-[10px] font-black text-turf-400 bg-turf-900/40 border border-turf-500/30 px-2 py-0.5 rounded-full tracking-widest shrink-0">
                            {stepIndex + 1} / {total}
                        </span>
                        <h3
                            className="font-sport font-black text-white italic uppercase tracking-wide leading-tight truncate flex-1"
                            style={{ fontSize: 'clamp(0.85rem, 3.8vw, 1.05rem)' }}
                        >
                            {step.title}
                        </h3>
                        <button
                            onClick={requestTourSkipConfirm}
                            className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-2 -mr-1 rounded-lg transition-colors shrink-0"
                        >
                            Atla
                        </button>
                    </div>
                    <p className="text-slate-300 leading-snug" style={{ fontSize: 'clamp(0.72rem, 3vw, 0.85rem)' }}>
                        {step.body}
                    </p>
                    {step.footnote && (
                        <p className="text-slate-500 leading-snug mt-1" style={{ fontSize: 'clamp(0.6rem, 2.6vw, 0.7rem)' }}>
                            {step.footnote}
                        </p>
                    )}
                    <div className="mt-2">
                        {step.advance === 'next' ? (
                            <button
                                onClick={advanceStep}
                                className="w-full min-h-[44px] bg-turf-600 hover:bg-turf-500 active:scale-[0.97] text-white font-black uppercase italic py-2.5 rounded-xl shadow-lg shadow-turf-600/20 transition-all"
                                style={{ fontSize: 'clamp(0.75rem, 3.2vw, 0.9rem)' }}
                            >
                                {step.nextLabel ?? 'İleri'}
                            </button>
                        ) : (
                            <div className="flex items-center justify-center gap-2 py-2">
                                <span className="w-2 h-2 bg-turf-400 rounded-full animate-ping" />
                                <span className="text-turf-400 font-bold uppercase tracking-widest" style={{ fontSize: 'clamp(0.62rem, 2.8vw, 0.72rem)' }}>
                                    Vurgulanan alana dokun
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={sheetRef}
            data-tour-sheet
            className={`fixed left-0 right-0 bg-slate-900/95 backdrop-blur-md shadow-2xl shadow-black/60 ${
                flipToTop
                    ? 'top-0 rounded-b-3xl border-b border-slate-700 animate-fade-in'
                    : 'bottom-0 rounded-t-3xl border-t border-slate-700 animate-slide-up'
            }`}
            style={{
                pointerEvents: 'auto',
                paddingTop: flipToTop ? 'max(12px, env(safe-area-inset-top))' : undefined,
                paddingBottom: flipToTop ? undefined : 'max(16px, env(safe-area-inset-bottom))',
            }}
        >
            {/* Dekor: ince turf gradyan şerit (sheet'in sayfaya bakan kenarında) */}
            <div
                className={`absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-turf-500 to-transparent ${flipToTop ? 'bottom-0' : 'top-0'}`}
            />

            {/* Grab-handle pili — yalnız alt konumda (bottom-sheet dili) */}
            {!flipToTop && (
                <div className="flex justify-center pt-2.5">
                    <div className="w-10 h-1 rounded-full bg-slate-600" />
                </div>
            )}

            <div
                className="max-w-md mx-auto px-5 pt-2 pb-3 overflow-y-auto"
                style={{ maxHeight: '45vh' }}
            >
                {skipConfirmOpen ? (
                    <>
                        <p className="text-white font-bold mb-1" style={{ fontSize: 'clamp(0.9rem, 4vw, 1.05rem)' }}>
                            Turu atlamak istiyor musun?
                        </p>
                        <p className="text-slate-400 mb-3" style={{ fontSize: 'clamp(0.7rem, 3vw, 0.8rem)' }}>
                            Dilediğin zaman Hesap Ayarları → Uygulama Tanıtımı'ndan tekrar izleyebilirsin.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={cancelTourSkipConfirm}
                                className="flex-1 min-h-[44px] bg-turf-600 hover:bg-turf-500 active:scale-[0.97] text-white font-bold py-3 rounded-xl transition-all"
                                style={{ fontSize: 'clamp(0.75rem, 3.2vw, 0.875rem)' }}
                            >
                                Devam Et
                            </button>
                            <button
                                onClick={skipTour}
                                className="flex-1 min-h-[44px] bg-slate-700 hover:bg-slate-600 active:scale-[0.97] text-slate-200 font-bold py-3 rounded-xl transition-all"
                                style={{ fontSize: 'clamp(0.75rem, 3.2vw, 0.875rem)' }}
                            >
                                Atla
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-2 mb-2">
                            {icon && <div className={`p-1.5 rounded-lg shrink-0 ${icon.chip}`}>{icon.node}</div>}
                            <span className="text-[10px] font-black text-turf-400 bg-turf-900/40 border border-turf-500/30 px-2 py-0.5 rounded-full tracking-widest shrink-0">
                                {stepIndex + 1} / {total}
                            </span>
                            <div className="flex-1" />
                            <button
                                onClick={requestTourSkipConfirm}
                                className="text-slate-400 hover:text-white text-xs font-bold px-3 py-2 -mr-2 rounded-lg transition-colors shrink-0"
                            >
                                Atla
                            </button>
                        </div>
                        <h3
                            className="font-sport font-black text-white italic uppercase tracking-wide leading-tight mb-1"
                            style={{ fontSize: 'clamp(1.05rem, 4.5vw, 1.4rem)' }}
                        >
                            {step.title}
                        </h3>
                        <p className="text-slate-300 leading-relaxed" style={{ fontSize: 'clamp(0.8rem, 3.4vw, 0.95rem)' }}>
                            {step.body}
                        </p>
                        {step.footnote && (
                            <p className="text-slate-500 leading-relaxed mt-1.5" style={{ fontSize: 'clamp(0.65rem, 2.8vw, 0.75rem)' }}>
                                {step.footnote}
                            </p>
                        )}
                        <div className="mt-3">
                            {step.advance === 'next' ? (
                                <button
                                    onClick={advanceStep}
                                    className="w-full min-h-[44px] bg-turf-600 hover:bg-turf-500 active:scale-[0.97] text-white font-black uppercase italic py-3 rounded-xl shadow-lg shadow-turf-600/20 transition-all"
                                    style={{ fontSize: 'clamp(0.8rem, 3.4vw, 0.95rem)' }}
                                >
                                    {step.nextLabel ?? 'İleri'}
                                </button>
                            ) : (
                                <div className="flex items-center justify-center gap-2 py-2.5">
                                    <span className="w-2 h-2 bg-turf-400 rounded-full animate-ping" />
                                    <span className="text-turf-400 font-bold uppercase tracking-widest" style={{ fontSize: 'clamp(0.65rem, 2.9vw, 0.75rem)' }}>
                                        Vurgulanan alana dokun
                                    </span>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
