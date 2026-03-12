import React from 'react';
import { Goal } from 'lucide-react';
import { BusinessNavbar } from '../../../components/Business/BusinessNavbar';
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
        showAddModal, setShowAddModal,
        adding,
        newPitchData, setNewPitchData,
        isTimePickerOpen, setIsTimePickerOpen,
        tempSlot, setTempSlot,
        toggleFacility,
        addTimeSlot,
        removeTimeSlot,
        handleAddPitch
    } = useBusinessPitchList();

    if (loading) return <BusinessLoadingSpinner fullScreen />;

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-24 relative">
            <PitchListHeader navigate={navigate} setShowAddModal={setShowAddModal} />

            <div className="p-4 space-y-4">
                {pitches.map((pitch) => (
                    <PitchListItem
                        key={pitch.id}
                        pitch={pitch}
                        onClick={() => navigate(`/business/settings/pitches/${pitch.id}`)}
                    />
                ))}

                {pitches.length === 0 && (
                    <div className="text-center py-10 text-slate-500">
                        <Goal className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Henüz saha eklenmemiş.</p>
                        <button onClick={() => setShowAddModal(true)} className="mt-3 text-orange-500 font-bold hover:underline">
                            İlk sahanı ekle
                        </button>
                    </div>
                )}
            </div>

            <BusinessNavbar />

            {showAddModal && (
                <AddPitchModal
                    newPitchData={newPitchData}
                    setNewPitchData={setNewPitchData}
                    isTimePickerOpen={isTimePickerOpen}
                    setIsTimePickerOpen={setIsTimePickerOpen}
                    tempSlot={tempSlot}
                    setTempSlot={setTempSlot}
                    adding={adding}
                    onClose={() => setShowAddModal(false)}
                    onSubmit={handleAddPitch}
                    toggleFacility={toggleFacility}
                    addTimeSlot={addTimeSlot}
                    removeTimeSlot={removeTimeSlot}
                />
            )}
        </div>
    );
};
