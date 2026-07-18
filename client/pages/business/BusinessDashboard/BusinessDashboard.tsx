import React, { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, RefreshCw } from 'lucide-react';
import { BusinessNavbar } from '../../../components/Business/BusinessNavbar';
import { ConfirmModal } from '../../../components/Modals/ConfirmModal';
import { SuccessModal } from '../../../components/Modals/SuccessModal';
import { BusinessDateFilterModal } from './components/BusinessDateFilterModal';
import { BusinessLoadingSpinner } from '../../../components/Business/BusinessLoadingSpinner';
import { OfflineEmptyState } from '../../../components/OfflineEmptyState';

// Hooks
import { useBusinessDashboard } from './hooks/useBusinessDashboard';

// Components
import { DashboardHeader } from './components/DashboardHeader';
import { PitchGrid } from './components/PitchGrid';
import { SlotDetailModal } from './components/SlotDetailModal';
import { AssignSubscriberModal } from './components/AssignSubscriberModal';
import { DashboardActionModals } from './components/DashboardActionModals';

export const BusinessDashboard: React.FC = () => {
    const navigate = useNavigate();
    const {
        selectedDate,
        setSelectedDate,
        focusPitchId,
        dashboardData,
        subscription,
        businessStatus,
        rejectionReason,
        resubmitting,
        handleResubmit,
        loading,
        loadError,
        fetchDashboard,
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
        handleRejectMatchRequest,
        handleTransaction,
        handleManualFillSlot,
        handleRecurringCloseSlot,
        handleRemoveRecurringClosure,
        assignModal,
        openAssignSubscriber,
        closeAssignSubscriber,
        handleSubscriberChanged,
        closureAssignments,
        processing,
        silentRefetch,
        presetNotes,
        savePresetFromNote,
    } = useBusinessDashboard();

    const scrollRef = useRef<HTMLDivElement>(null);
    const touchStartYRef = useRef(0);
    const touchStartScrollRef = useRef(0);
    const triggeredRef = useRef(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [isPullRefreshing, setIsPullRefreshing] = useState(false);
    const PULL_THRESHOLD = 70;

    const onTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        touchStartYRef.current = e.touches[0].clientY;
        touchStartScrollRef.current = scrollRef.current?.scrollTop ?? 0;
        triggeredRef.current = false;
    }, []);

    const onTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (isPullRefreshing || touchStartScrollRef.current > 4) return;
        const delta = e.touches[0].clientY - touchStartYRef.current;
        if (delta > 0) setPullDistance(Math.min(delta * 0.45, 90));
        else setPullDistance(0);
    }, [isPullRefreshing]);

    const onTouchEnd = useCallback(async () => {
        if (pullDistance >= PULL_THRESHOLD && !triggeredRef.current) {
            triggeredRef.current = true;
            setIsPullRefreshing(true);
            try { await silentRefetch(); } finally { setIsPullRefreshing(false); }
        }
        setPullDistance(0);
    }, [pullDistance, silentRefetch]);

    if (loading) return <BusinessLoadingSpinner fullScreen />;
    // Ağ hatası ile gerçek veri yokluğu AYRI: eski tek "Veri bulunamadı" mavi
    // ekranı çevrimdışıda yanıltıcıydı; artık sebep + Tekrar Dene sunulur.
    if (!dashboardData) {
        return (
            <OfflineEmptyState
                accent="orange"
                fullScreen
                onRetry={() => fetchDashboard()}
                {...(loadError !== 'network' && {
                    title: 'Bir sorun oluştu',
                    description: 'Veriler yüklenemedi. Lütfen tekrar deneyin.',
                })}
            />
        );
    }

    const hasActiveSubscription = subscription && ['active', 'trial', 'complimentary'].includes(subscription.status);
    const isPending = businessStatus === 'pending';
    const isSuspended = businessStatus === 'suspended';
    const isRejected = businessStatus === 'rejected';

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {/* Header */}
            <DashboardHeader
                businessName={dashboardData.businessName}
                selectedDate={selectedDate}
                setShowDatePicker={setShowDatePicker}
                navigate={navigate}
            />

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide"
                style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
            {/* Pull-to-refresh — turuncu */}
            <div
                className="flex items-center justify-center overflow-hidden"
                style={{ height: isPullRefreshing ? 56 : pullDistance, transition: isPullRefreshing ? 'none' : 'height 0.2s ease' }}
            >
                {(pullDistance > 0 || isPullRefreshing) && (
                    <RefreshCw
                        className={`w-5 h-5 text-orange-400 ${isPullRefreshing ? 'animate-spin' : ''}`}
                        style={isPullRefreshing ? undefined : { transform: `rotate(${Math.min(pullDistance * 3, 360)}deg)` }}
                    />
                )}
            </div>
            <div className="pb-business-nav">
            {isSuspended ? (
                /* Senaryo 2: Admin tarafından askıya alındı */
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center animate-fade-in">
                    <div className="w-20 h-20 rounded-[28px] bg-red-500/10 border border-red-500/20 backdrop-blur-md flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.15)] relative">
                        <div className="absolute inset-0 rounded-[28px] bg-red-500/5 blur-xl" />
                        <svg className="relative z-10 w-10 h-10 text-red-400 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>
                    <h2 className="text-[clamp(18px,5vw,22px)] font-black text-white mb-3 uppercase italic drop-shadow-sm">İşletmeniz Askıya Alındı</h2>
                    <p className="text-slate-300 text-[clamp(12px,3.5vw,14px)] leading-relaxed mb-8 max-w-xs font-medium">
                        Hesabınız yönetim ekibimiz tarafından askıya alınmıştır. Daha fazla bilgi almak için lütfen destek ekibimizle iletişime geçin.
                    </p>
                    <div className="w-full max-w-xs bg-slate-800/80 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-4 text-left space-y-2 shadow-lg">
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Destek</p>
                        <p className="text-white font-bold text-sm drop-shadow-sm">destek@dimli.app</p>
                    </div>
                </div>
            ) : isRejected ? (
                /* Senaryo 3: Başvuru reddedildi — düzelt ve tekrar onaya gönder */
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center animate-fade-in">
                    <div className="w-20 h-20 rounded-[28px] bg-red-500/10 border border-red-500/20 backdrop-blur-md flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.15)] relative">
                        <div className="absolute inset-0 rounded-[28px] bg-red-500/5 blur-xl" />
                        <svg className="relative z-10 w-10 h-10 text-red-400 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>
                    <h2 className="text-[clamp(18px,5vw,22px)] font-black text-white mb-3 uppercase italic drop-shadow-sm">Başvurunuz Reddedildi</h2>
                    <p className="text-slate-300 text-[clamp(12px,3.5vw,14px)] leading-relaxed mb-6 max-w-xs font-medium">
                        İşletme başvurunuz yönetim ekibimiz tarafından reddedildi. Lütfen aşağıdaki düzeltmeleri yapıp tekrar onaya gönderin.
                    </p>
                    {rejectionReason && (
                        <div className="w-full max-w-xs bg-red-950/40 backdrop-blur-md border border-red-500/20 rounded-2xl px-5 py-4 text-left space-y-1.5 mb-8 shadow-inner shadow-red-500/5">
                            <p className="text-red-400 text-xs font-black uppercase tracking-widest">Red Nedeni</p>
                            <p className="text-red-200 font-semibold text-[clamp(12px,3.5vw,14px)] leading-relaxed">{rejectionReason}</p>
                        </div>
                    )}
                    <div className="w-full max-w-xs flex flex-col gap-3">
                        <button
                            onClick={() => navigate('/business/settings/info')}
                            className="bg-slate-800/80 backdrop-blur-md hover:bg-slate-700 active:scale-95 text-white font-bold px-6 py-3.5 rounded-2xl transition-all border border-white/10 shadow-lg"
                        >
                            İşletme Bilgilerini Düzenle
                        </button>
                        <button
                            onClick={() => navigate('/business/settings/pitches')}
                            className="bg-slate-800/80 backdrop-blur-md hover:bg-slate-700 active:scale-95 text-white font-bold px-6 py-3.5 rounded-2xl transition-all border border-white/10 shadow-lg"
                        >
                            Sahaları Düzenle
                        </button>
                        <button
                            onClick={handleResubmit}
                            disabled={resubmitting}
                            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 active:scale-95 disabled:opacity-60 disabled:active:scale-100 text-white font-bold px-6 py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] flex items-center justify-center gap-2 mt-1 border border-orange-400/50"
                        >
                            {resubmitting ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                                <svg className="w-5 h-5 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            )}
                            {resubmitting ? 'Gönderiliyor...' : 'Tekrar Onaya Gönder'}
                        </button>
                    </div>
                </div>
            ) : !hasActiveSubscription ? (
                /* Senaryo 1: Abonelik süresi doldu */
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center animate-fade-in">
                    <div className="w-20 h-20 rounded-[28px] bg-orange-500/10 border border-orange-500/20 backdrop-blur-md flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(249,115,22,0.15)] relative">
                        <div className="absolute inset-0 rounded-[28px] bg-orange-500/10 blur-xl" />
                        <svg className="relative z-10 w-10 h-10 text-orange-400 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                    </div>
                    <h2 className="text-[clamp(18px,5vw,22px)] font-black text-white mb-3 uppercase italic drop-shadow-sm">Aboneliğiniz Sona Erdi</h2>
                    <p className="text-slate-300 text-[clamp(12px,3.5vw,14px)] leading-relaxed mb-8 max-w-xs font-medium">
                        Sahalarınızı yeniden yayına almak ve rezervasyon almak için aboneliğinizi yenileyin.
                    </p>
                    <button
                        onClick={() => navigate('/business/settings/subscription')}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 active:scale-95 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] flex items-center gap-2 border border-orange-400/50"
                    >
                        <svg className="w-5 h-5 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                        </svg>
                        Plan Seç ve Başla
                    </button>
                    <p className="text-slate-400 font-semibold text-xs mt-4">90 gün ücretsiz deneme süresi</p>
                </div>
            ) : (
                /* Normal dashboard: onay bekliyor banner + PitchGrid */
                <>
                    {isPending && (
                        <div className="mx-4 mt-4 flex items-start gap-3 bg-slate-800/80 backdrop-blur-md border border-orange-500/30 px-4 py-3.5 rounded-2xl shadow-[0_4px_20px_rgba(249,115,22,0.15)] animate-fade-in">
                            <Clock className="text-orange-400 shrink-0 mt-0.5 drop-shadow-md" size={20} />
                            <div className="space-y-1">
                                <p className="text-orange-300 text-[clamp(12px,3.5vw,14px)] font-black uppercase tracking-wide">İşletmeniz Onay Bekliyor</p>
                                <p className="text-slate-300 text-[clamp(11px,2.8vw,12px)] leading-relaxed font-medium">
                                    Sahalarınız onaylandığında işletmeniz yayına alınacak ve rezervasyon almaya başlayabileceksiniz. Onay süreci 1-2 iş günü sürmektedir.
                                </p>
                            </div>
                        </div>
                    )}
                    <PitchGrid
                        pitches={dashboardData.pitches}
                        selectedDate={selectedDate}
                        isPastSlot={isPastSlot}
                        setSelectedSlot={setSelectedSlot}
                        isPending={isPending}
                        focusPitchId={focusPitchId}
                    />
                </>
            )}
            </div>
            </div>

            {/* Modal for Slot Details */}
            <SlotDetailModal
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                setSelectedSlot={setSelectedSlot}
                handleAcceptCancelRequest={handleAcceptCancelRequest}
                handleRejectCancelRequest={handleRejectCancelRequest}
                openActionModal={openActionModal}
                handleCancelClick={handleCancelClick}
                handleRejectMatchRequest={handleRejectMatchRequest}
                handleManualFillSlot={handleManualFillSlot}
                handleRecurringCloseSlot={handleRecurringCloseSlot}
                handleRemoveRecurringClosure={handleRemoveRecurringClosure}
                closureAssignments={closureAssignments}
                openAssignSubscriber={openAssignSubscriber}
            />

            {/* Abone takım atama/yönetme (sabit kapatma → abone chat'i) */}
            <AssignSubscriberModal
                isOpen={assignModal.isOpen}
                closureId={assignModal.closureId}
                pitchId={assignModal.pitchId}
                dayLabel={assignModal.dayLabel}
                timeLabel={assignModal.timeLabel}
                onClose={closeAssignSubscriber}
                onChanged={handleSubscriberChanged}
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
                processing={processing}
                presetNotes={presetNotes}
                savePresetFromNote={savePresetFromNote}
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
            <BusinessNavbar hidden={showDatePicker} />
        </div>
    );
};
