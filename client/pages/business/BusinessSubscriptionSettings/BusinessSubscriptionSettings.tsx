import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, CreditCard, Trash2, Loader2, CheckCircle, XCircle,
    Star, ExternalLink, ChevronRight, Sparkles, Lock, X, Eye, EyeOff,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { BusinessNavbar } from '../../../components/Business/BusinessNavbar';
import api from '../../../services/api';
import { purchasePlan, linkRevenueCatUser } from '../../../services/revenuecatService';
import { SUBSCRIPTION_PLANS } from '../BusinessRegister/hooks/useBusinessRegister';

/* ─── helpers ─── */
const formatPrice = (price: number) =>
    new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(price);

const PLAN_ENTRIES = Object.entries(SUBSCRIPTION_PLANS).sort(
    ([a], [b]) => Number(a) - Number(b),
);

const openStoreSubscriptions = () => {
    const platform = Capacitor.getPlatform();
    const url =
        platform === 'ios'
            ? 'itms-apps://apps.apple.com/account/subscriptions'
            : 'https://play.google.com/store/account/subscriptions';
    // '_system' makes Capacitor hand the URL to the OS (opens App Store / Play Store)
    window.open(url, '_system');
};

/* ─── sub-components ─── */

interface ToastBannerProps {
    toast: { text: string; type: 'success' | 'error' } | null;
}
const ToastBanner: React.FC<ToastBannerProps> = ({ toast }) => {
    if (!toast) return null;
    const ok = toast.type === 'success';
    return (
        <div
            className={`fixed top-16 left-4 right-4 z-50 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl border
                ${ok ? 'bg-green-900/90 border-green-500/40 text-green-300' : 'bg-red-900/90 border-red-500/40 text-red-300'}`}
        >
            {ok ? <CheckCircle className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
            <p className="font-semibold text-sm">{toast.text}</p>
        </div>
    );
};

interface PlanPickerModalProps {
    visible: boolean;
    currentPlanType?: string;
    loading: boolean;
    onClose: () => void;
    onSelect: (planType: string) => void;
}
const PlanPickerModal: React.FC<PlanPickerModalProps> = ({
    visible, currentPlanType, loading, onClose, onSelect,
}) => {
    if (!visible) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 w-full max-w-sm rounded-3xl border border-slate-700 shadow-2xl overflow-hidden">
                {/* header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-700/60">
                    <div>
                        <h3 className="font-bold text-lg text-white">Plan Seçin</h3>
                        <p className="text-slate-400 text-xs mt-0.5">İşletmenize uygun planı seçin</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* plans */}
                <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                    {PLAN_ENTRIES.map(([key, plan]) => {
                        const isCurrent = currentPlanType === plan.planType;
                        return (
                            <button
                                key={key}
                                onClick={() => onSelect(plan.planType)}
                                disabled={loading}
                                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all active:scale-95
                                    ${isCurrent
                                        ? 'bg-emerald-500/10 border-emerald-500/40'
                                        : 'bg-slate-800 border-slate-700/60 hover:border-slate-500'
                                    }`}
                            >
                                <div className="text-left">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold text-sm ${isCurrent ? 'text-emerald-400' : 'text-white'}`}>
                                            {plan.label}
                                        </span>
                                        {isCurrent && (
                                            <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                Mevcut
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-slate-400 text-xs mt-0.5">{key} saha limiti</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className={`font-bold text-sm ${isCurrent ? 'text-emerald-400' : 'text-orange-400'}`}>
                                        {formatPrice(plan.price)}
                                    </span>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* footer note */}
                <div className="px-5 pb-5 pt-2">
                    <p className="text-slate-500 text-xs text-center">
                        Satın alma App Store / Play Store üzerinden gerçekleşir.
                    </p>
                </div>
            </div>
        </div>
    );
};

interface DeleteModalProps {
    visible: boolean;
    loading: boolean;
    onClose: () => void;
    onConfirm: (password: string) => void;
}
const DeleteModal: React.FC<DeleteModalProps> = ({ visible, loading, onClose, onConfirm }) => {
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');

    const handleClose = () => {
        setPassword('');
        setError('');
        onClose();
    };

    const handleSubmit = () => {
        if (!password.trim()) {
            setError('Şifrenizi girin.');
            return;
        }
        setError('');
        onConfirm(password);
    };

    if (!visible) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 w-full max-w-sm rounded-3xl border border-red-500/20 shadow-2xl overflow-hidden">
                {/* icon */}
                <div className="px-6 pt-6 pb-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Hesabı Sil</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Tüm işletme, saha ve verileriniz kalıcı olarak silinecek. Devam etmek için şifrenizi girin.
                    </p>
                </div>

                {/* password input */}
                <div className="px-6 pb-2">
                    <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type={showPw ? 'text' : 'password'}
                            value={password}
                            onChange={e => { setPassword(e.target.value); setError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                            placeholder="Şifrenizi girin"
                            className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl pl-10 pr-10 py-3.5 focus:outline-none focus:border-red-500/50 placeholder:text-slate-500"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPw(v => !v)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                        >
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {error && <p className="text-red-400 text-xs mt-2 pl-1">{error}</p>}
                </div>

                {/* buttons */}
                <div className="flex gap-3 px-6 pt-4 pb-6">
                    <button
                        onClick={handleClose}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {loading ? 'Siliniyor…' : 'Evet, Sil'}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── main component ─── */

export const BusinessSubscriptionSettings: React.FC = () => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState<any>(null);
    const [purchaseLoading, setPurchaseLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showPlanPicker, setShowPlanPicker] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => { fetchSubscription(); }, []);

    const fetchSubscription = async () => {
        setLoading(true);
        try {
            const ownerId = localStorage.getItem('ownerId');
            if (!ownerId) return;
            const res = await api.get(`/subscription/owner/${ownerId}`);
            setSubscription(res.data ?? null);
        } catch {
            setSubscription(null);
        } finally {
            setLoading(false);
        }
    };

    const showToast = (text: string, type: 'success' | 'error') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleSelectPlan = async (planType: string) => {
        setShowPlanPicker(false);
        setPurchaseLoading(true);
        try {
            const rcCustomerId = await purchasePlan(planType);
            const ownerId = localStorage.getItem('ownerId') ?? '';

            // Webhook'tan bağımsız garantili backend güncelleme
            await api.post('/subscription/confirm-purchase', { ownerId, planType, rcCustomerId });

            // RC anonim kullanıcıyı gerçek ownerId ile eşle — gelecek webhook olayları eşleşsin
            await linkRevenueCatUser(ownerId);

            showToast('Aboneliğiniz başarıyla güncellendi.', 'success');
            await fetchSubscription();
        } catch (err: any) {
            showToast(err?.message || 'Satın alma işlemi başarısız oldu.', 'error');
        } finally {
            setPurchaseLoading(false);
        }
    };

    const handleDeleteAccount = async (password: string) => {
        setDeleteLoading(true);
        try {
            await api.delete('/business-owner/account', { data: { password } });
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('ownerId');
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

    /* ── render ── */
    return (
        <div className="pt-safe-top bg-gradient-to-b from-slate-900 to-slate-800 text-white pb-business-nav">
            {/* sticky header */}
            <div className="bg-slate-900/95 backdrop-blur-md sticky top-0 z-20 border-b border-slate-800 px-4 py-4 flex items-center gap-3">
                <button
                    onClick={() => navigate('/business/settings')}
                    className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="font-bold text-lg text-white leading-tight">Abonelik & Planlar</h1>
                    <p className="text-slate-500 text-xs">Abonelik durumunuzu yönetin</p>
                </div>
            </div>

            <ToastBanner toast={toast} />

            {/* ── content ── */}
            {loading ? (
                <div className="flex items-center justify-center py-32">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
            ) : (
                <div className="px-4 py-5 space-y-4">

                    {/* ── NO SUBSCRIPTION ── */}
                    {!subscription && (
                        <div className="bg-slate-800 border border-orange-500/20 rounded-3xl p-6 text-center">
                            <div className="w-18 h-18 mx-auto mb-5 w-20 h-20 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                                <Sparkles className="w-9 h-9 text-orange-400" />
                            </div>
                            <h2 className="font-bold text-xl text-white mb-2">Henüz Aboneliğiniz Yok</h2>
                            <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                İşletmenizi sahalar listesinde göstermek ve rezervasyon almak için bir plan seçin.{' '}
                                <span className="text-orange-400 font-semibold">90 gün ücretsiz deneme</span> ile hemen başlayın.
                            </p>
                            <button
                                onClick={() => setShowPlanPicker(true)}
                                disabled={purchaseLoading}
                                className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2.5"
                            >
                                {purchaseLoading
                                    ? <Loader2 className="w-5 h-5 animate-spin" />
                                    : <Star className="w-5 h-5" />}
                                {purchaseLoading ? 'İşleniyor…' : 'Plan Seç ve Başla'}
                            </button>
                        </div>
                    )}

                    {/* ── HAS SUBSCRIPTION ── */}
                    {subscription && (
                        <>
                            {/* card */}
                            <div className="bg-slate-800 rounded-3xl border border-slate-700 p-5 shadow-lg">
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                            <CreditCard className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{planLabel} Plan</p>
                                            <p className="text-slate-400 text-xs mt-0.5">
                                                {subscription.pitchCount ?? 0} saha limiti
                                            </p>
                                        </div>
                                    </div>
                                    {status === 'trial' ? (
                                        <span className="text-[11px] font-black px-3 py-1.5 rounded-xl shrink-0 tracking-widest uppercase"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(30,27,75,0.92) 100%)',
                                                border: '1px solid rgba(139,92,246,0.5)',
                                                boxShadow: '0 0 14px rgba(139,92,246,0.28), inset 0 1px 0 rgba(255,255,255,0.06)',
                                                color: '#c4b5fd',
                                            }}>
                                            {statusLabel[status]}
                                        </span>
                                    ) : (
                                        <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border shrink-0 ${statusColor[status] ?? 'text-slate-400 bg-slate-700 border-slate-600'}`}>
                                            {statusLabel[status] ?? 'Bilinmiyor'}
                                        </span>
                                    )}
                                </div>

                                <div className="border-t border-slate-700/50 pt-4 space-y-2.5">
                                    {subscription.trialEndsAt && status === 'trial' && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400 text-sm">Deneme bitiş</span>
                                            <span className="text-white text-sm font-medium">
                                                {new Date(subscription.trialEndsAt).toLocaleDateString('tr-TR', {
                                                    day: 'numeric', month: 'long', year: 'numeric',
                                                })}
                                            </span>
                                        </div>
                                    )}
                                    {subscription.expiresAt && status === 'active' && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400 text-sm">Yenileme tarihi</span>
                                            <span className="text-white text-sm font-medium">
                                                {new Date(subscription.expiresAt).toLocaleDateString('tr-TR', {
                                                    day: 'numeric', month: 'long', year: 'numeric',
                                                })}
                                            </span>
                                        </div>
                                    )}
                                    {subscription.pricePerMonth > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400 text-sm">Aylık ücret</span>
                                            <span className="text-white text-sm font-bold">
                                                {formatPrice(Number(subscription.pricePerMonth))}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* warning for inactive */}
                            {isExpiredOrCancelled && (
                                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl px-4 py-3.5">
                                    <p className="text-red-400 text-sm text-center leading-relaxed">
                                        {status === 'expired'
                                            ? 'Aboneliğinizin süresi doldu. Sahalarınız liste dışı — yeni bir plan seçin.'
                                            : 'Aboneliğiniz iptal edildi. Tekrar abone olmak için plan seçin.'}
                                    </p>
                                </div>
                            )}

                            {/* action buttons */}
                            <div className="space-y-3">
                                {/* upgrade / renew */}
                                <button
                                    onClick={() => setShowPlanPicker(true)}
                                    disabled={purchaseLoading}
                                    className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2.5 active:scale-95
                                        ${isExpiredOrCancelled
                                            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                                            : 'bg-slate-800 border border-emerald-500/30 text-emerald-400 hover:bg-slate-700'
                                        }`}
                                >
                                    {purchaseLoading
                                        ? <Loader2 className="w-5 h-5 animate-spin" />
                                        : <CreditCard className="w-5 h-5" />}
                                    {purchaseLoading
                                        ? 'İşleniyor…'
                                        : isExpiredOrCancelled ? 'Yeniden Abone Ol' : 'Planı Yükselt / Satın Al'}
                                </button>

                                {/* cancel via store — only for active subscriptions */}
                                {isActive && (
                                    <button
                                        onClick={openStoreSubscriptions}
                                        className="w-full py-3.5 rounded-2xl font-medium text-sm transition-all bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        {Capacitor.getPlatform() === 'ios'
                                            ? 'App Store\'dan İptal Et'
                                            : 'Play Store\'dan İptal Et'}
                                    </button>
                                )}
                            </div>
                        </>
                    )}

                    {/* ── DELETE ACCOUNT ── */}
                    <div className="mt-2 border-t border-slate-800 pt-4">
                        <div className="bg-red-500/5 border border-red-500/15 rounded-3xl p-5">
                            <div className="flex items-start gap-4">
                                <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                                    <Trash2 className="w-5 h-5 text-red-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-red-400 mb-1">Hesabı Sil</p>
                                    <p className="text-slate-400 text-xs leading-relaxed">
                                        İşletme hesabınızı tamamen kapatır. Tüm saha, rezervasyon ve işletme verileriniz kalıcı olarak silinir. Bu işlem geri alınamaz.
                                    </p>
                                    <button
                                        onClick={() => setShowDeleteModal(true)}
                                        className="mt-3.5 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 active:scale-95 text-red-400 border border-red-500/25 rounded-xl text-sm font-bold transition-all"
                                    >
                                        Hesabı Sil
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── modals ── */}
            <PlanPickerModal
                visible={showPlanPicker}
                currentPlanType={subscription?.planType}
                loading={purchaseLoading}
                onClose={() => setShowPlanPicker(false)}
                onSelect={handleSelectPlan}
            />

            <DeleteModal
                visible={showDeleteModal}
                loading={deleteLoading}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDeleteAccount}
            />

            <BusinessNavbar />
        </div>
    );
};
