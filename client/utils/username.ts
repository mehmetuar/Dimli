// Kullanıcı adı kuralları — Instagram-stili: yalnız a-z, 0-9, nokta, alt çizgi.
// Sunucudaki server/src/users/username.util.ts ile birebir aynı mantık; birinde
// değişiklik yapılırsa diğeri de güncellenmeli.
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_REGEX = /^[a-z0-9._]{3,30}$/;
export const USERNAME_INVALID_MESSAGE =
    'Kullanıcı adı 3-30 karakter olmalı ve yalnızca küçük harf (a-z), rakam, nokta (.) ve alt çizgi (_) içerebilir.';

const TR_MAP: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };

// Tam normalizasyon — API'ye göndermeden önce ('IŞIK' → 'ışık' → 'isik').
// â/î/û gibi şapkalı harfler bilinçli olarak haritada YOK — regex reddeder.
export const normalizeUsername = (raw: string): string =>
    raw.trim().toLocaleLowerCase('tr-TR').replace(/[çğıöşü]/g, (ch) => TR_MAP[ch]);

// Canlı input temizleyici — yazarken: küçült + translitere et + izinsiz karakterleri at + 30'a kes
export const sanitizeUsernameInput = (value: string): string =>
    value
        .toLocaleLowerCase('tr-TR')
        .replace(/[çğıöşü]/g, (ch) => TR_MAP[ch])
        .replace(/[^a-z0-9._]/g, '')
        .slice(0, USERNAME_MAX_LENGTH);

export const isValidUsername = (value: string): boolean => USERNAME_REGEX.test(value);
