import React from 'react';
import { PlusCircle, AlertTriangle } from 'lucide-react';
import { BusinessLoadingSpinner } from '../../../components/Business/BusinessLoadingSpinner';
import { ImageCropModal } from '../../../components/Modals/ImageCropModal';

// Hooks
import { useBusinessAddPitch } from './hooks/useBusinessAddPitch';

// Components
import { AddPitchHeader } from './components/AddPitchHeader';
import { AddPitchBasicInfoForm } from './components/AddPitchBasicInfoForm';
import { AddPitchClosedDaysSection } from './components/AddPitchClosedDaysSection';
import { AddPitchTimeSlotsSection } from './components/AddPitchTimeSlotsSection';
import { AddPitchPhotoSection } from './components/AddPitchPhotoSection';
import { PitchGeneralForm } from '../BusinessPitchSettings/components/PitchGeneralForm';
import { PitchFacilitiesSection } from '../BusinessPitchSettings/components/PitchFacilitiesSection';

export const BusinessAddPitch: React.FC = () => {
    const {
        navigate,
        loading,
        formData,
        allFacilities,
        isTimePickerOpen, setIsTimePickerOpen,
        newSlotStart, setNewSlotStart,
        newSlotEnd, setNewSlotEnd,
        showFacilityModal, setShowFacilityModal,
        newFacility, setNewFacility,
        cropFile, setCropFile,
        uploadingPhoto,
        submitting,
        submitError,
        handleChange,
        toggleFacility,
        toggleClosedDay,
        handleAddSlot,
        handleRemoveSlot,
        handleAddManualFacility,
        handlePhotoFileChange,
        handleCropComplete,
        handleSubmit,
    } = useBusinessAddPitch();

    if (loading) return <BusinessLoadingSpinner fullScreen />;

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <AddPitchHeader navigate={navigate} />

            <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                <div className="p-4 space-y-4 pb-nav">

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <AddPitchBasicInfoForm
                            formData={formData}
                            handleChange={handleChange}
                        />

                        <PitchGeneralForm
                            formData={formData}
                            isTimePickerOpen={isTimePickerOpen}
                            setIsTimePickerOpen={setIsTimePickerOpen}
                            handleChange={handleChange}
                        />

                        <AddPitchClosedDaysSection
                            closedDays={formData.closedDays}
                            onToggleDay={toggleClosedDay}
                        />

                        <AddPitchTimeSlotsSection
                            timeSlots={formData.timeSlots}
                            newSlotStart={newSlotStart}
                            newSlotEnd={newSlotEnd}
                            pitchOpenTime={formData.openTime || undefined}
                            pitchCloseTime={formData.closeTime || undefined}
                            isTimePickerOpen={isTimePickerOpen}
                            setIsTimePickerOpen={setIsTimePickerOpen}
                            setNewSlotStart={setNewSlotStart}
                            setNewSlotEnd={setNewSlotEnd}
                            onAddSlot={handleAddSlot}
                            onRemoveSlot={handleRemoveSlot}
                        />

                        <AddPitchPhotoSection
                            imageUrl={formData.imageUrl}
                            uploadingPhoto={uploadingPhoto}
                            onFileChange={handlePhotoFileChange}
                        />

                        <PitchFacilitiesSection
                            allFacilities={allFacilities}
                            selectedFacilities={formData.facilities}
                            onToggle={toggleFacility}
                            onOpenModal={() => setShowFacilityModal(true)}
                            hasPendingFacility={false}
                        />

                        {submitError && (
                            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 px-4 py-3.5 rounded-2xl">
                                <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={18} />
                                <p className="text-red-300 text-sm font-medium">{submitError}</p>
                            </div>
                        )}

                        <div className="pt-2">
                            <button type="submit" disabled={submitting}
                                className="w-full text-white py-4 rounded-2xl font-black text-[clamp(14px,4vw,16px)] uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-60"
                                style={{
                                    WebkitTapHighlightColor: 'transparent',
                                    background: submitting ? '#334155' : 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                                    boxShadow: submitting ? 'none' : '0 6px 24px rgba(234,88,12,0.3)',
                                }}>
                                <PlusCircle className="w-5 h-5" />
                                {submitting ? 'Oluşturuluyor...' : 'Saha Oluştur'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* ── ImageCrop Modal ── */}
            {cropFile && (
                <ImageCropModal
                    file={cropFile}
                    onCrop={handleCropComplete}
                    onCancel={() => setCropFile(null)}
                />
            )}

            {/* ── Manuel İmkan Ekleme Modalı ── */}
            {showFacilityModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-5">
                    <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-600 shadow-2xl">
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white text-base">Manuel İmkan Ekle</h3>
                                <button
                                    type="button"
                                    onClick={() => { setShowFacilityModal(false); setNewFacility(''); }}
                                    className="text-slate-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>
                            <p className="text-sm text-slate-400 mb-4">
                                Listede olmayan bir imkan eklemek istiyorsanız buraya yazın.
                            </p>
                            <input
                                type="text"
                                value={newFacility}
                                onChange={(e) => setNewFacility(e.target.value)}
                                placeholder="İmkan adı (ör: Çocuk Parkuru)"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 mb-4"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddManualFacility(); } }}
                            />
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowFacilityModal(false); setNewFacility(''); }}
                                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold transition-colors"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddManualFacility}
                                    disabled={!newFacility.trim()}
                                    className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white py-3 rounded-xl font-bold transition-colors"
                                >
                                    Ekle
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
