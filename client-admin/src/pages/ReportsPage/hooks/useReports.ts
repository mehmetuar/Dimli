import { useState, useCallback } from 'react';
import adminApi from '../../../services/adminApi';
import { usePaginatedList } from '../../../hooks/usePaginatedList';

export type ReportStatus = 'pending' | 'reviewed' | 'dismissed';

export interface Report {
    id: string;
    reporterId: string;
    reportedUserId: string;
    messageId: string | null;
    channelId: string | null;
    note: string | null;
    status: ReportStatus;
    createdAt: string;
    reporter: { id: string; username: string; full_name: string } | null;
    reportedUser: { id: string; username: string; full_name: string; isChatBanned: boolean } | null;
    message: { id: string; content: string; createdAt: string } | null;
}

export const useReports = () => {
    const [statusFilter, setStatusFilter] = useState<ReportStatus>('pending');

    const {
        items: reports, total, totalPages, page, setPage,
        search, setSearch, loading, refetch,
    } = usePaginatedList<Report>('/admin/reports', { status: statusFilter });

    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const showToast = useCallback((text: string, type: 'success' | 'error') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    const handleUpdateStatus = useCallback(async (id: string, status: ReportStatus) => {
        setProcessing(true);
        try {
            await adminApi.patch(`/admin/reports/${id}/status`, { status });
            setSelectedReport(null);
            await refetch();
            showToast(
                status === 'reviewed' ? 'Şikayet incelendi olarak işaretlendi.' : 'Şikayet yoksayıldı.',
                'success',
            );
        } catch {
            showToast('İşlem başarısız. Tekrar deneyin.', 'error');
        } finally {
            setProcessing(false);
        }
    }, [refetch, showToast]);

    const handleChatBanAndReview = useCallback(async (report: Report, durationHours?: number) => {
        if (!report.reportedUser) return;
        setProcessing(true);
        try {
            await adminApi.post(`/admin/users/${report.reportedUserId}/chat-ban`, { durationHours });
            await adminApi.patch(`/admin/reports/${report.id}/status`, { status: 'reviewed' });
            setSelectedReport(null);
            await refetch();
            showToast(`${report.reportedUser.full_name} kullanıcısına chat yasağı uygulandı.`, 'success');
        } catch {
            showToast('İşlem başarısız. Tekrar deneyin.', 'error');
        } finally {
            setProcessing(false);
        }
    }, [refetch, showToast]);

    const handleChatUnban = useCallback(async (userId: string) => {
        setProcessing(true);
        try {
            await adminApi.delete(`/admin/users/${userId}/chat-ban`);
            showToast('Chat yasağı kaldırıldı.', 'success');
            setSelectedReport(prev =>
                prev ? {
                    ...prev,
                    reportedUser: prev.reportedUser
                        ? { ...prev.reportedUser, isChatBanned: false }
                        : null,
                } : null,
            );
        } catch {
            showToast('Yasak kaldırma başarısız.', 'error');
        } finally {
            setProcessing(false);
        }
    }, [showToast]);

    return {
        reports, total, totalPages, page, setPage, search, setSearch,
        loading, statusFilter, setStatusFilter,
        selectedReport, setSelectedReport,
        processing, toast,
        handleUpdateStatus, handleChatBanAndReview, handleChatUnban,
        fetchReports: refetch,
    };
};
