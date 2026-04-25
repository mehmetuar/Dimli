import React from 'react';
import { Save, Trash2 } from 'lucide-react';
import { BusinessNavbar } from '../../../components/Business/BusinessNavbar';
import { BusinessLoadingSpinner } from '../../../components/Business/BusinessLoadingSpinner';

// Hooks
import { useBusinessPitchSettings } from './hooks/useBusinessPitchSettings';

// Components
import { PitchSettingsHeader } from './components/PitchSettingsHeader';
import { PitchGeneralForm } from './components/PitchGeneralForm';
import { PitchTimeSlotsSection } from './components/PitchTimeSlotsSection';
import { PitchFacilitiesSection } from './components/PitchFacilitiesSection';
import { DeletePitchModal } from './components/DeletePitchModal';

export const BusinessPitchSettings: React.FC = () => {
    const {
        navigate,
        loading,
        saving,
        deleting,
        success,
        showDeleteModal, setShowDeleteModal,
        newFacility, setNewFacility,
        showFacilityInput, setShowFacilityInput,
        timeSlots,
        newSlotStart, setNewSlotStart,
        newSlotEnd, setNewSlotEnd,
        savingSlots,
        slotsSuccess,
        slotError, setSlotError,
        isTimePickerOpen, setIsTimePickerOpen,
        formData,
        allFacilities,
        handleSubmit,
        handleDeletePitch,
        handleFacilityToggle,
        handleAddFacility,
        handleChange,
        handleAddSlot,
        handleRemoveSlot,
        handleSaveSlots
    } = useBusinessPitchSettings();

    if (loading) return <BusinessLoadingSpinner fullScreen />;

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-24 relative">
            <PitchSettingsHeader name={formData.name} navigate={navigate} />

            {success && (
                <div className="mx-4 mt-4 p-4 bg-green-600/20 border border-green-500 rounded-xl text-green-500 font-bold text-center">
                    ✓ Ayarlar başarıyla güncellendi!
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-4 space-y-6">
                <PitchGeneralForm
                    formData={formData}
                    isTimePickerOpen={isTimePickerOpen}
                    setIsTimePickerOpen={setIsTimePickerOpen}
                    handleChange={handleChange}
                />

                <PitchTimeSlotsSection
                    timeSlots={timeSlots}
                    newSlotStart={newSlotStart}
                    newSlotEnd={newSlotEnd}
                    savingSlots={savingSlots}
                    slotsSuccess={slotsSuccess}
                    slotError={slotError}
                    pitchOpenTime={formData.openTime || undefined}
                    pitchCloseTime={formData.closeTime || undefined}
                    isTimePickerOpen={isTimePickerOpen}
                    setIsTimePickerOpen={(s) => { setIsTimePickerOpen(s); setSlotError(''); }}
                    setNewSlotStart={setNewSlotStart}
                    setNewSlotEnd={setNewSlotEnd}
                    onAddSlot={handleAddSlot}
                    onRemoveSlot={handleRemoveSlot}
                    onSaveSlots={handleSaveSlots}
                />

                <PitchFacilitiesSection
                    allFacilities={allFacilities}
                    selectedFacilities={formData.facilities}
                    newFacility={newFacility}
                    setNewFacility={setNewFacility}
                    showFacilityInput={showFacilityInput}
                    setShowFacilityInput={setShowFacilityInput}
                    onToggle={handleFacilityToggle}
                    onAdd={handleAddFacility}
                />

                <div className="pt-4 flex flex-col gap-4">
                    <button type="submit" disabled={saving}
                        className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white py-4 rounded-xl font-black text-lg uppercase tracking-wider transition-colors shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2">
                        <Save className="w-5 h-5" />
                        {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                    </button>

                    <button type="button" onClick={() => setShowDeleteModal(true)}
                        className="w-full bg-slate-800 hover:bg-red-500/10 border border-slate-700 hover:border-red-500 text-slate-400 hover:text-red-500 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                        <Trash2 className="w-5 h-5" />
                        Sahayı Sil
                    </button>
                </div>
            </form>

            <BusinessNavbar />

            {showDeleteModal && (
                <DeletePitchModal
                    deleting={deleting}
                    onConfirm={handleDeletePitch}
                    onCancel={() => setShowDeleteModal(false)}
                />
            )}
        </div>
    );
};
