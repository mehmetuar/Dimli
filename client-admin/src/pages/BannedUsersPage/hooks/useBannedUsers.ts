import { useState, useEffect, useCallback } from 'react';
import adminApi from '../../../services/adminApi';

export interface BannedUser {
    id: string;
    username: string;
    full_name: string;
    chatBannedAt: string | null;
    chatBanExpiry: string | null;
}

export const useBannedUsers = () => {
    const [users, setUsers] = useState<BannedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null); // userId
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const showToast = useCallback((text: string, type: 'success' | 'error') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminApi.get('/admin/users/banned');
            setUsers(res.data);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleUnban = useCallback(async (userId: string, name: string) => {
        setProcessing(userId);
        try {
            await adminApi.delete(`/admin/users/${userId}/chat-ban`);
            showToast(`${name} kullanıcısının chat yasağı kaldırıldı.`, 'success');
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch {
            showToast('Yasak kaldırma başarısız. Tekrar deneyin.', 'error');
        } finally {
            setProcessing(null);
        }
    }, [showToast]);

    return { users, loading, processing, toast, handleUnban, fetchUsers };
};
