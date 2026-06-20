export function hexToHsl(hex: string): { h: number; s: number; l: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h: number, s: number, l: number): string {
    const sl = s / 100;
    const ll = l / 100;
    const a = sl * Math.min(ll, 1 - ll);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

export function isValidHex(hex: string) {
    return /^#[0-9a-fA-F]{6}$/.test(hex);
}

// Kullanıcının kendi mesajları için rezerve renk — tailwind.config.js'deki turf-600
// ile birebir. Takım renkleri bu rengi asla kullanamaz (bkz. resolveTeamChatColors).
export const OWN_MESSAGE_COLOR = '#16a34a';

const HOME_FALLBACK_COLOR = '#3b82f6';
const AWAY_FALLBACK_COLOR = '#ef4444';

function hueDistance(h1: number, h2: number): number {
    const diff = Math.abs(h1 - h2);
    return Math.min(diff, 360 - diff);
}

function isTooClose(a: string, b: string): boolean {
    const ha = hexToHsl(a);
    const hb = hexToHsl(b);
    return hueDistance(ha.h, hb.h) < 30 && Math.abs(ha.l - hb.l) < 25;
}

// Takım id'sinden deterministik (sabit, hash tabanlı) bir hue ofseti üretir —
// böylece aynı takım her zaman aynı kaydırılmış rengi alır, oturumlar arası tutarlı kalır.
function deterministicHueOffset(seed: string, base: number): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) % 360;
    }
    return base + (hash % 30);
}

function nudgeAwayFrom(hex: string, awayFromHex: string, teamId: string): string {
    const hsl = hexToHsl(hex);
    const offset = deterministicHueOffset(teamId, 45);
    const nudged = { ...hsl, h: (hsl.h + offset) % 360 };
    let result = hslToHex(nudged.h, nudged.s, nudged.l);
    // Kaydırma sonrası hâlâ çakışıyorsa (nadir), bir kez daha kaydır.
    if (isTooClose(result, awayFromHex)) {
        const secondOffset = (offset + 90) % 360;
        result = hslToHex((hsl.h + secondOffset) % 360, hsl.s, hsl.l);
    }
    return result;
}

export interface TeamChatColors {
    home: string;
    away: string;
}

// Rakipli maç chatlerinde ev/misafir takım renklerini, kendi mesaj rengiyle (OWN_MESSAGE_COLOR)
// ve birbirleriyle çakışmayacak şekilde deterministik olarak çözer. Team.primaryColor/secondaryColor
// asla değiştirilmez — bu sadece render anında hesaplanan görsel bir düzeltmedir.
export function resolveTeamChatColors(
    homeHex: string | null | undefined,
    awayHex: string | null | undefined,
    homeTeamId: string,
    awayTeamId: string,
): TeamChatColors {
    let home = homeHex && isValidHex(homeHex) ? homeHex : HOME_FALLBACK_COLOR;
    let away = awayHex && isValidHex(awayHex) ? awayHex : AWAY_FALLBACK_COLOR;

    if (isTooClose(home, OWN_MESSAGE_COLOR)) {
        home = nudgeAwayFrom(home, OWN_MESSAGE_COLOR, homeTeamId);
    }
    if (isTooClose(away, OWN_MESSAGE_COLOR)) {
        away = nudgeAwayFrom(away, OWN_MESSAGE_COLOR, awayTeamId);
    }
    if (isTooClose(home, away)) {
        away = nudgeAwayFrom(away, home, awayTeamId);
        // Yeniden kaydırma own-message rengiyle çakışma yarattıysa son bir düzeltme yap.
        if (isTooClose(away, OWN_MESSAGE_COLOR)) {
            away = nudgeAwayFrom(away, OWN_MESSAGE_COLOR, awayTeamId + '-2');
        }
    }

    return { home, away };
}
