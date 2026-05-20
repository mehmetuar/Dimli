import { useState, useEffect, useCallback } from 'react';
import adminApi from '../../../services/adminApi';

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
}

export const useReports = () => {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<ReportStatus>('pending');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const showToast = useCallback((text: string, type: 'success' | 'error') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminApi.get(`/admin/reports?status=${statusFilter}`);
            setReports(res.data);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { fetchReports(); }, [fetchReports]);

    const handleUpdateStatus = useCallback(async (id: string, status: ReportStatus) => {
        setProcessing(true);
        try {
            await adminApi.patch(`/admin/reports/${id}/status`, { status });
            setSelectedReport(null);
            await fetchReports();
            showToast(
                status === 'reviewed' ? 'Şikayet incelendi olarak işaretlendi.' : 'Şikayet yoksayıldı.',
                'success',
            );
        } catch {
            showToast('İşlem başarısız. Tekrar deneyin.', 'error');
        } finally {
            setProcessing(false);
        }
    }, [fetchReports, showToast]);

    const handleChatBanAndReview = useCallback(async (report: Report) => {
        if (!report.reportedUser) return;
        setProcessing(true);
        try {
            await adminApi.post(`/admin/users/${report.reportedUserId}/chat-ban`);
            await adminApi.patch(`/admin/reports/${report.id}/status`, { status: 'reviewed' });
            setSelectedReport(null);
            await fetchReports();
            showToast(`${report.reportedUser.full_name} kullanıcısına chat yasağı uygulandı.`, 'success');
        } catch {
            showToast('İşlem başarısız. Tekrar deneyin.', 'error');
        } finally {
            setProcessing(false);
        }
    }, [fetchReports, showToast]);

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
        reports, loading, statusFilter, setStatusFilter,
        selectedReport, setSelectedReport,
        processing, toast,
        handleUpdateStatus, handleChatBanAndReview, handleChatUnban,
        fetchReports,
    };
};
