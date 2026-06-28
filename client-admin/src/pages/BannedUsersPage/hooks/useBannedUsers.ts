import { useState, useCallback } from 'react';
import adminApi from '../../../services/adminApi';
import { usePaginatedList } from '../../../hooks/usePaginatedList';

export interface BannedUser {
    id: string;
    username: string;
    full_name: string;
    chatBannedAt: string | null;
    chatBanExpiry: string | null;
}

export const useBannedUsers = () => {
    const {
        items: users, total, totalPages, page, setPage,
        search, setSearch, loading, refetch,
    } = usePaginatedList<BannedUser>('/admin/users/banned');

    const [processing, setProcessing] = useState<string | null>(null); // userId
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const showToast = useCallback((text: string, type: 'success' | 'error') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    const handleUnban = useCallback(async (userId: string, name: string) => {
        setProcessing(userId);
        try {
            await adminApi.delete(`/admin/users/${userId}/chat-ban`);
            showToast(`${name} kullanıcısının chat yasağı kaldırıldı.`, 'success');
            await refetch();
        } catch {
            showToast('Yasak kaldırma başarısız. Tekrar deneyin.', 'error');
        } finally {
            setProcessing(null);
        }
    }, [showToast, refetch]);

    return {
        users, total, totalPages, page, setPage, search, setSearch,
        loading, processing, toast, handleUnban, fetchUsers: refetch,
    };
};
