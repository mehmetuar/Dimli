// "23:00" → "00:00" — maç süresi uygulama genelinde 1 saat (chatUtils matchEndTime ile tutarlı).
// Geçerli HH:MM parse edilemezse null döner (çağıran tek değere düşer).
export const addOneHour = (time?: string): string | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(time || '');
    if (!m) return null;
    const h = Number(m[1]);
    if (h > 23 || Number(m[2]) > 59) return null;
    return `${String((h + 1) % 24).padStart(2, '0')}:${m[2]}`;
};

// ISO timestamp → "şimdi / X dk önce / X sa önce / X gün önce" (kısa, kart içi).
// Parse edilemeyen değerde null döner (çağıran hiç göstermez).
export const timeAgo = (iso?: string): string | null => {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return null;
    const diffMin = Math.floor((Date.now() - t) / 60000);
    if (diffMin < 1) return 'şimdi';
    if (diffMin < 60) return `${diffMin} dk önce`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} sa önce`;
    return `${Math.floor(diffH / 24)} gün önce`;
};
