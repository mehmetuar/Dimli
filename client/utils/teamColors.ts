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
