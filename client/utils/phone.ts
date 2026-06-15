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
