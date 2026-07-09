// Saha tipi normalizasyonu — TEK KAYNAK.
// Kanonik değerler 'INDOOR' / 'OUTDOOR'. Ancak kayıt akışı bir dönem Türkçe ETİKETİ
// ('Kapalı Saha' / 'Açık Saha') değer olarak sakladı (canlı DB'de karışık: hem etiket
// hem enum satırları var). Bu helper eski + yeni değerleri tek noktada normalize eder →
// eski hatalı satırlar da doğru gösterilir (DB yazımı gerekmez).

export type PitchType = 'INDOOR' | 'OUTDOOR';

export const normalizePitchType = (raw?: string | null): PitchType => {
    // Locale-INVARIANT lowercase: Türkçe locale 'INDOOR' → 'ındoor' (noktasız ı) yapar ve
    // eşleşmeyi bozar. Karşılaştırma dizeleri standart karakterli olduğundan invariant doğru.
    const v = (raw || '').trim().toLowerCase();
    if (v === 'indoor' || v === 'kapalı saha' || v === 'kapali saha' || v === 'kapalı' || v === 'kapali') {
        return 'INDOOR';
    }
    // 'OUTDOOR', 'Açık Saha', 'Açık', NULL/bilinmeyen → OUTDOOR (mevcut fallback davranışı korunur)
    return 'OUTDOOR';
};

export const isIndoorPitch = (raw?: string | null): boolean => normalizePitchType(raw) === 'INDOOR';

/** Uzun etiket: "Kapalı Saha" / "Açık Saha" */
export const pitchTypeLabel = (raw?: string | null): string =>
    normalizePitchType(raw) === 'INDOOR' ? 'Kapalı Saha' : 'Açık Saha';

/** Kısa etiket: "Kapalı" / "Açık" */
export const pitchTypeShortLabel = (raw?: string | null): string =>
    normalizePitchType(raw) === 'INDOOR' ? 'Kapalı' : 'Açık';
