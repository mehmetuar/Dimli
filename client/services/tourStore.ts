import { useSyncExternalStore } from 'react';
import { TourId, TourStep } from '../components/Tour/tourTypes';
import { TOUR_SCRIPTS } from '../components/Tour/tourScripts';
import { markTourDone } from './tourStorage';

// ─────────────────────────────────────────────────────────────────────────────
// Tanıtım turu store'u (modül-seviyesi, currentUserStore/bootSplashStore deseni).
// React context DEĞİL: Register (navigasyon öncesi) ve App geri-tuşu listener'ı
// gibi bileşen-dışı noktalar da okuyup yazabilir; rota değişiminden etkilenmez.
// ─────────────────────────────────────────────────────────────────────────────

export interface TourState {
    activeTour: TourId | null;
    stepIndex: number;
    /** 'demoChat': sahte maç sohbeti ekranı açık (Sahalar turu 7-8. adımlar) */
    demoPhase: 'idle' | 'demoChat';
    /** Atla onayı kartı açık (Atla butonu veya Android geri tuşu tetikler) */
    skipConfirmOpen: boolean;
}

let state: TourState = { activeTour: null, stepIndex: 0, demoPhase: 'idle', skipConfirmOpen: false };
const listeners = new Set<() => void>();
// Tur biterken çalışacak temizlikler (modal kapat, akordeonu kapa...) — sayfalar kaydeder
const cleanups = new Set<() => void>();

function set(partial: Partial<TourState>): void {
    state = { ...state, ...partial };
    listeners.forEach((l) => l());
}

function runCleanups(): void {
    const fns = [...cleanups];
    cleanups.clear();
    fns.forEach((fn) => { try { fn(); } catch { /* temizlik hatası turu kilitlemesin */ } });
}

export function getTourSnapshot(): TourState { return state; }
export function isTourActive(): boolean { return state.activeTour !== null; }

export function getCurrentStep(): TourStep | null {
    if (!state.activeTour) return null;
    return TOUR_SCRIPTS[state.activeTour][state.stepIndex] ?? null;
}

/** Turu başlat — bayrak BAŞTA yazılır (yarıda kesilse de tekrar otomatik açılmaz). */
export function startTour(id: TourId): void {
    runCleanups();
    void markTourDone(id);
    state = { activeTour: id, stepIndex: 0, demoPhase: 'idle', skipConfirmOpen: false };
    listeners.forEach((l) => l());
}

export function advanceStep(): void {
    if (!state.activeTour) return;
    const steps = TOUR_SCRIPTS[state.activeTour];
    if (state.stepIndex + 1 >= steps.length) {
        // Zincirleme: son adım chainTo tanımlıyorsa bir sonraki tur kesintisiz başlar
        // (Sahalar turu → TAKIM sekmesi dokunuşu → Takım turu, oyun tarzı akış).
        const chainTo = steps[state.stepIndex]?.chainTo;
        if (chainTo) startTour(chainTo);
        else endTour();
    } else {
        set({ stepIndex: state.stepIndex + 1, skipConfirmOpen: false });
    }
}

export function endTour(): void {
    if (!state.activeTour) return;
    runCleanups();
    set({ activeTour: null, stepIndex: 0, demoPhase: 'idle', skipConfirmOpen: false });
}

export const skipTour = endTour;

/** Async uygulama state'ine bağlı geçişler — entegrasyon noktaları çağırır. */
export function emitTourEvent(eventId: string): void {
    const step = getCurrentStep();
    if (step?.advance === 'event' && step.eventId === eventId) advanceStep();
}

export function setDemoPhase(phase: TourState['demoPhase']): void {
    if (state.activeTour) set({ demoPhase: phase });
}

/** Atla onayını aç (Atla butonu + Android geri tuşu buraya gelir). */
export function requestTourSkipConfirm(): void {
    if (state.activeTour) set({ skipConfirmOpen: true });
}

export function cancelTourSkipConfirm(): void {
    if (state.activeTour) set({ skipConfirmOpen: false });
}

/** Tur biterken/atlanırken çalışacak temizlik kaydet; unregister döner. */
export function registerTourCleanup(fn: () => void): () => void {
    cleanups.add(fn);
    return () => { cleanups.delete(fn); };
}

function subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
}

export function useTour(): TourState {
    return useSyncExternalStore(subscribe, getTourSnapshot);
}

export function useTourActive(id: TourId): boolean {
    return useSyncExternalStore(subscribe, () => state.activeTour === id);
}

export function useAnyTourActive(): boolean {
    return useSyncExternalStore(subscribe, () => state.activeTour !== null);
}
