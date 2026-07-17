import api from './api';
import { getToken, decodeTokenPayload } from './authStorage';

// ─────────────────────────────────────────────────────────────────────────────
// Ortak currentUser store'u (modül-seviyesi, authStorage memCache deseni).
// Amaç: sayfa hook'larının ayrı ayrı GET /users/me atmasını tek kaynağa indirmek
// ve LocationContext'in PATCH /users/me yanıtıyla (GET ile birebir aynı şekil)
// profili SIFIR ek istekle beslemek. React context DEĞİL — provider sırası
// değişmez, bileşen dışı kod da (ör. LocationContext) seed edebilir.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_KEY = 'cached_current_user_v1';
const STALE_MS = 30_000;

let user: any | null = null;
let hydrated = false;                       // localStorage'dan tembel okuma yapıldı mı
let settled = false;                        // en az bir fetch sonuçlandı (ilk-yükleme spinner'ı için)
let inFlight: Promise<any | null> | null = null;
let lastFetchedAt = 0;
const listeners = new Set<() => void>();

const currentUserId = (): string | null => {
    const token = getToken();
    return token ? (decodeTokenPayload(token)?.sub ?? null) : null;
};

// Modül init'te DEĞİL, ilk kullanımda oku: token initAuth() öncesi null olur;
// sayfalar App.tsx isReady kapısından sonra mount olduğundan tembel okuma güvenli.
function hydrateFromStorage(): void {
    hydrated = true;
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return;
        const { userId, user: cached } = JSON.parse(raw);
        // Hesap değişiminde önceki kullanıcının verisi asla sızmasın
        if (userId && cached && userId === currentUserId()) user = cached;
    } catch { /* bozuk cache → boş başla */ }
}

function notify(): void {
    listeners.forEach((l) => l());
}

/** useSyncExternalStore snapshot'ı — referans-stabil (asla klon döndürme). */
export function getCurrentUserSnapshot(): any | null {
    if (!hydrated) hydrateFromStorage();
    return user;
}

/** İlk fetch sonuçlandı mı — cold-cache'te "gerçek ilk yükleme" spinner'ı bunu okur. */
export function hasSettledCurrentUser(): boolean {
    return settled;
}

export function subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

/**
 * Taze kullanıcı verisini store'a işle (GET veya PATCH /users/me yanıtı).
 * Shallow-merge: sunucu ileride daha ince bir PATCH yanıtı dönerse eski alanlar
 * (ör. team) korunur. Farklı kullanıcı id'si gelirse merge değil replace.
 */
export function seedCurrentUser(next: any): void {
    if (!next || !getToken()) return; // logout sonrası geç gelen yanıt store'u kirletmesin
    if (!hydrated) hydrateFromStorage();
    user = user && user.id && next.id && user.id !== next.id
        ? next
        : { ...(user ?? {}), ...next };
    lastFetchedAt = Date.now();
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ userId: currentUserId(), user }));
    } catch { /* ignore */ }
    notify();
}

/**
 * Kullanıcıyı getir — in-flight dedupe + TTL: STALE_MS içinde taze veri varsa
 * (force değilse) ağa çıkmadan bellekten döner. Hata durumunda eldeki (varsa
 * bayat) değer korunur; bir sonraki çağrı tekrar dener.
 */
export function fetchCurrentUser(opts: { force?: boolean } = {}): Promise<any | null> {
    if (!getToken()) {
        if (!settled) { settled = true; notify(); }
        return Promise.resolve(null);
    }
    if (!hydrated) hydrateFromStorage();
    if (inFlight) {
        // force isteği in-flight (muhtemelen mutasyon-ÖNCESİ) fetch'e yutulmasın:
        // mevcut istek bitince zorla bir tur daha atılır (takım-olayı senkronu
        // bunun tazeliğine güvenir; yutulursa bayat veri 30sn "taze" sayılırdı).
        return opts.force
            ? inFlight.then(() => fetchCurrentUser({ force: true }))
            : inFlight;
    }
    if (!opts.force && user && Date.now() - lastFetchedAt < STALE_MS) {
        return Promise.resolve(user);
    }
    inFlight = api.get('/users/me')
        .then((res) => { seedCurrentUser(res.data); return user; })
        .catch(() => user)
        .finally(() => {
            inFlight = null;
            settled = true;
            notify();
        });
    return inFlight;
}

/** Çıkış / oturum düşmesi: bellek + localStorage temizliği (AuthContext çağırır). */
export function clearCurrentUserCache(): void {
    user = null;
    settled = false;
    lastFetchedAt = 0;
    hydrated = true; // storage az önce silindi — yeniden okumaya çalışma
    try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
    notify();
}
