import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BusinessNavbar } from '../../../components/Business/BusinessNavbar';
import { ConfirmModal } from '../../../components/Modals/ConfirmModal';
import { SuccessModal } from '../../../components/Modals/SuccessModal';
import { BusinessDateFilterModal } from './components/BusinessDateFilterModal';
import { BusinessLoadingSpinner } from '../../../components/Business/BusinessLoadingSpinner';

// Hooks
import { useBusinessDashboard } from './hooks/useBusinessDashboard';

// Components
import { DashboardHeader } from './components/DashboardHeader';
import { PitchGrid } from './components/PitchGrid';
import { SlotDetailModal } from './components/SlotDetailModal';
import { DashboardActionModals } from './components/DashboardActionModals';

export const BusinessDashboard: React.FC = () => {
    const navigate = useNavigate();
    const {
        selectedDate,
        setSelectedDate,
        dashboardData,
        subscription,
        loading,
        selectedSlot,
        setSelectedSlot,
        showDatePicker,
        setShowDatePicker,
        note,
        setNote,
        actionType,
        setActionType,
        targetReservationId,
        setTargetReservationId,
        successModal,
        setSuccessModal,
        confirmModal,
        setConfirmModal,
        cancelReservationId,
        setCancelReservationId,
        isPastSlot,
        openActionModal,
        handleCancelClick,
        handleConfirmCancel,
        handleAcceptCancelRequest,
        handleRejectCancelRequest,
        handleTransaction,
        handleManualFillSlot
    } = useBusinessDashboard();

    if (loading) return <BusinessLoadingSpinner fullScreen />;
    if (!dashboardData) return <div className="min-h-screen bg-slate-800 flex items-center justify-center text-white font-bold italic">Veri bulunamadı.</div>;

    const hasActiveSubscription = subscription && ['active', 'trial'].includes(subscription.status);

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-32">
            {/* Header */}
            <DashboardHeader
                businessName={dashboardData.businessName}
                selectedDate={selectedDate}
                setShowDatePicker={setShowDatePicker}
                navigate={navigate}
            />

            {/* Pitches & Slots */}
            {hasActiveSubscription ? (
                <PitchGrid
                    pitches={dashboardData.pitches}
                    selectedDate={selectedDate}
                    isPastSlot={isPastSlot}
                    setSelectedSlot={setSelectedSlot}
                />
            ) : (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-6">
                        <svg className="w-10 h-10 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-3">Abonelik Gerekli</h2>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-xs">
                        Sahalarınızı yayına almak ve rezervasyon almak için aktif bir aboneliğe ihtiyacınız var.
                    </p>
                    <button
                        onClick={() => navigate('/business/settings/subscription')}
                        className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-lg shadow-orange-500/25 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                        </svg>
                        Plan Seç ve Başla
                    </button>
                    <p className="text-slate-500 text-xs mt-4">90 gün ücretsiz deneme süresi</p>
                </div>
            )}

            {/* Modal for Slot Details */}
            <SlotDetailModal
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                setSelectedSlot={setSelectedSlot}
                handleAcceptCancelRequest={handleAcceptCancelRequest}
                handleRejectCancelRequest={handleRejectCancelRequest}
                openActionModal={openActionModal}
                handleCancelClick={handleCancelClick}
                handleManualFillSlot={handleManualFillSlot}
            />

            {/* General Action Modal (Approve or Note) */}
            <DashboardActionModals
                targetReservationId={targetReservationId}
                actionType={actionType}
                note={note}
                setNote={setNote}
                setTargetReservationId={setTargetReservationId}
                setActionType={setActionType}
                handleTransaction={handleTransaction}
            />

            {/* Cancel Match Confirmation */}
            <ConfirmModal
                isOpen={!!cancelReservationId}
                onClose={() => setCancelReservationId(null)}
                onConfirm={handleConfirmCancel}
                title="Onayı Geri Al"
                message="Bu kesinleşmiş maçın onayını geri almak istediğinize emin misiniz? Maç onay bekliyor durumuna dönecek ve takımlara bildirilecektir."
                confirmText="Evet, Onayı Geri Al"
                cancelText="Vazgeç"
                isDangerous={true}
            />

            {/* Generic State-Driven Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDangerous={confirmModal.isDangerous}
                confirmText={confirmModal.confirmText}
                cancelText={confirmModal.cancelText || "Vazgeç"}
                accentColor="orange"
            />

            {/* Success Modal */}
            <SuccessModal
                isOpen={successModal.isOpen}
                onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
                message={successModal.message}
                type={successModal.type}
            />

            {/* Date Selection Modal */}
            <BusinessDateFilterModal
                isOpen={showDatePicker}
                onClose={() => setShowDatePicker(false)}
                onSelect={(date) => setSelectedDate(date)}
                selectedDate={selectedDate}
            />

            {/* Business Navbar */}
            <BusinessNavbar />
        </div>
    );
};
