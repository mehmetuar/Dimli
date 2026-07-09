import React from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useBusinessSubscriptionSettings } from './hooks/useBusinessSubscriptionSettings';
import { ToastBanner } from './components/ToastBanner';
import { NoSubscriptionCTA } from './components/NoSubscriptionCTA';
import { SubscriptionCard } from './components/SubscriptionCard';
import { PendingDowngradeBanner } from './components/PendingDowngradeBanner';
import { InactiveStatusWarning } from './components/InactiveStatusWarning';
import { SubscriptionActionButtons } from './components/SubscriptionActionButtons';
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
        requiredRemovalCount,
        effectiveDateLabel,
        pendingPlanInfo,
        downgradeTargetPlan,
    } = useBusinessSubscriptionSettings();

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {/* header */}
            <div className="bg-slate-900/95 backdrop-blur-md z-20 border-b border-slate-800 px-4 py-4 flex items-center gap-3">
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
                                <PendingDowngradeBanner
                                    subscription={subscription}
                                    pendingPlanInfo={pendingPlanInfo}
                                    scheduledPitchNames={pitches
                                        .filter((p: any) => p.scheduledDeletionAt)
                                        .map((p: any) => p.name)}
                                />
                                <InactiveStatusWarning status={status} />
                                <SubscriptionActionButtons
                                    isExpiredOrCancelled={isExpiredOrCancelled}
                                    isActive={isActive}
                                    purchaseLoading={purchaseLoading}
                                    restoreLoading={restoreLoading}
                                    onOpenPicker={() => setShowPlanPicker(true)}
                                    onRestorePurchases={handleRestorePurchases}
                                />
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
        </div>
    );
};
