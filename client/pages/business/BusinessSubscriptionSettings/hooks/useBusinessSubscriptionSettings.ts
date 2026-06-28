import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../services/api';
import { getOwnerId } from '../../../../services/authStorage';
import { purchasePlan, linkRevenueCatUser, restoreRevenueCatPurchases } from '../../../../services/revenuecatService';
import { SUBSCRIPTION_PLANS } from '../../BusinessRegister/hooks/useBusinessRegister';
import { PLAN_ENTRIES } from '../utils';

export const useBusinessSubscriptionSettings = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState<any>(null);
    const [pitches, setPitches] = useState<any[]>([]);
    const [purchaseLoading, setPurchaseLoading] = useState(false);
    const [restoreLoading, setRestoreLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showPlanPicker, setShowPlanPicker] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showNewPitchPrompt, setShowNewPitchPrompt] = useState(false);
    const [showPitchSelection, setShowPitchSelection] = useState(false);
    const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
    const [downgradeTarget, setDowngradeTarget] = useState<string | null>(null);
    const [selectionLoading, setSelectionLoading] = useState(false);
    const [selectionConflict, setSelectionConflict] = useState<{ pitchId: string; conflicts: any[] } | null>(null);
    const [downgradeLoading, setDowngradeLoading] = useState(false);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const removedPitchIdsRef = useRef<Set<string>>(new Set());
    const downgradePurchaseRef = useRef<string | null>(null);

    useEffect(() => { fetchSubscription(); fetchPitches(); }, []);

    const fetchSubscription = async () => {
        setLoading(true);
        try {
            const ownerId = getOwnerId();
            if (!ownerId) return;
            const res = await api.get(`/subscription/owner/${ownerId}`);
            setSubscription(res.data ?? null);
        } catch {
            setSubscription(null);
        } finally {
            setLoading(false);
        }
    };

    const fetchPitches = async () => {
        try {
            const ownerId = getOwnerId();
            if (!ownerId) return;
            const ownerResponse = await api.get(`/business-owner/${ownerId}`);
            const busId = ownerResponse.data.business?.id;
            if (!busId) return;
            const pitchesResponse = await api.get(`/pitches/business/${busId}`);
            setPitches(pitchesResponse.data ?? []);
        } catch (error) {
            console.error('Error fetching pitches:', error);
        }
    };

    const showToast = (text: string, type: 'success' | 'error') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleSelectPlan = async (planType: string) => {
        const newPlanEntry = PLAN_ENTRIES.find(([, pl]) => pl.planType === planType);
        const newPitchCount = newPlanEntry ? Number(newPlanEntry[0]) : 0;
        const currentPitchCount = subscription?.pitchCount ?? 0;

        setShowPlanPicker(false);

        if (newPitchCount < currentPitchCount) {
            setDowngradeTarget(planType);
            downgradePurchaseRef.current = null;
            if (usedPitchCount > newPitchCount) {
                removedPitchIdsRef.current = new Set();
                setSelectionConflict(null);
                setShowPitchSelection(true);
            } else {
                setShowDowngradeConfirm(true);
            }
            return;
        }

        setPurchaseLoading(true);
        try {
            const previousPitchCount = subscription?.pitchCount ?? 0;
            const rcCustomerId = await purchasePlan(planType);
            const ownerId = getOwnerId() ?? '';

            await api.post('/subscription/confirm-purchase', { ownerId, planType, rcCustomerId });
            await linkRevenueCatUser(ownerId);

            showToast('Aboneliğiniz başarıyla güncellendi.', 'success');
            await fetchSubscription();

            if (newPitchCount > previousPitchCount) {
                setShowNewPitchPrompt(true);
            }
        } catch (err: any) {
            showToast(err?.message || 'Satın alma işlemi başarısız oldu.', 'error');
        } finally {
            setPurchaseLoading(false);
        }
    };

    const handlePitchSelectionConfirm = async (selectedIds: string[]) => {
        setSelectionLoading(true);
        setSelectionConflict(null);
        try {
            for (const pitchId of selectedIds) {
                if (removedPitchIdsRef.current.has(pitchId)) continue;
                try {
                    await api.delete(`/pitches/${pitchId}`);
                    removedPitchIdsRef.current.add(pitchId);
                } catch (err: any) {
                    if (err?.response?.status === 409) {
                        const data = err.response.data;
                        setSelectionConflict({
                            pitchId,
                            conflicts: data?.message?.conflicts || data?.conflicts || [],
                        });
                        return;
                    }
                    throw err;
                }
            }
            await fetchPitches();
            setShowPitchSelection(false);
            setShowDowngradeConfirm(true);
        } catch {
            showToast('Saha kaldırılırken bir hata oluştu.', 'error');
        } finally {
            setSelectionLoading(false);
        }
    };

    const handleDowngradeConfirm = async () => {
        if (!downgradeTarget) return;
        setDowngradeLoading(true);
        try {
            const ownerId = getOwnerId() ?? '';
            let rcCustomerId = downgradePurchaseRef.current;
            if (!rcCustomerId) {
                rcCustomerId = await purchasePlan(downgradeTarget);
                downgradePurchaseRef.current = rcCustomerId;
            }

            await api.post('/subscription/schedule-downgrade', { ownerId, planType: downgradeTarget, rcCustomerId });
            await linkRevenueCatUser(ownerId);

            downgradePurchaseRef.current = null;
            showToast('Plan düşürme talebiniz alındı.', 'success');
            await fetchSubscription();
            await fetchPitches();
            setShowDowngradeConfirm(false);
            setDowngradeTarget(null);
        } catch (err: any) {
            if (downgradePurchaseRef.current) {
                showToast('Satın alma tamamlandı ancak abonelik güncellenemedi. Lütfen "Onayla" ile tekrar deneyin.', 'error');
            } else {
                showToast(err?.message || 'İşlem başarısız oldu.', 'error');
            }
        } finally {
            setDowngradeLoading(false);
        }
    };

    const handleRestorePurchases = async () => {
        setRestoreLoading(true);
        try {
            await restoreRevenueCatPurchases();
            await fetchSubscription();
            showToast('Satın alımlar başarıyla geri yüklendi.', 'success');
        } catch {
            showToast('Geri yükleme başarısız. Lütfen tekrar deneyin.', 'error');
        } finally {
            setRestoreLoading(false);
        }
    };

    const handleDeleteAccount = async (reason: string, note: string, password: string) => {
        setDeleteLoading(true);
        try {
            await api.delete('/business-owner/account', { data: { reason, note, password } });
            await logout();
            navigate('/business/login');
        } catch (err: any) {
            setShowDeleteModal(false);
            const msg = err?.response?.data?.message || 'Hesap silinirken bir hata oluştu.';
            showToast(msg, 'error');
        } finally {
            setDeleteLoading(false);
        }
    };

    /* ── derived ── */
    const status = subscription?.status ?? null;
    const isActive = status === 'active' || status === 'trial';
    const isExpiredOrCancelled = status === 'expired' || status === 'cancelled';

    const statusLabel: Record<string, string> = {
        active: 'Aktif', trial: 'Deneme Sürümü',
        expired: 'Süresi Doldu', cancelled: 'İptal Edildi',
    };
    const statusColor: Record<string, string> = {
        active: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
        trial: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
        expired: 'text-red-400 bg-red-400/10 border-red-400/20',
        cancelled: 'text-red-400 bg-red-400/10 border-red-400/20',
    };

    const planLabel = (() => {
        if (!subscription?.planType) return 'Bilinmiyor';
        const p = Object.values(SUBSCRIPTION_PLANS).find(
            pl => pl.planType === subscription.planType,
        );
        return p?.label ?? subscription.planType;
    })();

    const usedPitchCount = pitches.filter((p: any) => p.approvalStatus !== 'rejected').length;

    const downgradeTargetPlan = downgradeTarget
        ? Object.values(SUBSCRIPTION_PLANS).find(pl => pl.planType === downgradeTarget)
        : null;

    const requiredRemovalCount = (() => {
        if (!downgradeTarget) return 0;
        const entry = PLAN_ENTRIES.find(([, pl]) => pl.planType === downgradeTarget);
        const newPitchCount = entry ? Number(entry[0]) : 0;
        return Math.max(0, usedPitchCount - newPitchCount);
    })();

    const effectiveDateLabel = (() => {
        const d = subscription?.expiresAt ?? subscription?.trialEndsAt ?? null;
        if (!d) return '';
        return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    })();

    const pendingPlanInfo = subscription?.pendingPlanType
        ? Object.values(SUBSCRIPTION_PLANS).find(pl => pl.planType === subscription.pendingPlanType)
        : null;

    return {
        navigate,
        loading,
        subscription,
        pitches,
        purchaseLoading,
        restoreLoading,
        deleteLoading,
        showPlanPicker, setShowPlanPicker,
        showDeleteModal, setShowDeleteModal,
        showNewPitchPrompt, setShowNewPitchPrompt,
        showPitchSelection, setShowPitchSelection,
        showDowngradeConfirm, setShowDowngradeConfirm,
        downgradeTarget, setDowngradeTarget,
        selectionLoading,
        selectionConflict, setSelectionConflict,
        downgradeLoading,
        toast,
        downgradePurchaseRef,
        handleSelectPlan,
        handlePitchSelectionConfirm,
        handleDowngradeConfirm,
        handleRestorePurchases,
        handleDeleteAccount,
        status,
        isActive,
        isExpiredOrCancelled,
        statusLabel,
        statusColor,
        planLabel,
        usedPitchCount,
        downgradeTargetPlan,
        requiredRemovalCount,
        effectiveDateLabel,
        pendingPlanInfo,
    };
};
