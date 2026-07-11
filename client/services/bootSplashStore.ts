import { useSyncExternalStore } from 'react';

/**
 * Boot splash durumu — modül-scope store (currentUserStore deseni).
 *
 * Amaç: oturumsuz soğuk açılışta Login sayfası giriş koreografisini (saha çizgileri +
 * enter-up) splash perdesi SOLMAYA BAŞLAYANA kadar bekletmek. AnimatedSplash reveal-start
 * anında markBootSplashDone() çağırır; Login useBootSplashDone() ile içerik mount'unu bekletir.
 * JS oturumu boyunca true kalır → oturum-içi gezinmelerde (ör. business→customer flip)
 * hiçbir bekletme olmaz.
 */

let done = false;
const listeners = new Set<() => void>();

export function markBootSplashDone(): void {
    if (done) return; // idempotent — StrictMode/çift zamanlayıcı güvenli
    done = true;
    listeners.forEach((l) => l());
}

export function isBootSplashDone(): boolean {
    return done;
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export function useBootSplashDone(): boolean {
    return useSyncExternalStore(subscribe, isBootSplashDone);
}
