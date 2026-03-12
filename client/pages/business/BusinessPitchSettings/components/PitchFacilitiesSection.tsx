import React from 'react';
import { ListChecks, Plus, X } from 'lucide-react';

interface PitchFacilitiesSectionProps {
    allFacilities: string[];
    selectedFacilities: string[];
    newFacility: string;
    setNewFacility: (v: string) => void;
    showFacilityInput: boolean;
    setShowFacilityInput: (v: boolean) => void;
    onToggle: (facility: string) => void;
    onAdd: () => void;
}

export const PitchFacilitiesSection: React.FC<PitchFacilitiesSectionProps> = ({
    allFacilities, selectedFacilities,
    newFacility, setNewFacility,
    showFacilityInput, setShowFacilityInput,
    onToggle, onAdd
}) => {
    return (
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-orange-500 flex items-center gap-2">
                    <ListChecks className="w-5 h-5" /> Saha İmkanları
                </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                {allFacilities.map((facility) => {
                    const isSelected = selectedFacilities.includes(facility);
                    return (
                        <button key={facility} type="button"
                            onClick={() => onToggle(facility)}
                            className={`p-3 rounded-xl border text-sm font-bold transition-all ${isSelected
                                ? 'bg-orange-500/20 border-orange-500 text-orange-500'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                                }`}
                        >
                            {facility}
                        </button>
                    );
                })}
            </div>

            {showFacilityInput ? (
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newFacility}
                        onChange={(e) => setNewFacility(e.target.value)}
                        placeholder="Özellik adı..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 text-white focus:outline-none focus:border-orange-500"
                        autoFocus
                    />
                    <button type="button" onClick={onAdd}
                        className="bg-green-600 hover:bg-green-500 text-white px-3 rounded-lg flex items-center gap-1 font-bold text-sm">
                        Ekle
                    </button>
                    <button type="button" onClick={() => setShowFacilityInput(false)}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-3 rounded-lg">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <button type="button" onClick={() => setShowFacilityInput(true)}
                    className="w-full py-3 bg-slate-900 border border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white hover:border-slate-400 transition-colors flex items-center justify-center gap-2 font-bold text-sm">
                    <Plus className="w-4 h-4" /> Yeni İmkan Ekle
                </button>
            )}
        </div>
    );
};
