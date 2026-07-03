// "23:00" → "00:00" — maç süresi uygulama genelinde 1 saat (chatUtils matchEndTime ile tutarlı).
// Geçerli HH:MM parse edilemezse null döner (çağıran tek değere düşer).
export const addOneHour = (time?: string): string | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(time || '');
    if (!m) return null;
    const h = Number(m[1]);
    if (h > 23 || Number(m[2]) > 59) return null;
    return `${String((h + 1) % 24).padStart(2, '0')}:${m[2]}`;
};
