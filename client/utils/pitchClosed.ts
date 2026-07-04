// Sahanın verilen tarihte kapalı olup olmadığını belirleyen tek-kaynak yardımcı.
// Sunucudaki server/src/common/turkey-time.util.ts (weekdayNameFromDateStr /
// isPitchClosedOnDate) ile BİREBİR aynı mantık; birinde değişiklik yapılırsa
// diğeri de güncellenmeli — aksi halde client ile sunucu kapalı-gün kontrolünde
// çelişir. Gün hesabı Date.UTC ile zon-nötr yapılır (tarih-sadece string'ler
// cihaz saat dilimine göre kaymasın; new Date(dateStr) yerel yorumla ±1 gün
// kayabilir).

const WEEKDAY_NAMES = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
];

// İngilizce gün adı (Pitch.closedDays konvansiyonu) → Türkçe. Tek kaynak.
export const WEEKDAY_TR: Record<string, string> = {
    Sunday: 'Pazar',
    Monday: 'Pazartesi',
    Tuesday: 'Salı',
    Wednesday: 'Çarşamba',
    Thursday: 'Perşembe',
    Friday: 'Cuma',
    Saturday: 'Cumartesi',
};

/**
 * "YYYY-MM-DD" → haftanın günü ('Sunday'..'Saturday', Pitch.closedDays ile aynı).
 * Date.UTC ile zon-nötr — sunucuyla aynı sonucu üretir.
 */
export function weekdayNameFromDateStr(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    return WEEKDAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

/** "YYYY-MM-DD" → Türkçe gün adı ('Pazar' vb.). */
export function turkishWeekdayFromDateStr(dateStr: string): string {
    return WEEKDAY_TR[weekdayNameFromDateStr(dateStr)];
}

/**
 * Saha verilen tarihte kapalı mı? Genel pasiflik (isActive === false) veya o güne
 * denk gelen sürekli kapatma (closedDays) durumunda true. isActive opsiyonel
 * olduğundan `=== false` kullanılır (undefined = açık).
 */
export function isPitchClosedOnDate(
    pitch: { isActive?: boolean; closedDays?: string[] | null },
    dateStr: string,
): boolean {
    if (pitch.isActive === false) return true;
    if (!pitch.closedDays?.length) return false;
    return pitch.closedDays.includes(weekdayNameFromDateStr(dateStr));
}

/**
 * Kapalıysa kullanıcıya gösterilecek gün-adlı Türkçe mesaj, açıksa null.
 *  - isActive === false → geçici hizmet dışı
 *  - closedDays eşleşmesi → "Bu saha Pazar günleri kapalı." (gün değişir)
 */
export function closedDayMessage(
    pitch: { isActive?: boolean; closedDays?: string[] | null },
    dateStr: string,
): string | null {
    if (!isPitchClosedOnDate(pitch, dateStr)) return null;
    if (pitch.isActive === false) return 'Bu saha geçici olarak hizmet dışı.';
    return `Bu saha ${turkishWeekdayFromDateStr(dateStr)} günleri kapalı.`;
}
