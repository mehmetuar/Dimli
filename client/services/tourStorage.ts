import { Preferences } from '@capacitor/preferences';
import { TourId } from '../components/Tour/tourTypes';

// ─────────────────────────────────────────────────────────────────────────────
// Tanıtım turu bayrakları (authStorage memCache deseni: Preferences + senkron okuma).
//
// Semantik: bayrak YOKSA tur "görülmüş" sayılır — otomatik tur yalnız kayıt
// akışının açıkça 'pending' yazdığı kullanıcılarda tetiklenir. Böylece
// güncellemeyle gelen MEVCUT kullanıcılar rahatsız edilmez (kullanıcı kararı:
// sadece yeni kayıt otomatik görür; herkes Ayarlar'dan tekrar izleyebilir).
// ─────────────────────────────────────────────────────────────────────────────

const KEYS: Record<TourId, string> = {
    pitches: 'tour_pitches_done_v1',
    jokers: 'tour_jokers_done_v1',
    team: 'tour_team_done_v1',
};

// init öncesi güvenli varsayılan: "görülmüş" — yanlışlıkla erken tur açılmaz
const memCache: Record<TourId, 'done' | 'pending'> = { pitches: 'done', jokers: 'done', team: 'done' };

// Uygulama başlangıcında bir kez çağrılır — memCache'i doldurur
export async function initTourFlags(): Promise<void> {
    const ids = Object.keys(KEYS) as TourId[];
    const values = await Promise.all(ids.map((id) => Preferences.get({ key: KEYS[id] })));
    ids.forEach((id, i) => {
        memCache[id] = values[i].value === 'pending' ? 'pending' : 'done';
    });
}

/** Senkron okuma (initTourFlags() sonrası güvenli) — otomatik tetik bunu kontrol eder. */
export function isTourDone(id: TourId): boolean {
    return memCache[id] !== 'pending';
}

/** Kayıt akışı çağırır: bu tur, sayfaya ilk girişte otomatik başlasın. */
export async function markTourPending(id: TourId): Promise<void> {
    memCache[id] = 'pending';
    await Preferences.set({ key: KEYS[id], value: 'pending' });
}

/** Tur BAŞLARKEN yazılır — yarıda kesilse de tekrar otomatik tetiklenmez. */
export async function markTourDone(id: TourId): Promise<void> {
    memCache[id] = 'done';
    await Preferences.set({ key: KEYS[id], value: 'done' });
}
