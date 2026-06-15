// Backend'den İngilizce/teknik bir mesaj gelirse kullanıcıya gösterilmeden Türkçe genel mesaja düşer
const GENERIC_BACKEND_MESSAGES = ['internal server error', 'bad request', 'not found', 'unauthorized'];

export const getErrorMessage = (err: any, fallback: string): string => {
    const message = err?.response?.data?.message || err?.message;
    if (!message || typeof message !== 'string') return fallback;
    if (GENERIC_BACKEND_MESSAGES.includes(message.trim().toLowerCase())) return fallback;
    return message;
};
