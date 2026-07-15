import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../../../services/adminApi';
import { usePaginatedList } from '../../../hooks/usePaginatedList';

type Status = 'pending' | 'active' | 'rejected' | 'suspended';

export const useApplicationsList = (status: Status) => {
    const navigate = useNavigate();
    const {
        items, total, totalPages, page, setPage, search, setSearch, loading, refetch,
    } = usePaginatedList<any>('/admin/applications', { status });

    const [processingId, setProcessingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const showToast = useCallback((text: string, type: 'success' | 'error') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    // Onaylı listeden hızlı askıya alma / askıdan aktifleştirme (detay sayfasına
    // gitmeden). Abonelik statüsüne dokunmaz (complimentary korunur); yalnız
    // business.status değişir → müşteri görünürlüğü buna göre güncellenir.
    const suspend = useCallback(async (id: string) => {
        setProcessingId(id);
        try {
            await adminApi.post(`/admin/businesses/${id}/suspend`);
            await refetch();
            showToast('İşletme askıya alındı.', 'success');
        } catch {
            showToast('İşlem başarısız. Tekrar deneyin.', 'error');
        } finally {
            setProcessingId(null);
        }
    }, [refetch, showToast]);

    const activate = useCallback(async (id: string) => {
        setProcessingId(id);
        try {
            await adminApi.post(`/admin/businesses/${id}/activate`);
            await refetch();
            showToast('İşletme yeniden aktifleştirildi.', 'success');
        } catch {
            showToast('İşlem başarısız. Tekrar deneyin.', 'error');
        } finally {
            setProcessingId(null);
        }
    }, [refetch, showToast]);

    return {
        applications: items,
        total,
        totalPages,
        page,
        setPage,
        search,
        setSearch,
        loading,
        navigate,
        processingId,
        toast,
        suspend,
        activate,
    };
};
