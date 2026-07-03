// Kullanıcı adı kuralları — Instagram-stili: yalnız a-z, 0-9, nokta, alt çizgi.
// İstemcideki client/utils/username.ts ile birebir aynı mantık; birinde değişiklik
// yapılırsa diğeri de güncellenmeli.
export const USERNAME_REGEX = /^[a-z0-9._]{3,30}$/;
export const USERNAME_INVALID_MESSAGE =
  'Kullanıcı adı 3-30 karakter olmalı ve yalnızca küçük harf (a-z), rakam, nokta (.) ve alt çizgi (_) içerebilir.';

const TR_MAP: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
};

// Türkçe-farkındalıklı küçültme + transliterasyon: 'IŞIK' → 'ışık' → 'isik'.
// â/î/û gibi şapkalı harfler bilinçli olarak haritada YOK — regex reddeder.
export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, (ch) => TR_MAP[ch]);
}
