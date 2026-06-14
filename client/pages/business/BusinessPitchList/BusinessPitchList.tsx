import React from 'react';
import { Goal, Clock, AlertTriangle, Plus, CheckCircle, XCircle } from 'lucide-react';
import { BusinessLoadingSpinner } from '../../../components/Business/BusinessLoadingSpinner';

// Hooks
import { useBusinessPitchList } from './hooks/useBusinessPitchList';

// Components
import { PitchListHeader } from './components/PitchListHeader';
import { PitchListItem } from './components/PitchListItem';
import { AddPitchModal } from './components/AddPitchModal';

export const BusinessPitchList: React.FC = () => {
    const {
        navigate,
        loading,
        pitches,
        subscription,
        businessStatus,
        canAddPitch,
        toast,
        showAddPitchModal,
        newPitchData,
        setNewPitchData,
        isTimePickerOpen,
        setIsTimePickerOpen,
        tempSlot,
        setTempSlot,
        adding,
        openAddPitchModal,
        closeAddPitchModal,
        submitNewPitch,
        toggleFacility,
        addTimeSlot,
        removeTimeSlot,
    } = useBusinessPitchList();

    if (loading) return <BusinessLoadingSpinner fullScreen />;

    const isPending = businessStatus === 'pending';
    const isSuspended = businessStatus === 'suspended';

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <PitchListHeader
                navigate={navigate}
                pitchCount={pitches.length}
                subscription={subscription}
            />

            <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                <div className="p-4 space-y-3" style={{ minHeight: 'calc(100% + 1px)' }}>
                    {isSuspended && (
                        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 px-4 py-3.5 rounded-2xl">
                            <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={18} />
                            <div className="space-y-0.5">
                                <p className="text-red-300 text-[clamp(12px,3.5vw,14px)] font-bold">İşletmeniz Askıya Alındı</p>
                                <p className="text-red-200/70 text-[clamp(10px,2.8vw,12px)] leading-relaxed">
                                    Hesabınız yönetim ekibimiz tarafından askıya alınmıştır. Sahalarınız pasif durumdadır ve gösterilmemektedir.
                                </p>
                            </div>
                        </div>
                    )}

                    {isPending && (
                        <div className="flex items-start gap-3 bg-orange-500/10 border border-orange-500/30 px-4 py-3.5 rounded-2xl">
                            <Clock className="text-orange-400 shrink-0 mt-0.5" size={18} />
                            <div className="space-y-0.5">
                                <p className="text-orange-300 text-sm font-bold">Sahalarınız İnceleme Aşamasında</p>
                                <p className="text-orange-200/70 text-xs leading-relaxed">
                                    Sahalarınız onaylandığında işletmeniz yayına alınacak ve rezervasyon almaya başlayabileceksiniz. Onay süreci 1-2 iş günü sürmektedir.
                                </p>
                            </div>
                        </div>
                    )}

                    {pitches.map((pitch) => (
                        <PitchListItem
                            key={pitch.id}
                            pitch={pitch}
                            isPending={isPending}
                            isSuspended={isSuspended}
                            onClick={() => navigate(`/business/settings/pitches/${pitch.id}`)}
                        />
                    ))}

                    {pitches.length === 0 && (
                        <div className="text-center py-10 text-slate-500">
                            <Goal className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Henüz saha oluşturulmamış.</p>
                            <p className="text-xs text-slate-600 mt-1">Sahalar kayıt sırasında abonelik planınıza göre oluşturulur.</p>
                        </div>
                    )}

                    {canAddPitch && !isSuspended && (
                        <button
                            onClick={openAddPitchModal}
                            className="w-full flex items-center justify-center gap-2 border border-dashed border-emerald-500/40 text-emerald-400 rounded-2xl py-3.5 font-bold text-sm hover:bg-emerald-500/5 active:scale-[0.98] transition-all"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                            <Plus className="w-4 h-4" />
                            Yeni Saha Ekle
                        </button>
                    )}
                </div>
            </div>

            {showAddPitchModal && (
                <AddPitchModal
                    newPitchData={newPitchData}
                    setNewPitchData={setNewPitchData}
                    isTimePickerOpen={isTimePickerOpen}
                    setIsTimePickerOpen={setIsTimePickerOpen}
                    tempSlot={tempSlot}
                    setTempSlot={setTempSlot}
                    adding={adding}
                    onClose={closeAddPitchModal}
                    onSubmit={submitNewPitch}
                    toggleFacility={toggleFacility}
                    addTimeSlot={addTimeSlot}
                    removeTimeSlot={removeTimeSlot}
                />
            )}

            {toast && (
                <div
                    className={`fixed top-16 left-4 right-4 z-50 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl border
                        ${toast.type === 'success' ? 'bg-green-900/90 border-green-500/40 text-green-300' : 'bg-red-900/90 border-red-500/40 text-red-300'}`}
                >
                    {toast.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
                    <p className="font-semibold text-sm">{toast.text}</p>
                </div>
            )}

        </div>
    );
};
