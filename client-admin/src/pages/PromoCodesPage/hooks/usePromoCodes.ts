import { useState, useCallback } from 'react';
import adminApi from '../../../services/adminApi';
import { usePaginatedList } from '../../../hooks/usePaginatedList';

export type PromoStatusFilter = 'all' | 'active' | 'inactive' | 'used';

export interface PromoRedemption {
    id: string;
    promoCodeId: string;
    ownerId: string;
    context: 'registration' | 'existing';
    redeemedAt: string;
    ownerName: string | null;
    email: string | null;
    businessName: string | null;
}

export interface PromoCode {
    id: string;
    code: string;
    note: string | null;
    durationMonths: number | null;
    maxRedemptions: number;
    usedCount: number;
    isActive: boolean;
    expiresAt: string | null;
    createdByAdminId: string | null;
    createdAt: string;
    updatedAt: string;
    redemptions: PromoRedemption[];
}

export interface CreatePromoForm {
    count: number;
    durationMonths: number | null;
    maxRedemptions: number;
    note: string;
    expiresAt: string;
}

export const usePromoCodes = () => {
    const [statusFilter, setStatusFilter] = useState<PromoStatusFilter>('all');

    const {
        items: codes, total, totalPages, page, setPage,
        search, setSearch, loading, refetch,
    } = usePaginatedList<PromoCode>(
        '/admin/promo-codes',
        statusFilter === 'all' ? {} : { status: statusFilter },
    );

    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    // Üretilen kodları kopyalanabilir liste olarak gösteren modal.
    const [generated, setGenerated] = useState<PromoCode[] | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const showToast = useCallback((text: string, type: 'success' | 'error') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    const createCodes = useCallback(async (form: CreatePromoForm) => {
        setProcessing(true);
        try {
            const payload = {
                count: form.count,
                durationMonths: form.durationMonths, // null = süresiz
                maxRedemptions: form.maxRedemptions,
                note: form.note.trim() || undefined,
                expiresAt: form.expiresAt || undefined,
            };
            const res = await adminApi.post('/admin/promo-codes', payload);
            setShowCreate(false);
            setGenerated(res.data as PromoCode[]);
            await refetch();
            showToast(`${(res.data as PromoCode[]).length} kod üretildi.`, 'success');
        } catch {
            showToast('Kod üretilemedi. Tekrar deneyin.', 'error');
        } finally {
            setProcessing(false);
        }
    }, [refetch, showToast]);

    const toggleActive = useCallback(async (code: PromoCode) => {
        setProcessing(true);
        try {
            const action = code.isActive ? 'deactivate' : 'activate';
            await adminApi.patch(`/admin/promo-codes/${code.id}/${action}`);
            await refetch();
            showToast(code.isActive ? 'Kod devre dışı bırakıldı.' : 'Kod yeniden etkinleştirildi.', 'success');
        } catch {
            showToast('İşlem başarısız. Tekrar deneyin.', 'error');
        } finally {
            setProcessing(false);
        }
    }, [refetch, showToast]);

    return {
        codes, total, totalPages, page, setPage, search, setSearch, loading,
        statusFilter, setStatusFilter,
        processing, toast,
        generated, setGenerated,
        showCreate, setShowCreate,
        createCodes, toggleActive,
    };
};
