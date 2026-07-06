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
// Çevrimdışı deneyim genişletmesi: Chat kanal listesi (ilk 30), Takımım özeti,
// işletme Dashboard bugün-özeti. İşletme token'ında sub = owner.id olduğundan
// aynı userId zarfı işletme tarafında da doğru çalışır.
export const CHANNELS_CACHE_KEY = 'cached_channels_v1';
export const TEAM_CACHE_KEY = 'cached_my_team_v1';
export const BIZ_DASHBOARD_CACHE_KEY = 'cached_biz_dashboard_v1';
// v2: PitchBooking'in eski çıplak 'cached_businesses' anahtarı kullanıcı-kapsamlı
// zarfa taşındı (versiyonlu anahtar eski kaydı kendiliğinden öldürür).
export const BUSINESSES_CACHE_KEY = 'cached_businesses_v2';

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

// Nesne varyantı — dizi olmayan sayfa özetleri (Takımım, işletme Dashboard) için.
// Aynı {userId, ...} zarfı ve sub doğrulaması; {items:[obj]} sarmalaması yerine
// ayrı fonksiyon (okuyan tarafta [0] indeksleme kirliliği olmasın).
export function readObjectCache<T = any>(key: string): T | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const { userId, value } = JSON.parse(raw);
        if (!userId || userId !== currentUserId() || value == null) return null;
        return value as T;
    } catch {
        return null;
    }
}

export function writeObjectCache(key: string, value: unknown): void {
    const userId = currentUserId();
    if (!userId) return;
    try {
        localStorage.setItem(key, JSON.stringify({ userId, value }));
    } catch { /* ignore — dolu storage sayfayı engellemesin */ }
}
