import React from 'react';
import { MapPin, Calendar } from 'lucide-react';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';

interface FilterBarProps {
    locationFilter: LocationFilter;
    selectedDate: string;
    onOpenLocationFilter: () => void;
    onOpenDateFilter: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
    locationFilter, selectedDate, onOpenLocationFilter, onOpenDateFilter
}) => {
    return (
        <div className="mb-6 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
                onClick={onOpenLocationFilter}
                className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all border bg-turf-600 border-turf-500 text-white shadow-lg shadow-turf-600/20"
            >
                <MapPin className="w-4 h-4" />
                {`Yakınımda (${locationFilter.radius ?? 20}km)`}
            </button>

            <button
                onClick={onOpenDateFilter}
                className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all border bg-slate-800 border-slate-700 text-slate-300 hover:border-turf-500 hover:text-white"
            >
                <Calendar className="w-4 h-4" />
                {new Date(selectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
            </button>
        </div>
    );
};
