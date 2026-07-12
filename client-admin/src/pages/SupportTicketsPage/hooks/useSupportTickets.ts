import { useState, useCallback } from 'react';
import adminApi from '../../../services/adminApi';
import { usePaginatedList } from '../../../hooks/usePaginatedList';

export type SupportAudience = 'business' | 'user';
export type SupportTicketStatus = 'pending' | 'answered' | 'reviewed';

export interface SupportTicket {
    id: string;
    audience: SupportAudience;
    category: string;
    message: string;
    status: SupportTicketStatus;
    adminReply: string | null;
    repliedAt: string | null;
    createdAt: string;
    user: {
        id: string;
        username: string;
        full_name: string;
        email: string | null;
        phone: string | null;
        location: string | null;
        avatarUrl: string | null;
    } | null;
    owner: {
        id: string;
        fullName: string;
        email: string;
        phone: string | null;
        business: {
            id: string;
            name: string;
            city: string | null;
            district: string | null;
            phone: string | null;
            status: string;
            deletedAt: string | null;
        } | null;
    } | null;
}

export const useSupportTickets = () => {
    const [audience, setAudience] = useState<SupportAudience>('business');
    const [statusFilter, setStatusFilter] = useState<SupportTicketStatus>('pending');

    const {
        items: tickets, total, totalPages, page, setPage,
        search, setSearch, loading, refetch,
    } = usePaginatedList<SupportTicket>('/admin/support-tickets', { audience, status: statusFilter });

    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const showToast = useCallback((text: string, type: 'success' | 'error') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    const handleReply = useCallback(async (id: string, reply: string) => {
        setProcessing(true);
        try {
            await adminApi.patch(`/admin/support-tickets/${id}/reply`, { reply });
            setSelectedTicket(null);
            await refetch();
            showToast('Yanıt gönderildi, kullanıcıya bildirim iletildi.', 'success');
        } catch {
            showToast('Yanıt gönderilemedi. Tekrar deneyin.', 'error');
        } finally {
            setProcessing(false);
        }
    }, [refetch, showToast]);

    const handleMarkReviewed = useCallback(async (id: string) => {
        setProcessing(true);
        try {
            await adminApi.patch(`/admin/support-tickets/${id}/status`, { status: 'reviewed' });
            setSelectedTicket(null);
            await refetch();
            showToast('Talep incelendi olarak işaretlendi.', 'success');
        } catch {
            showToast('İşlem başarısız. Tekrar deneyin.', 'error');
        } finally {
            setProcessing(false);
        }
    }, [refetch, showToast]);

    return {
        tickets, total, totalPages, page, setPage, search, setSearch, loading,
        audience, setAudience, statusFilter, setStatusFilter,
        selectedTicket, setSelectedTicket,
        processing, toast,
        handleReply, handleMarkReviewed,
    };
};
