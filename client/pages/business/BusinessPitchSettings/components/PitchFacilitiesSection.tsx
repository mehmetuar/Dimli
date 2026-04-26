import React from 'react';
import { ListChecks, Plus, Clock } from 'lucide-react';

interface PitchFacilitiesSectionProps {
    allFacilities: string[];
    selectedFacilities: string[];
    onToggle: (facility: string) => void;
    onOpenModal: () => void;
    hasPendingFacility: boolean;
}

export const PitchFacilitiesSection: React.FC<PitchFacilitiesSectionProps> = ({
    allFacilities, selectedFacilities,
    onToggle, onOpenModal, hasPendingFacility,
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

            {hasPendingFacility && (
                <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    <p className="text-xs text-yellow-400 font-medium">
                        Manuel imkan ekleme isteğiniz inceleme bekliyor.
                    </p>
                </div>
            )}

            <button
                type="button"
                onClick={onOpenModal}
                disabled={hasPendingFacility}
                className="w-full py-3 bg-slate-900 border border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white hover:border-slate-400 transition-colors flex items-center justify-center gap-2 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <Plus className="w-4 h-4" /> Manuel İmkan Ekle
            </button>
        </div>
    );
};
