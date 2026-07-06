// Backend'den İngilizce/teknik bir mesaj gelirse kullanıcıya gösterilmeden Türkçe genel mesaja düşer
const GENERIC_BACKEND_MESSAGES = ['internal server error', 'bad request', 'not found', 'unauthorized'];

export const getErrorMessage = (err: any, fallback: string): string => {
    const message = err?.response?.data?.message || err?.message;
    if (!message || typeof message !== 'string') return fallback;
    if (GENERIC_BACKEND_MESSAGES.includes(message.trim().toLowerCase())) return fallback;
    return message;
};

// Yanıtsız axios hatası = ağ/erişim sorunu. Boş-durum "Bağlantı yok + Tekrar Dene"
// ayrımı için timeout (ECONNABORTED) DA ağ hatası sayılır — banner'dan (yalnız
// ERR_NETWORK, NetworkContext) bilinçli olarak daha geniş: yavaş ağda da kullanıcıya
// "boş sonuç" değil "bağlantı sorunu" gösterilmeli.
export const isNetworkError = (err: any): boolean =>
    !!err && err.response === undefined &&
    (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED' || err.message === 'Network Error');

// OTP hız limitlerinin 429 gövdesindeki retryAfter (saniye) değeri — tekrar-gönder
// geri sayımını sunucuyla senkronlamak için. 429 değilse/yoksa null döner.
export const getRetryAfterSeconds = (err: any): number | null => {
    const retryAfter = Number(err?.response?.data?.retryAfter);
    return err?.response?.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.ceil(retryAfter)
        : null;
};
