// Takım rengi yardımcıları — tek kaynak (TeamHeaderCard'dan çıkarıldı).
// Hem hex değerleri (#3b82f6) hem legacy Tailwind sınıf string'lerini (bg-blue-500) destekler.
export const LEGACY_COLOR_HEX: Record<string, string> = {
    'bg-blue-500': '#3b82f6', 'bg-green-500': '#22c55e', 'bg-red-500': '#ef4444',
    'bg-yellow-500': '#eab308', 'bg-purple-500': '#a855f7', 'bg-orange-500': '#f97316',
    'bg-pink-500': '#ec4899', 'bg-cyan-500': '#06b6d4', 'bg-white': '#ffffff',
};

export const toHex = (val?: string): string => {
    if (!val) return '#3b82f6';
    if (val.startsWith('#')) return val;
    return LEGACY_COLOR_HEX[val] ?? '#3b82f6';
};

// Takım logosu fallback'i — logo yoksa/bozuksa baş-harflerden ui-avatars görseli türetir.
// CreateTeamModal'ın takım kurarken yazdığı biçimle birebir aynı → NULL-logo takım,
// uygulamadan kurulmuş gibi görünür. ⚠️ Takım logosu render ederken HER ZAMAN bunu kullan;
// ham `team.logoUrl || '/default-team-logo.png'` deseni YASAK (o dosya projede yok).
export const teamInitialsAvatar = (name?: string): string =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Takım')}&background=random&color=fff&size=200`;

export const teamLogoSrc = (team?: { logoUrl?: string | null; name?: string } | null): string =>
    team?.logoUrl || teamInitialsAvatar(team?.name);
