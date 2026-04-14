import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BusinessNavbar } from '../../../components/Business/BusinessNavbar';
import { ConfirmModal } from '../../../components/Modals/ConfirmModal';
import { SuccessModal } from '../../../components/Modals/SuccessModal';
import { DateSelectionModal } from '../../../components/Modals/DateSelectionModal';
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
    if (!dashboardData) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-bold italic">Veri bulunamadı.</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white pb-24">
            {/* Header */}
            <DashboardHeader
                businessName={dashboardData.businessName}
                selectedDate={selectedDate}
                setShowDatePicker={setShowDatePicker}
                navigate={navigate}
            />

            {/* Pitches & Slots */}
            <PitchGrid
                pitches={dashboardData.pitches}
                selectedDate={selectedDate}
                isPastSlot={isPastSlot}
                setSelectedSlot={setSelectedSlot}
            />

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
            />

            {/* Success Modal */}
            <SuccessModal
                isOpen={successModal.isOpen}
                onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
                message={successModal.message}
                type={successModal.type}
            />

            {/* Date Selection Modal */}
            <DateSelectionModal
                isOpen={showDatePicker}
                onClose={() => setShowDatePicker(false)}
                onSelect={(date) => setSelectedDate(date)}
                selectedDate={selectedDate}
                allowPastDates={true}
            />

            {/* Business Navbar */}
            <BusinessNavbar />
        </div>
    );
};
