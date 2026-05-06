import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, CreditCard, ShieldAlert, Trash2, Loader2,
    CheckCircle, XCircle, Star, ExternalLink, ChevronRight, Sparkles,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { BusinessNavbar } from '../../../components/Business/BusinessNavbar';
import { ConfirmModal } from '../../../components/Modals/ConfirmModal';
import api from '../../../services/api';
import { purchasePlan } from '../../../services/revenuecatService';
import { SUBSCRIPTION_PLANS } from '../BusinessRegister/hooks/useBusinessRegister';

const formatPrice = (price: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }).format(price);

const PLAN_ENTRIES = Object.entries(SUBSCRIPTION_PLANS).sort(([a], [b]) => Number(a) - Number(b));

export const BusinessSubscriptionSettings: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState<any>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showPlanPicker, setShowPlanPicker] = useState(false);
    const [purchaseLoading, setPurchaseLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        fetchSubscription();
    }, []);

    const fetchSubscription = async () => {
        try {
            const ownerId = localStorage.getItem('ownerId');
            if (!ownerId) return;
            const res = await api.get(`/subscription/owner/${ownerId}`);
            setSubscription(res.data);
        } catch {
            setSubscription(null);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (text: string, type: 'success' | 'error') => {
        setToastMsg({ text, type });
        setTimeout(() => setToastMsg(null), 3000);
    };

    const handleSelectPlan = async (planType: string) => {
        setShowPlanPicker(false);
        setPurchaseLoading(true);
        try {
            const rcId = await purchasePlan(planType);
            if (rcId) {
                showToast('Aboneliğiniz başarıyla güncellendi.', 'success');
                fetchSubscription();
            }
        } catch (error: any) {
            showToast(error?.message || 'Satın alma işlemi başarısız oldu.', 'error');
        } finally {
            setPurchaseLoading(false);
        }
    };

    const handleCancelSubscription = async () => {
        const platform = Capacitor.getPlatform();
        const url = platform === 'ios'
            ? 'itms-apps://apps.apple.com/account/subscriptions'
            : 'https://play.google.com/store/account/subscriptions';
        if (Capacitor.isNativePlatform()) {
            await Browser.open({ url });
        } else {
            window.open(url, '_blank');
        }
    };

    const handleDeleteAccount = async () => {
        setDeleteLoading(true);
        setErrorMsg('');
        try {
            await api.delete('/business-owner/account');
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('ownerId');
            navigate('/business/login');
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'Hesap silinirken bir hata oluştu.';
            setErrorMsg(msg);
            setShowDeleteConfirm(false);
        } finally {
            setDeleteLoading(false);
        }
    };

    const getPlanLabel = (type: string) => {
        if (!type) return 'Plan Yok';
        const planObj = Object.values(SUBSCRIPTION_PLANS).find(p => p.planType === type);
        return planObj ? planObj.label : type;
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'active': return 'Aktif';
            case 'trial': return 'Deneme Sürümü';
            case 'expired': return 'Süresi Doldu';
            case 'cancelled': return 'İptal Edildi';
            default: return 'Bilinmiyor';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            case 'trial': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
            default: return 'text-red-400 bg-red-400/10 border-red-400/20';
        }
    };

    const isExpiredOrCancelled = subscription?.status === 'expired' || subscription?.status === 'cancelled';

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-24">
            {/* Header */}
            <div className="bg-slate-800 p-4 sticky top-0 z-10 border-b border-slate-700 shadow-lg flex items-center gap-3">
                <button
                    onClick={() => navigate('/business/settings')}
                    className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                    <h1 className="font-sport font-bold text-xl text-white">Abonelik & Planlar</h1>
                    <p className="text-xs text-slate-400">Abonelik durumunuzu ve planınızı yönetin</p>
                </div>
            </div>

            {/* Toast */}
            {toastMsg && (
                <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl flex items-center gap-2.5 shadow-xl border whitespace-nowrap ${
                    toastMsg.type === 'success'
                        ? 'bg-green-500/10 border-green-500/50 text-green-400'
                        : 'bg-red-500/10 border-red-500/50 text-red-400'
                }`}>
                    {toastMsg.type === 'success'
                        ? <CheckCircle className="w-4 h-4 shrink-0" />
                        : <XCircle className="w-4 h-4 shrink-0" />}
                    <p className="font-bold text-sm">{toastMsg.text}</p>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center p-20">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
            ) : (
                <div className="p-4 space-y-4">
                    {errorMsg && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
                            <ShieldAlert className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-red-500 font-bold">İşlem Engellendi</h3>
                                <p className="text-sm text-red-400 mt-1">{errorMsg}</p>
                            </div>
                        </div>
                    )}

                    {!subscription ? (
                        /* ——— Abonelik Yok CTA ——— */
                        <div className="bg-slate-800 border border-orange-500/20 rounded-2xl p-6 text-center shadow-lg">
                            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
                                <Sparkles className="w-8 h-8 text-orange-400" />
                            </div>
                            <h2 className="font-bold text-xl text-white mb-2">Henüz Aboneliğiniz Yok</h2>
                            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                İşletmenizi yayına almak için bir plan seçin.{'\n'}
                                <span className="text-orange-400 font-semibold">90 gün ücretsiz deneme</span> ile hemen başlayın.
                            </p>
                            <button
                                onClick={() => setShowPlanPicker(true)}
                                disabled={purchaseLoading}
                                className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                            >
                                {purchaseLoading
                                    ? <Loader2 className="w-5 h-5 animate-spin" />
                                    : <Star className="w-5 h-5" />}
                                {purchaseLoading ? 'İşleniyor...' : 'Plan Seç ve Başla'}
                            </button>
                        </div>
                    ) : (
                        /* ——— Mevcut Abonelik Kartı ——— */
                        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-lg shadow-black/20">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                        <CreditCard className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-lg">{getPlanLabel(subscription.planType)} Plan</h2>
                                        <p className="text-slate-400 text-sm">{subscription.pitchCount || 0} Saha Limiti</p>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-lg border text-xs font-bold ${getStatusColor(subscription.status)}`}>
                                    {getStatusText(subscription.status)}
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-slate-700/50">
                                {subscription.trialEndsAt && subscription.status === 'trial' && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Deneme Bitiş:</span>
                                        <span className="text-white font-medium">
                                            {new Date(subscription.trialEndsAt).toLocaleDateString('tr-TR')}
                                        </span>
                                    </div>
                                )}
                                {subscription.pricePerMonth > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Aylık Ücret:</span>
                                        <span className="text-white font-medium">{formatPrice(subscription.pricePerMonth)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ——— Süresi Dolmuş / İptal Uyarısı ——— */}
                    {isExpiredOrCancelled && (
                        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                            <p className="text-red-400 text-sm text-center leading-relaxed">
                                {subscription.status === 'expired'
                                    ? 'Aboneliğinizin süresi doldu. Yeni bir plan satın alarak sahalarınızı yeniden yayına alın.'
                                    : 'Aboneliğiniz iptal edildi. Tekrar abone olmak için aşağıdan plan seçin.'}
                            </p>
                        </div>
                    )}

                    {/* ——— Aksiyon Butonları ——— */}
                    {subscription && (
                        <div className="space-y-3">
                            <button
                                onClick={() => setShowPlanPicker(true)}
                                disabled={purchaseLoading}
                                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                                    isExpiredOrCancelled
                                        ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                                        : 'bg-slate-800 hover:bg-slate-700 border border-emerald-500/30 text-emerald-400'
                                }`}
                            >
                                {purchaseLoading
                                    ? <Loader2 className="w-5 h-5 animate-spin" />
                                    : <CreditCard className="w-5 h-5" />}
                                {purchaseLoading
                                    ? 'İşleniyor...'
                                    : isExpiredOrCancelled ? 'Yeniden Abone Ol' : 'Planı Yükselt / Satın Al'}
                            </button>

                            {!isExpiredOrCancelled && (
                                <button
                                    onClick={handleCancelSubscription}
                                    className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 py-3.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Mağaza Üzerinden İptal Et
                                </button>
                            )}
                        </div>
                    )}

                    <div className="border-t border-slate-700/50 pt-2" />

                    {/* ——— Hesap Silme ——— */}
                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
                        <div className="flex items-start gap-4">
                            <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-red-500 text-base">Hesabı Sil</h3>
                                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                                    İşletme hesabınızı tamamen kapatır. Tüm saha, ayar ve işletme bilgileriniz kalıcı olarak silinir.
                                </p>
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    disabled={deleteLoading}
                                    className="mt-4 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 active:scale-95 text-red-500 border border-red-500/30 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                                >
                                    {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {deleteLoading ? 'Siliniyor...' : 'Hesabı Sil'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ——— Plan Seçici Bottom Sheet ——— */}
            {showPlanPicker && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 z-40"
                        onClick={() => setShowPlanPicker(false)}
                    />
                    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700 rounded-t-2xl px-4 pt-4 pb-10">
                        <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-4" />
                        <h3 className="font-bold text-lg text-white mb-1">Plan Seçin</h3>
                        <p className="text-slate-400 text-sm mb-4">İşletmenize uygun planı seçin</p>
                        <div className="space-y-2">
                            {PLAN_ENTRIES.map(([key, plan]) => {
                                const isCurrentPlan = subscription?.planType === plan.planType;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => handleSelectPlan(plan.planType)}
                                        disabled={purchaseLoading}
                                        className={`w-full flex items-center justify-between px-4 py-4 rounded-xl border transition-all active:scale-95 ${
                                            isCurrentPlan
                                                ? 'bg-emerald-500/10 border-emerald-500/40'
                                                : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                                        }`}
                                    >
                                        <div className="text-left">
                                            <p className={`font-bold ${isCurrentPlan ? 'text-emerald-400' : 'text-white'}`}>
                                                {plan.label}
                                                {isCurrentPlan && <span className="ml-2 text-xs font-normal text-emerald-500">Mevcut Plan</span>}
                                            </p>
                                            <p className="text-slate-400 text-sm">{key} saha limiti</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-emerald-400 font-bold">{formatPrice(plan.price)}</span>
                                            <ChevronRight className="w-4 h-4 text-slate-500" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDeleteAccount}
                title="İşletme Hesabını Sil"
                message="Tüm işletme, saha ve abonelik verileriniz kalıcı olarak silinecektir. Bu işlem geri alınamaz. Onaylıyor musunuz?"
                confirmText={deleteLoading ? 'Siliniyor...' : 'Evet, Hesabı Sil'}
                cancelText="Vazgeç"
                isDangerous={true}
            />

            <BusinessNavbar />
        </div>
    );
};
