import React from 'react';
import { ArrowLeft, Loader2, CreditCard } from 'lucide-react';
import { CorporateGridBackground } from '../../../components/UI/CorporateGridBackground';
import { useBusinessSubscriptionSettings } from './hooks/useBusinessSubscriptionSettings';
import { ToastBanner } from './components/ToastBanner';
import { NoSubscriptionCTA } from './components/NoSubscriptionCTA';
import { SubscriptionCard } from './components/SubscriptionCard';
import { PendingDowngradeBanner } from './components/PendingDowngradeBanner';
import { InactiveStatusWarning } from './components/InactiveStatusWarning';
import { SubscriptionActionButtons } from './components/SubscriptionActionButtons';
import { PromoCodeRedeemSection } from './components/PromoCodeRedeemSection';
import { ComplimentaryExpiryBanner } from './components/ComplimentaryExpiryBanner';
import { StoreCancelPromptModal } from './components/StoreCancelPromptModal';
import { PromoCodeModal } from '../../../components/Modals/PromoCodeModal';
import { DeleteAccountSection } from './components/DeleteAccountSection';
import { PlanPickerModal } from './components/PlanPickerModal';
import { DeleteModal } from './components/DeleteModal';
import { NewPitchPromptModal } from './components/NewPitchPromptModal';
import { PitchSelectionModal } from './components/PitchSelectionModal';
import { DowngradeConfirmModal } from './components/DowngradeConfirmModal';

export const BusinessSubscriptionSettings: React.FC = () => {
    const {
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
        requiredRemovalCount,
        effectiveDateLabel,
        pendingPlanInfo,
        downgradeTargetPlan,
    } = useBusinessSubscriptionSettings();

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {/* header — diğer işletme sayfaları ile aynı premium desen (InfoSettingsHeader) */}
            <div
                className="relative shrink-0 px-4 pt-4 pb-5 border-b border-orange-500/10 overflow-hidden"
                style={{ background: 'radial-gradient(circle at top right, #1e293b 0%, #0f172a 100%)', boxShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
            >
                <CorporateGridBackground />
                <div className="relative z-10 flex items-center gap-3">
                    <button
                        onClick={() => navigate('/business/settings')}
                        className="w-10 h-10 bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0 shadow-lg"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-11 h-11 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(249,115,22,0.15)] relative">
                        <div className="absolute inset-0 rounded-xl bg-orange-400/10 blur-md" />
                        <CreditCard className="relative z-10 w-5 h-5 text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="font-black text-white text-[clamp(18px,5vw,22px)] leading-tight truncate drop-shadow-sm">Abonelik & Planlar</h1>
                        <p className="text-[clamp(11px,3vw,13px)] text-slate-400 font-medium truncate">Abonelik durumunuzu yönetin</p>
                    </div>
                </div>
            </div>

            <ToastBanner toast={toast} />

            {/* content */}
            <div
                className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide"
                style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            >
                {loading ? (
                    <div className="flex items-center justify-center py-32">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                ) : (
                    <div className="px-4 py-5 space-y-4" style={{ minHeight: 'calc(100% + 1px)' }}>
                        {!subscription && (
                            <NoSubscriptionCTA
                                purchaseLoading={purchaseLoading}
                                onOpenPicker={() => setShowPlanPicker(true)}
                            />
                        )}

                        {subscription && (
                            <>
                                <SubscriptionCard
                                    subscription={subscription}
                                    planLabel={planLabel}
                                    status={status}
                                    statusLabel={statusLabel}
                                    statusColor={statusColor}
                                />
                                <ComplimentaryExpiryBanner
                                    subscription={subscription}
                                    purchaseLoading={purchaseLoading}
                                    onBuy={handleBuyCurrentPlan}
                                />
                                <PendingDowngradeBanner
                                    subscription={subscription}
                                    pendingPlanInfo={pendingPlanInfo}
                                    scheduledPitchNames={pitches
                                        .filter((p: any) => p.scheduledDeletionAt)
                                        .map((p: any) => p.name)}
                                />
                                <InactiveStatusWarning status={status} />

                                {/* Davetli üyelik + hâlâ bağlı mağaza aboneliği → kalıcı iptal hatırlatması */}
                                {showStoreCancelReminder && (
                                    <button
                                        onClick={() => setShowStoreCancelModal(true)}
                                        className="w-full text-left bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 text-amber-200 text-xs font-medium leading-relaxed"
                                    >
                                        Mağaza aboneliğin devam ediyor olabilir — bir sonraki dönemde
                                        ücretlendirilmemek için iptal etmek üzere dokun.
                                    </button>
                                )}

                                <SubscriptionActionButtons
                                    isExpiredOrCancelled={isExpiredOrCancelled}
                                    isActive={isActive}
                                    purchaseLoading={purchaseLoading}
                                    restoreLoading={restoreLoading}
                                    onOpenPicker={() => setShowPlanPicker(true)}
                                    onRestorePurchases={handleRestorePurchases}
                                />

                                {/* Davet kodu girişi — davetli üyelik dışındaki tüm durumlarda */}
                                {!isComplimentary && (
                                    <PromoCodeRedeemSection onOpen={openPromoModal} />
                                )}
                            </>
                        )}

                        <DeleteAccountSection onOpenDelete={() => setShowDeleteModal(true)} />
                    </div>
                )}
            </div>

            {/* modals */}
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

            <NewPitchPromptModal
                visible={showNewPitchPrompt}
                onClose={() => setShowNewPitchPrompt(false)}
                onConfirm={() => {
                    setShowNewPitchPrompt(false);
                    navigate('/business/settings/pitches');
                }}
            />

            <PitchSelectionModal
                visible={showPitchSelection}
                pitches={pitches.filter((p: any) => p.approvalStatus !== 'rejected')}
                requiredCount={requiredRemovalCount}
                effectiveDateLabel={effectiveDateLabel}
                loading={selectionLoading}
                conflict={selectionConflict}
                onClose={() => {
                    setShowPitchSelection(false);
                    setDowngradeTarget(null);
                    setSelectionConflict(null);
                    downgradePurchaseRef.current = null;
                }}
                onConfirm={handlePitchSelectionConfirm}
            />

            <DowngradeConfirmModal
                visible={showDowngradeConfirm}
                targetPlanLabel={downgradeTargetPlan?.label ?? ''}
                targetPlanPrice={downgradeTargetPlan?.price ?? 0}
                effectiveDateLabel={effectiveDateLabel}
                removalCount={requiredRemovalCount}
                loading={downgradeLoading}
                onClose={() => {
                    setShowDowngradeConfirm(false);
                    setDowngradeTarget(null);
                    downgradePurchaseRef.current = null;
                }}
                onConfirm={handleDowngradeConfirm}
            />

            <PromoCodeModal
                isOpen={showPromoModal}
                onClose={() => setShowPromoModal(false)}
                code={promoCode}
                setCode={setPromoCode}
                loading={promoRedeemLoading}
                error={promoError}
                onSubmit={handleRedeemPromo}
            />

            <StoreCancelPromptModal
                visible={showStoreCancelModal}
                onClose={() => setShowStoreCancelModal(false)}
            />
        </div>
    );
};
