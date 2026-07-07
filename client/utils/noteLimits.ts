// Not karakter sınırları (boşluk dahil her karakter 1 sayılır) — TEK KAYNAK.
// Sunucu ikizi: server/src/common/text-limit.util.ts çağrılarındaki sabitler.
export const NOTE_CHAR_LIMITS = {
    match: 50,     // maç notları: ilan/meydan okuma/teklif
    business: 100, // işletme → takımlara not
} as const;
