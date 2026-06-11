// Gece slotları (00:00-05:59 arası başlayan saatler) bir önceki günün gece
// devamı kabul edilir: o günün listesinde gösterilir, ama gerçek anı bir
// sonraki takvim gününe denk gelir.
export const NIGHT_HOUR_THRESHOLD = 6;

export const isNightHour = (hour: number): boolean => hour < NIGHT_HOUR_THRESHOLD;

export const toMinutes = (t: string): number => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
};

/** Gece yarısını geçen slotlarda bitiş dakikasını düzelt (+1440) */
export const slotEndMin = (startTime: string, endTime: string): number => {
    const s = toMinutes(startTime);
    let e = toMinutes(endTime);
    if (e === 0) e = 1440;   // "00:00" = günün sonu
    if (e <= s) e += 1440;   // bitiş başlangıçtan önce → ertesi gün
    return e;
};

/** İşletme gece yarısını geçiyor mu? (kapanış < açılış, ya da kapanış tam 00:00) */
export const crossesMidnight = (open: string, close: string): boolean => {
    if (!open || !close) return false;
    const c = toMinutes(close);
    return c === 0 || c < toMinutes(open);
};

/** Gece yarısı geçen işletmelerde erken sabah saatlerini (+1440) ertesi güne taşı */
export const normalizeMin = (t: string, openMin: number, crosses: boolean): number => {
    const m = toMinutes(t);
    if (crosses && m < openMin) return m + 1440;
    return m;
};

export const slotsOverlap = (
    a: { startTime: string; endTime: string },
    b: { startTime: string; endTime: string }
): boolean => {
    const aS = toMinutes(a.startTime);
    const aE = slotEndMin(a.startTime, a.endTime);
    let bS = toMinutes(b.startTime);
    let bE = slotEndMin(b.startTime, b.endTime);
    // A gece sonunda (20+), B sabah erken (0-6) → B ertesi gün bağlamında
    if (aS > 12 * 60 && bS < 6 * 60) { bS += 1440; bE += 1440; }
    return aS < bE && aE > bS;
};

export const isWithinBounds = (
    slot: { startTime: string; endTime: string },
    open: string,
    close: string
): boolean => {
    if (!open || !close) return true;
    const openMin = toMinutes(open);
    const crosses = crossesMidnight(open, close);
    const rawClose = toMinutes(close);
    const closeMin = crosses ? (rawClose === 0 ? 1440 : rawClose + 1440) : rawClose;

    const sS = normalizeMin(slot.startTime, openMin, crosses);
    let sE = normalizeMin(slot.endTime, openMin, crosses);
    if (sE <= sS) sE += 1440; // slot kendi içinde gece yarısını geçiyor

    return sS >= openMin && sE <= closeMin;
};

// 00-05 arası başlayan slotlar "ertesi gün" → diğer slotlardan sonra sıralanır.
const sortMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    const minutes = h * 60 + (m || 0);
    return isNightHour(h) ? minutes + 24 * 60 : minutes;
};

export const sortSlotsByNightRule = <T extends { startTime: string }>(slots: T[]): T[] =>
    [...slots].sort((a, b) => sortMinutes(a.startTime) - sortMinutes(b.startTime));

/** Bir slotun "gerçek" tarih+saatini döner (gece slotları için +1 gün). */
export const getSlotRealDateTime = (dateStr: string, startTime: string): Date => {
    const [h, m] = startTime.split(':').map(Number);
    const d = new Date(dateStr);
    d.setHours(h, m || 0, 0, 0);
    if (isNightHour(h)) d.setDate(d.getDate() + 1);
    return d;
};

export const isPastSlot = (startTime: string, dateStr: string): boolean => {
    return getSlotRealDateTime(dateStr, startTime) < new Date();
};

/**
 * Gece slotu için "asıl oynanacağı" takvim tarihini "12 Haziran" formatında döner.
 * Gündüz slotları için null döner (badge gösterilmeyecek).
 */
export const getNightSlotDateLabel = (startTime: string, dateStr: string): string | null => {
    const [h] = startTime.split(':').map(Number);
    if (!isNightHour(h)) return null;
    const real = getSlotRealDateTime(dateStr, startTime);
    return real.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
};
