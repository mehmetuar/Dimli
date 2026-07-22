import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../../../../contexts/AuthContext';
import api from '../../../../services/api';
import { getOwnerId } from '../../../../services/authStorage';
import { purchasePlan, linkRevenueCatUser, restoreRevenueCatPurchases, purchaseErrorToTurkish, getActiveEntitlementInfo } from '../../../../services/revenuecatService';
import { getErrorMessage } from '../../../../utils/apiError';
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

    // Davet kodu kullanımı (mevcut işletme)
    const [promoCode, setPromoCodeRaw] = useState('');
    const [promoRedeemLoading, setPromoRedeemLoading] = useState(false);
    const [promoError, setPromoError] = useState('');
    const [showPromoModal, setShowPromoModal] = useState(false);
    const [showStoreCancelModal, setShowStoreCancelModal] = useState(false);
    const setPromoCode = (v: string) => { setPromoCodeRaw(v.toUpperCase()); if (promoError) setPromoError(''); };
    const openPromoModal = () => { setPromoCodeRaw(''); setPromoError(''); setShowPromoModal(true); };

    // Düşürme akışında SEÇİLEN saha ID'leri — silme/pasifleştirme YOK; asıl
    // işlem satın alma tamamlanınca schedule-downgrade'de sunucuda yapılır.
    const selectedPitchIdsRef = useRef<string[]>([]);
    const downgradePurchaseRef = useRef<string | null>(null);
    // Satın alma tahsil edildi ama confirm-purchase kaçarsa: aynı oturumda tekrar MAĞAZA
    // satın alma yapmadan yalnız confirm-purchase yeniden denensin diye tutulur.
    const pendingConfirmRef = useRef<{ planType: string; rcCustomerId: string } | null>(null);
    // Uzlaştırma bir kez denensin (çift POST / StrictMode koruması).
    const reconciledRef = useRef(false);

    useEffect(() => {
        (async () => {
            const sub = await fetchSubscription();
            await reconcilePaidSubscription(sub);
        })();
        fetchPitches();
    }, []);

    const fetchSubscription = async () => {
        setLoading(true);
        try {
            const ownerId = getOwnerId();
            if (!ownerId) return null;
            const res = await api.get(`/subscription/owner/${ownerId}`);
            setSubscription(res.data ?? null);
            return res.data ?? null;
        } catch {
            setSubscription(null);
            return null;
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

    // Ödeme başarılı olup confirm-purchase kaçarsa işletme "davetli"/"expired"de takılır.
    // Mağazada GERÇEK aktif abonelik varken sunucu geri kalmışsa confirm-purchase'i sessizce
    // yeniden çalıştırıp statüyü active'e çeker. YALNIZ RC entitlement aktifken çalışır →
    // hiç ödememiş davetli işletmeye ASLA dokunmaz.
    const reconcilePaidSubscription = async (sub: any) => {
        if (reconciledRef.current) return;
        if (!sub || (sub.status !== 'complimentary' && sub.status !== 'expired')) return;
        const ownerId = getOwnerId();
        if (!ownerId || !sub.planType) return;
        reconciledRef.current = true; // erken kilitle (çift-tetik / StrictMode)
        try {
            const info = await getActiveEntitlementInfo();
            if (!info) { reconciledRef.current = false; return; } // mağazada aktif abonelik yok
            await linkRevenueCatUser(ownerId);
            await api.post('/subscription/confirm-purchase', {
                ownerId, planType: sub.planType, rcCustomerId: info.appUserId,
            });
            await fetchSubscription();
        } catch {
            reconciledRef.current = false; // sonraki tetikte tekrar denensin
        }
    };

    // Bekleyen (tahsil edilmiş ama sunucuya işlenememiş) satın almayı — MAĞAZADA yeniden
    // satın alma YAPMADAN — yalnız confirm-purchase'i yeniden deneyerek tamamlar.
    const retryPendingConfirm = async () => {
        const pending = pendingConfirmRef.current;
        if (!pending) return;
        setShowPlanPicker(false);
        setPurchaseLoading(true);
        try {
            const ownerId = getOwnerId() ?? '';
            await api.post('/subscription/confirm-purchase', {
                ownerId, planType: pending.planType, rcCustomerId: pending.rcCustomerId,
            });
            pendingConfirmRef.current = null;
            showToast('Aboneliğiniz başarıyla güncellendi.', 'success');
            await fetchSubscription();
        } catch {
            showToast('Abonelik güncellenemedi. Lütfen tekrar deneyin.', 'error');
        } finally {
            setPurchaseLoading(false);
        }
    };

    const showToast = (text: string, type: 'success' | 'error') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Davetli üyelik bitişinde/expired'da mevcut planı doğrudan satın al (IAP).
    // handleSelectPlan aynı planType'ı yükseltme/yeni-satın-alma dalına sokar →
    // purchasePlan + confirm-purchase (complimentary alanları temizlenir, ACTIVE).
    const handleBuyCurrentPlan = () => {
        if (subscription?.planType) handleSelectPlan(subscription.planType);
    };

    const handleSelectPlan = async (planType: string) => {
        // Önceki satın alma tahsil edildi ama confirm-purchase kaçtıysa: MAĞAZADA tekrar
        // satın alma YAPMA — yalnız bekleyen confirm-purchase'i yeniden dene.
        if (pendingConfirmRef.current) {
            await retryPendingConfirm();
            return;
        }

        const newPlanEntry = PLAN_ENTRIES.find(([, pl]) => pl.planType === planType);
        const newPitchCount = newPlanEntry ? Number(newPlanEntry[0]) : 0;
        const currentPitchCount = subscription?.pitchCount ?? 0;

        setShowPlanPicker(false);

        if (newPitchCount < currentPitchCount) {
            setDowngradeTarget(planType);
            downgradePurchaseRef.current = null;
            selectedPitchIdsRef.current = [];
            if (usedPitchCount > newPitchCount) {
                setSelectionConflict(null);
                setShowPitchSelection(true);
            } else {
                setShowDowngradeConfirm(true);
            }
            return;
        }

        setPurchaseLoading(true);
        const ownerId = getOwnerId() ?? '';
        try {
            const previousPitchCount = subscription?.pitchCount ?? 0;
            // Promo/davetli geçmişi olan işletme (grace'te status=complimentary;
            // süresi dolmuşta promoCodeId audit izi kalır) mağazanın "ilk 3 ay
            // ücretsiz" intro'sunu YENİDEN almasın: intro'suz no_trial offering'i
            // tercih edilir (RC'de tanımlı değilse purchasePlan current'a düşer).
            const needsNoTrial =
                !!subscription &&
                (subscription.promoCodeId != null || subscription.status === 'complimentary');
            // linkRevenueCatUser'ı satın almadan ÖNCE: mağaza olayları app_user_id=ownerId ile
            // gelsin, sunucu webhook'u ownerId ile eşleştirebilsin (backstop/uzlaştırma zemini).
            if (ownerId) await linkRevenueCatUser(ownerId);
            const rcCustomerId = await purchasePlan(
                planType,
                needsNoTrial ? { preferOffering: 'no_trial' } : undefined,
            );

            // Mağaza tahsilatı BAŞARILI. Buradan sonra confirm-purchase kaçarsa işletme ödemiş
            // ama statüsü geride kalır → detayı sakla (aynı oturumda retry, yeniden açılışta
            // uzlaştırma tamamlar).
            pendingConfirmRef.current = { planType, rcCustomerId };
            await api.post('/subscription/confirm-purchase', { ownerId, planType, rcCustomerId });
            pendingConfirmRef.current = null;

            showToast('Aboneliğiniz başarıyla güncellendi.', 'success');
            await fetchSubscription();

            if (newPitchCount > previousPitchCount) {
                setShowNewPitchPrompt(true);
            }
        } catch (err: any) {
            if (pendingConfirmRef.current) {
                // Mağaza tahsil etti ama sunucu güncellenemedi (ağ/çökme). Tekrar denemede veya
                // uygulama yeniden açılışında (uzlaştırma) otomatik tamamlanır — çift tahsilat yok.
                showToast('Satın alma tamamlandı ancak abonelik güncellenemedi. Tekrar deneyin; uygulamayı yeniden açtığınızda da otomatik tamamlanır.', 'error');
            } else {
                // Ham İngilizce RevenueCat mesajı yerine Türkçe; iptalde sessiz geç
                const { cancelled, message } = purchaseErrorToTurkish(err);
                if (!cancelled) showToast(message, 'error');
            }
        } finally {
            setPurchaseLoading(false);
        }
    };

    // Saha seçimi "onayla": YALNIZ sunucu ön-doğrulaması (yan etkisiz) —
    // saha burada silinmez/pasifleşmez; Vazgeç her adımda gerçekten geri döner.
    const handlePitchSelectionConfirm = async (selectedIds: string[]) => {
        if (!downgradeTarget) return;
        setSelectionLoading(true);
        setSelectionConflict(null);
        try {
            await api.post('/pitches/downgrade-precheck', {
                planType: downgradeTarget,
                pitchIds: selectedIds,
            });
            selectedPitchIdsRef.current = selectedIds;
            setShowPitchSelection(false);
            setShowDowngradeConfirm(true);
        } catch (err: any) {
            if (err?.response?.status === 409) {
                const data = err.response.data;
                setSelectionConflict({
                    pitchId: data?.pitchId ?? selectedIds[0],
                    conflicts: data?.conflicts || data?.message?.conflicts || [],
                });
                return;
            }
            const msg = err?.response?.data?.message;
            showToast(typeof msg === 'string' ? msg : 'Saha seçimi doğrulanamadı. Lütfen tekrar deneyin.', 'error');
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
                // handleSelectPlan ile aynı intro-offer bypass'ı (no_trial tercihli)
                const needsNoTrial =
                    !!subscription &&
                    (subscription.promoCodeId != null || subscription.status === 'complimentary');
                rcCustomerId = await purchasePlan(
                    downgradeTarget,
                    needsNoTrial ? { preferOffering: 'no_trial' } : undefined,
                );
                downgradePurchaseRef.current = rcCustomerId;
            }

            // Satın alma TAMAMLANDIKTAN sonra tek istek: abonelik pending
            // alanları + seçilen sahalar (pasif + fatura sonunda silinecek).
            await api.post('/pitches/schedule-downgrade', {
                planType: downgradeTarget,
                rcCustomerId,
                pitchIds: selectedPitchIdsRef.current,
            });
            await linkRevenueCatUser(ownerId);

            const hadPitches = selectedPitchIdsRef.current.length > 0;
            downgradePurchaseRef.current = null;
            selectedPitchIdsRef.current = [];
            showToast(
                hadPitches && effectiveDateLabel
                    ? `Plan düşürme planlandı. Seçilen saha ${effectiveDateLabel} tarihinde otomatik silinecek.`
                    : 'Plan düşürme talebiniz alındı.',
                'success',
            );
            await fetchSubscription();
            await fetchPitches();
            setShowDowngradeConfirm(false);
            setDowngradeTarget(null);
        } catch (err: any) {
            if (err?.response?.status === 409 && downgradePurchaseRef.current) {
                // Seçilen sahada X sonrası kesinleşmiş maç oluşmuş — satın alma
                // korunur, kullanıcı başka saha seçip yeniden onaylar (tekrar
                // satın alma İSTENMEZ, downgradePurchaseRef dolu kalır).
                const data = err.response.data;
                setSelectionConflict({
                    pitchId: data?.pitchId ?? selectedPitchIdsRef.current[0],
                    conflicts: data?.conflicts || data?.message?.conflicts || [],
                });
                setShowDowngradeConfirm(false);
                setShowPitchSelection(true);
                showToast('Seçilen sahada kesinleşmiş maçlar oluştu. Lütfen başka bir saha seçin.', 'error');
            } else if (downgradePurchaseRef.current) {
                showToast('Satın alma tamamlandı ancak abonelik güncellenemedi. Lütfen "Onayla" ile tekrar deneyin.', 'error');
            } else {
                // Ham İngilizce RevenueCat mesajı yerine Türkçe; iptalde sessiz geç
                const { cancelled, message } = purchaseErrorToTurkish(err);
                if (!cancelled) showToast(message, 'error');
            }
        } finally {
            setDowngradeLoading(false);
        }
    };

    // Modal başarıda kapanabilsin diye boolean döner; hata modal içinde gösterilir.
    const handleRedeemPromo = async (): Promise<boolean> => {
        const code = promoCode.trim();
        if (!code) return false;
        setPromoRedeemLoading(true);
        setPromoError('');
        // Mağaza aboneliği hâlâ yenilenebilir mi (redeem SONRASI state değişmeden önce oku).
        const hadStoreSub = Capacitor.isNativePlatform() && !!subscription?.revenuecatCustomerId;
        try {
            await api.post('/promo-codes/redeem', { code });
            setPromoCodeRaw('');
            await fetchSubscription();
            showToast('Davet kodun uygulandı. Aboneliğin artık ücretsiz.', 'success');
            if (hadStoreSub) setShowStoreCancelModal(true);
            return true;
        } catch (err) {
            setPromoError(getErrorMessage(err, 'Davet kodu uygulanamadı. Lütfen tekrar deneyin.'));
            return false;
        } finally {
            setPromoRedeemLoading(false);
        }
    };

    const handleRestorePurchases = async () => {
        setRestoreLoading(true);
        try {
            await restoreRevenueCatPurchases();
            const sub = await fetchSubscription();
            // Restore kullanıcı-tetikli: mağazada aktif abonelik varken sunucu davetli/expired
            // kalmışsa active'e çek (uzlaştırmayı bir kez daha dene).
            reconciledRef.current = false;
            await reconcilePaidSubscription(sub);
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
    const isComplimentary = status === 'complimentary';
    const isActive = status === 'active' || status === 'trial' || isComplimentary;
    const isExpiredOrCancelled = status === 'expired' || status === 'cancelled';
    // Mağaza aboneliği hâlâ bağlıysa (davet kodu öncesi ödemesi olan işletme)
    // kalıcı iptal hatırlatması gösterilir.
    const showStoreCancelReminder = isComplimentary && !!subscription?.revenuecatCustomerId;

    const statusLabel: Record<string, string> = {
        active: 'Aktif', trial: 'Deneme Sürümü',
        expired: 'Süresi Doldu', cancelled: 'İptal Edildi',
        complimentary: 'Davetli Üyelik',
    };
    const statusColor: Record<string, string> = {
        active: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
        trial: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
        expired: 'text-red-400 bg-red-400/10 border-red-400/20',
        cancelled: 'text-red-400 bg-red-400/10 border-red-400/20',
        complimentary: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
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
        promoCode, setPromoCode, promoRedeemLoading, promoError,
        showPromoModal, openPromoModal, setShowPromoModal,
        showStoreCancelModal, setShowStoreCancelModal,
        handleRedeemPromo,
        handleSelectPlan,
        handleBuyCurrentPlan,
        handlePitchSelectionConfirm,
        handleDowngradeConfirm,
        handleRestorePurchases,
        handleDeleteAccount,
        status,
        isActive,
        isComplimentary,
        isExpiredOrCancelled,
        showStoreCancelReminder,
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
