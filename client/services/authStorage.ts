import { Preferences } from '@capacitor/preferences';

const KEY_TOKEN = 'auth_token';
const KEY_OWNER_ID = 'auth_owner_id';
const KEY_ROLE = 'auth_role';

// localStorage'daki eski key adları (migration için)
const LS_TOKEN = 'token';
const LS_OWNER_ID = 'ownerId';
const LS_ROLE = 'role';

export interface AuthSession {
    token: string | null;
    ownerId: string | null;
    role: 'business_owner' | 'user' | null;
}

// Senkron erişim için bellek önbelleği — initAuth() sonrası güvenlidir
const memCache: AuthSession = { token: null, ownerId: null, role: null };

export function decodeTokenPayload(token: string): { exp: number; role?: string; sub: string } | null {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch {
        return null;
    }
}

export function isTokenExpired(token: string): boolean {
    const payload = decodeTokenPayload(token);
    if (!payload) return true;
    return Date.now() >= payload.exp * 1000;
}

// Token payload'ından rolü çıkarır
function extractRole(token: string): 'business_owner' | 'user' {
    const payload = decodeTokenPayload(token);
    return payload?.role === 'business_owner' ? 'business_owner' : 'user';
}

// Mevcut localStorage verilerini Capacitor Preferences'a tek seferlik taşır
async function migrateFromLocalStorage(): Promise<void> {
    const lsToken = localStorage.getItem(LS_TOKEN);
    if (!lsToken) return;

    const lsOwnerId = localStorage.getItem(LS_OWNER_ID);
    const lsRole = localStorage.getItem(LS_ROLE);

    await Preferences.set({ key: KEY_TOKEN, value: lsToken });
    if (lsOwnerId) await Preferences.set({ key: KEY_OWNER_ID, value: lsOwnerId });
    if (lsRole) await Preferences.set({ key: KEY_ROLE, value: lsRole });

    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_OWNER_ID);
    localStorage.removeItem(LS_ROLE);
}

// Uygulama başlangıcında bir kez çağrılır — memCache'i doldurur
export async function initAuth(): Promise<AuthSession> {
    await migrateFromLocalStorage();

    const [{ value: token }, { value: ownerId }] = await Promise.all([
        Preferences.get({ key: KEY_TOKEN }),
        Preferences.get({ key: KEY_OWNER_ID }),
    ]);

    if (!token || isTokenExpired(token)) {
        await clearAuthSession();
        return memCache;
    }

    memCache.token = token;
    memCache.ownerId = ownerId ?? null;
    memCache.role = extractRole(token);

    return { ...memCache };
}

// --- Senkron okumalar (initAuth() sonrası güvenli) ---
export function getToken(): string | null { return memCache.token; }
export function getOwnerId(): string | null { return memCache.ownerId; }
export function getRole(): 'business_owner' | 'user' | null { return memCache.role; }

// --- Yazma işlemleri ---
export async function saveCustomerSession(token: string): Promise<void> {
    await Preferences.set({ key: KEY_TOKEN, value: token });
    await Preferences.remove({ key: KEY_OWNER_ID });

    memCache.token = token;
    memCache.ownerId = null;
    memCache.role = 'user';
}

export async function saveBusinessSession(token: string, ownerId: string): Promise<void> {
    await Promise.all([
        Preferences.set({ key: KEY_TOKEN, value: token }),
        Preferences.set({ key: KEY_OWNER_ID, value: ownerId }),
    ]);

    memCache.token = token;
    memCache.ownerId = ownerId;
    memCache.role = 'business_owner';
}

// Tüm auth verilerini tek seferde temizler — tüm logout noktaları buraya gelir
export async function clearAuthSession(): Promise<void> {
    await Promise.all([
        Preferences.remove({ key: KEY_TOKEN }),
        Preferences.remove({ key: KEY_OWNER_ID }),
        Preferences.remove({ key: KEY_ROLE }),
    ]);

    // Eski localStorage key'lerini de temizle (güvenlik için)
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_OWNER_ID);
    localStorage.removeItem(LS_ROLE);

    memCache.token = null;
    memCache.ownerId = null;
    memCache.role = null;
}
