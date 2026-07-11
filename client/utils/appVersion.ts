/**
 * Semver-lite sürüm karşılaştırması — bağımlılıksız.
 *
 * Pazarlama sürümleri ("1.4", "1.10", "2.0.1") segment-bazlı SAYISAL karşılaştırılır:
 * string karşılaştırma "1.10" < "1.4" derdi; burada 10 > 4 doğru sonuç verir.
 * UpdateGate yalnız iOS'ta çifte-kontrol için kullanır (native taraf zaten .numeric
 * karşılaştırıyor; bu katman plugin regresyonuna karşı emniyettir) — herhangi bir
 * belirsizlikte "güncel değil" DEĞİL "güncel" varsayılır (fail-open, brick yok).
 */

/** -1 | 0 | 1 döner; parse edilemeyen segment NaN yayar (çağıran fail-open yapar). */
export function compareVersions(a: string, b: string): number {
    const as = a.split('.').map((s) => parseInt(s, 10));
    const bs = b.split('.').map((s) => parseInt(s, 10));
    const len = Math.max(as.length, bs.length);
    for (let i = 0; i < len; i++) {
        const av = as[i] ?? 0;
        const bv = bs[i] ?? 0;
        if (Number.isNaN(av) || Number.isNaN(bv)) return NaN;
        if (av !== bv) return av > bv ? 1 : -1;
    }
    return 0;
}

/**
 * YALNIZ iki string de temiz parse olur VE available > current ise true.
 * Eksik/bozuk girdi → false (kapı gösterilmez — fail-open).
 */
export function isVersionNewer(
    available: string | undefined,
    current: string | undefined,
): boolean {
    if (!available || !current) return false;
    const cmp = compareVersions(available, current);
    return cmp === 1; // NaN dahil diğer her şey → false
}
