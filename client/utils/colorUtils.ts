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

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
    return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16),
    };
}

// WCAG 2.1 göreli parlaklık (sRGB doğrusallaştırma)
export function relativeLuminance(hex: string): number {
    const { r, g, b } = hexToRgb(hex);
    const lin = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: string, b: string): number {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Takım renginin üzerine bindiği en açık chat yüzeyi (slate-800 / pitch-surface).
// Burada 4.5:1'i geçen renk, daha koyu #0f172a liste zemininde otomatik daha yüksek kontrast verir.
export const CHAT_BUBBLE_SURFACE = '#1e293b';
// 11px semibold gönderen adı = küçük metin → WCAG AA hedefi 4.5:1
const READABLE_TARGET = 4.5;
// Çamur griler (ör. #475569) parlaklık kaldırılınca kirli beyaza dönmesin — ton ailesi korunur
const SATURATION_FLOOR = 40;
// ColorPickerModal parlaklık slider'ının üst sınırıyla aynı
const LIGHTNESS_CAP = 85;

// Koyu zeminde okunmayan rengi, ton kimliğini koruyarak deterministik olarak
// okunur parlaklığa kaldırır. Zaten okunur renklere dokunmaz (minimal müdahale).
export function ensureReadableOnDark(hex: string): string {
    if (contrastRatio(hex, CHAT_BUBBLE_SURFACE) >= READABLE_TARGET) return hex;
    const { h, s, l } = hexToHsl(hex);
    const s2 = Math.max(s, SATURATION_FLOOR);
    for (let li = Math.max(l, 30); li <= LIGHTNESS_CAP; li++) {
        const candidate = hslToHex(h, s2, li);
        if (contrastRatio(candidate, CHAT_BUBBLE_SURFACE) >= READABLE_TARGET) return candidate;
    }
    return hslToHex(h, s2, LIGHTNESS_CAP);
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

// Okunurluk kaldırması sonrası tüm renkler dar bir L bandında (≈55-85) yaşar;
// ayırt edicilik büyük ölçüde hue'ya kalır → hue eşiği eski 30'dan 40'a çıkarıldı.
const HUE_CLOSE = 40;
const LIGHT_CLOSE = 20;

function isTooClose(a: string, b: string): boolean {
    const ha = hexToHsl(a);
    const hb = hexToHsl(b);
    // İki düşük doygunluklu (gri) renkte hue anlamsızdır — sadece parlaklık farkına bak
    if (ha.s < 25 && hb.s < 25) return Math.abs(ha.l - hb.l) < LIGHT_CLOSE;
    return hueDistance(ha.h, hb.h) < HUE_CLOSE && Math.abs(ha.l - hb.l) < LIGHT_CLOSE;
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

// Bir takımın chat'teki tüm render noktalarının tükettiği türetilmiş renk paleti.
// Takım kimliği "takım çizgisi" tasarımıyla verilir: balon dış çizgisi + gönderen
// adı + avatar halkası/zemin + lejant noktaları hep `base`'i kullanır (dolgu
// degradesi kaldırıldı — soft/secondarySoft/border/glow alanları öldü ve silindi).
export interface TeamAccent {
    base: string;          // okunur hex — balon çizgisi, gönderen adı, avatar halkası, çip noktası
    secondaryBase: string; // okunur hex — ikincil renk tam opak (çip noktası deseni; yoksa base)
}

export interface TeamChatAccents {
    home: TeamAccent;
    away: TeamAccent;
}

// baseHex'in zaten okunur (ensureReadableOnDark'tan geçmiş) olması beklenir.
// ColorPickerModal'daki chat önizlemesi de aynı paleti buradan üretir.
export function buildTeamAccent(baseHex: string, secondaryHex: string | null | undefined): TeamAccent {
    const secondary = secondaryHex && isValidHex(secondaryHex)
        ? ensureReadableOnDark(secondaryHex)
        : baseHex;
    return {
        base: baseHex,
        secondaryBase: secondary,
    };
}

// Rakipli maç chatlerinde ev/misafir takım renklerini deterministik olarak çözer:
// önce koyu zeminde okunur parlaklığa kaldırır, sonra kendi mesaj rengiyle
// (OWN_MESSAGE_COLOR) ve birbirleriyle çakışmayı giderir. Sıralama kritik: hue
// kaydırma parlaklığı değiştirebilir ama parlaklık kaldırma hue'yu değiştirmez —
// bu yüzden her nudge sonucu yeniden ensureReadableOnDark'tan geçirilir.
// Team.primaryColor/secondaryColor asla değiştirilmez — bu sadece render anında
// hesaplanan görsel bir düzeltmedir.
export function resolveTeamChatColors(
    homeHex: string | null | undefined,
    awayHex: string | null | undefined,
    homeSecondaryHex: string | null | undefined,
    awaySecondaryHex: string | null | undefined,
    homeTeamId: string,
    awayTeamId: string,
): TeamChatAccents {
    let home = homeHex && isValidHex(homeHex) ? homeHex : HOME_FALLBACK_COLOR;
    let away = awayHex && isValidHex(awayHex) ? awayHex : AWAY_FALLBACK_COLOR;

    home = ensureReadableOnDark(home);
    away = ensureReadableOnDark(away);

    if (isTooClose(home, OWN_MESSAGE_COLOR)) {
        home = ensureReadableOnDark(nudgeAwayFrom(home, OWN_MESSAGE_COLOR, homeTeamId));
    }
    if (isTooClose(away, OWN_MESSAGE_COLOR)) {
        away = ensureReadableOnDark(nudgeAwayFrom(away, OWN_MESSAGE_COLOR, awayTeamId));
    }
    if (isTooClose(home, away)) {
        away = ensureReadableOnDark(nudgeAwayFrom(away, home, awayTeamId));
        // Yeniden kaydırma own-message rengiyle çakışma yarattıysa son bir düzeltme yap.
        if (isTooClose(away, OWN_MESSAGE_COLOR)) {
            away = ensureReadableOnDark(nudgeAwayFrom(away, OWN_MESSAGE_COLOR, awayTeamId + '-2'));
        }
    }

    return {
        home: buildTeamAccent(home, homeSecondaryHex),
        away: buildTeamAccent(away, awaySecondaryHex),
    };
}
