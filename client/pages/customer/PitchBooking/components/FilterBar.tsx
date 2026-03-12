import React from 'react';
import { MapPin, Calendar } from 'lucide-react';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';

interface FilterBarProps {
    locationFilter: LocationFilter;
    selectedDate: string;
    onOpenLocationFilter: () => void;
    onOpenDateFilter: () => void;
    onClearFilter: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
    locationFilter, selectedDate, onOpenLocationFilter, onOpenDateFilter, onClearFilter
}) => {
    return (
        <div className="mb-6 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
                onClick={onOpenLocationFilter}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all border ${locationFilter.type !== 'ALL' ? 'bg-turf-600 border-turf-500 text-white shadow-lg shadow-turf-600/20' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-turf-500 hover:text-white'}`}
            >
                <MapPin className="w-4 h-4" />
                {locationFilter.type === 'NEARBY' ? `Yakınımda (${locationFilter.radius}km)` : locationFilter.type === 'DISTRICT' ? locationFilter.value : 'İstanbul (Tümü)'}
            </button>

            <button
                onClick={onOpenDateFilter}
                className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all border bg-slate-800 border-slate-700 text-slate-300 hover:border-turf-500 hover:text-white"
            >
                <Calendar className="w-4 h-4" />
                {new Date(selectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
            </button>

            {locationFilter.type !== 'ALL' && (
                <button
                    onClick={onClearFilter}
                    className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-bold text-sm hover:bg-red-500/20 transition-all"
                >
                    Filtreyi Temizle
                </button>
            )}
        </div>
    );
};
