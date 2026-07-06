import { getToken, decodeTokenPayload } from '../services/authStorage';

// ─────────────────────────────────────────────────────────────────────────────
// Liste önbelleği (stale-while-revalidate) — Sahalar'daki `cached_businesses`
// deseninin kullanıcı-kapsamlı ortak hali. Sayfa-0 listeleri `{userId, items}`
// zarfıyla saklanır; okurken token'daki sub ile doğrulanır — hesap değişiminde
// önceki kullanıcının listesi asla flash etmez. Anahtar adları versiyonlu:
// şema değişirse anahtarı v2 yap, eski kayıt kendiliğinden ölür.
// ─────────────────────────────────────────────────────────────────────────────

export const JOKERS_CACHE_KEY = 'cached_jokers_v1';
// v2: öğeler artık sunucudan gömülü pitchSummary ile geliyor (ayrı işletme
// listesi önbelleği kaldırıldı — eski cached_mkt_businesses_v1 anahtarı öldü).
export const MATCHES_CACHE_KEY = 'cached_matches_v2';
// Bildirimler sayfa-0 (20 kayıt) — soğuk açılışta spinner yerine anında liste.
export const NOTIFICATIONS_CACHE_KEY = 'cached_notifications_v1';

const currentUserId = (): string | null => {
    const token = getToken();
    return token ? (decodeTokenPayload(token)?.sub ?? null) : null;
};

export function readListCache<T = any>(key: string): T[] {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const { userId, items } = JSON.parse(raw);
        if (!userId || userId !== currentUserId() || !Array.isArray(items)) return [];
        return items;
    } catch {
        return [];
    }
}

export function writeListCache(key: string, items: any[]): void {
    const userId = currentUserId();
    if (!userId) return;
    try {
        localStorage.setItem(key, JSON.stringify({ userId, items }));
    } catch { /* ignore — dolu storage listeyi engellemesin */ }
}
