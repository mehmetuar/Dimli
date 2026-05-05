import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, ShieldAlert, Trash2, Loader2 } from 'lucide-react';
import { BusinessNavbar } from '../../../components/Business/BusinessNavbar';
import { ConfirmModal } from '../../../components/Modals/ConfirmModal';
import api from '../../../services/api';
import { purchasePlan } from '../../../services/revenuecatService';
import { SUBSCRIPTION_PLANS } from '../BusinessRegister/hooks/useBusinessRegister';

export const BusinessSubscriptionSettings: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState<any>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        fetchSubscription();
    }, []);

    const fetchSubscription = async () => {
        try {
            const ownerId = localStorage.getItem('ownerId');
            if (!ownerId) return;
            const res = await api.get(`/subscription/owner/${ownerId}`);
            setSubscription(res.data);
        } catch (error) {
            console.error('Abonelik bilgisi alınamadı', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async () => {
        try {
            // Basitçe plan 5'e yükseltme senaryosu (veya farklı bir akış yapılabilir)
            // Daha gelişmiş bir yapıda plan seçtirme modalı açılabilirdi.
            // Şimdilik en yüksek plana yükseltme işlemi simüle edilecek veya RevenueCat çağrılacak.
            const rcId = await purchasePlan('5plus_pitch');
            if (rcId) {
                alert('Aboneliğiniz başarıyla güncellendi.');
                fetchSubscription(); // Güncel durumu çek
            }
        } catch (error: any) {
            alert(error?.message || 'Satın alma işlemi başarısız oldu.');
        }
    };

    const handleDeleteAccount = async () => {
        setDeleteLoading(true);
        setErrorMsg('');
        try {
            await api.delete('/business-owner/account');
            // Çıkış yap ve login sayfasına yönlendir
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('ownerId');
            navigate('/business/login');
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'Hesap silinirken bir hata oluştu.';
            setErrorMsg(msg);
            setShowDeleteConfirm(false); // Modal kapat, hata mesajını sayfada göster
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

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-24">
            {/* Header */}
            <div className="bg-slate-800 p-4 sticky top-0 z-10 border-b border-slate-700 shadow-lg flex items-center gap-3">
                <button onClick={() => navigate('/business/settings')} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                    <h1 className="font-sport font-bold text-xl text-white">Abonelik & Planlar</h1>
                    <p className="text-xs text-slate-400">Abonelik durumunuzu ve planınızı yönetin</p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-20">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
            ) : (
                <div className="p-4 space-y-6">
                    {errorMsg && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
                            <ShieldAlert className="w-6 h-6 text-red-500 shrink-0" />
                            <div>
                                <h3 className="text-red-500 font-bold">İşlem Engellendi</h3>
                                <p className="text-sm text-red-400 mt-1">{errorMsg}</p>
                            </div>
                        </div>
                    )}

                    {/* Abonelik Detayı */}
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-lg shadow-black/20">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                    <CreditCard className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-lg">{getPlanLabel(subscription?.planType)} Plan</h2>
                                    <p className="text-slate-400 text-sm">{subscription?.pitchCount || 0} Saha Limiti</p>
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-lg border text-xs font-bold ${getStatusColor(subscription?.status)}`}>
                                {getStatusText(subscription?.status)}
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-700/50">
                            {subscription?.trialEndsAt && subscription.status === 'trial' && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Deneme Bitiş:</span>
                                    <span className="text-white font-medium">
                                        {new Date(subscription.trialEndsAt).toLocaleDateString('tr-TR')}
                                    </span>
                                </div>
                            )}
                            {subscription?.pricePerMonth > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Aylık Ücret:</span>
                                    <span className="text-white font-medium">{subscription.pricePerMonth} TL</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Aksiyonlar */}
                    <div className="space-y-4">
                        <button
                            onClick={handleUpgrade}
                            className="w-full bg-slate-800 hover:bg-slate-700 border border-emerald-500/30 text-emerald-400 py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            <CreditCard className="w-5 h-5" />
                            Planı Yükselt / Satın Al
                        </button>
                        <p className="text-xs text-center text-slate-500 px-4">
                            Aboneliğinizi Apple App Store veya Google Play Store üzerinden iptal edebilirsiniz.
                        </p>
                    </div>

                    <div className="border-t border-slate-700 my-6"></div>

                    {/* Hesap Silme */}
                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-red-500 text-lg">Hesabı Sil</h3>
                                <p className="text-sm text-slate-400 mt-1">
                                    İşletme hesabınızı tamamen kapatır. Tüm saha, ayar ve işletme bilgileriniz kalıcı olarak silinir.
                                </p>
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="mt-4 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                                    disabled={deleteLoading}
                                >
                                    {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {deleteLoading ? 'Siliniyor...' : 'Hesabı Sil'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDeleteAccount}
                title="İşletme Hesabını Sil"
                message="Tüm işletme, saha ve abonelik verileriniz kalıcı olarak silinecektir. Bu işlem geri alınamaz. Onaylıyor musunuz?"
                confirmText={deleteLoading ? "Siliniyor..." : "Evet, Hesabı Sil"}
                cancelText="Vazgeç"
                isDangerous={true}
            />

            <BusinessNavbar />
        </div>
    );
};
