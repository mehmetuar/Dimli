import api from './api';

// Sunucudaki support-tickets modülünün istemci katmanı — kategori key'leri
// server/src/support-tickets/support-ticket.entity.ts ile birebir aynı olmalı.

export type SupportTicketStatus = 'pending' | 'answered' | 'reviewed';

export interface SupportTicket {
    id: string;
    category: string;
    message: string;
    status: SupportTicketStatus;
    adminReply: string | null;
    repliedAt: string | null;
    createdAt: string;
}

export interface SupportCategory {
    key: string;
    label: string;
}

export const USER_SUPPORT_CATEGORIES: SupportCategory[] = [
    { key: 'MATCH_RESERVATION', label: 'Maç / Rezervasyon' },
    { key: 'TEAM', label: 'Takım' },
    { key: 'TECHNICAL', label: 'Teknik Sorun' },
    { key: 'ACCOUNT', label: 'Hesap' },
    { key: 'SUGGESTION', label: 'Öneri' },
    { key: 'OTHER', label: 'Diğer' },
];

export const BUSINESS_SUPPORT_CATEGORIES: SupportCategory[] = [
    { key: 'RESERVATION', label: 'Rezervasyon' },
    { key: 'PAYMENT_SUBSCRIPTION', label: 'Ödeme / Abonelik' },
    { key: 'TECHNICAL', label: 'Teknik Sorun' },
    { key: 'ACCOUNT_OWNER', label: 'Hesap / Yetkili' },
    { key: 'SUGGESTION', label: 'Öneri' },
    { key: 'OTHER', label: 'Diğer' },
];

export const SUPPORT_EMAIL = 'destek@dimli.com.tr';

export const getSupportCategoryLabel = (
    key: string,
    categories: SupportCategory[],
): string => categories.find(c => c.key === key)?.label ?? key;

export const createUserTicket = async (data: { category: string; message: string }) => {
    await api.post('/support-tickets/user', data);
};

export const getMyUserTickets = async (): Promise<SupportTicket[]> => {
    const res = await api.get('/support-tickets/user/mine');
    return res.data ?? [];
};

export const createBusinessTicket = async (data: { category: string; message: string }) => {
    await api.post('/support-tickets/business', data);
};

export const getMyBusinessTickets = async (): Promise<SupportTicket[]> => {
    const res = await api.get('/support-tickets/business/mine');
    return res.data ?? [];
};
