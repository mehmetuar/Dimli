// Türkiye cep telefonu numaraları: 05XXXXXXXXX (11 hane) veya 5XXXXXXXXX (10 hane)
const TR_MOBILE_REGEX = /^0?5\d{9}$/;

export const PHONE_INVALID_MESSAGE = 'Lütfen geçerli bir telefon numarası giriniz. (Örn: 0555 555 55 55)';

// Telefon alanına yazılan değeri rakam dışı karakterlerden ayıklar (harf girişine izin vermez)
export const sanitizePhoneInput = (value: string): string => {
    return value.replace(/\D/g, '').slice(0, 11);
};

export const isValidTurkishPhone = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '');
    return TR_MOBILE_REGEX.test(digits);
};

// Hızlı arama için tel: linki — '90XXXXXXXXXX' formatına '+' öneki eklenir,
// diğer formatlar (0XXX..., +90...) olduğu gibi çeviriciye bırakılır.
export const telHref = (phone: string): string => {
    const p = phone.replace(/[^\d+]/g, '');
    if (p.startsWith('+')) return `tel:${p}`;
    if (p.startsWith('90') && p.length === 12) return `tel:+${p}`;
    return `tel:${p}`;
};

// Profesyonel görüntü formatı: "0 (531) 601 90 60".
// 11 haneli (05XXXXXXXXX) veya 10 haneli (5XXXXXXXXX) girişi biçimler; geçersizse ham döndürür.
export const formatTurkishPhoneDisplay = (raw?: string | null): string => {
    const digits = (raw || '').replace(/\D/g, '');
    const ten =
        digits.length === 11 && digits.startsWith('0') ? digits.slice(1) :
        digits.length === 10 ? digits :
        null;
    if (!ten || ten[0] !== '5') return raw || '';
    return `0 (${ten.slice(0, 3)}) ${ten.slice(3, 6)} ${ten.slice(6, 8)} ${ten.slice(8, 10)}`;
};
