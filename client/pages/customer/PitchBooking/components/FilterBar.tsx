import React from 'react';
import { MapPin, Calendar, ArrowUpDown } from 'lucide-react';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';

interface FilterBarProps {
    locationFilter: LocationFilter;
    selectedDate: string;
    sortBy: string;
    onOpenLocationFilter: () => void;
    onOpenDateFilter: () => void;
    onOpenSort: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
    locationFilter, selectedDate, sortBy, onOpenLocationFilter, onOpenDateFilter, onOpenSort
}) => {
    const isNonDefaultSort = sortBy !== 'distance';

    return (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
                onClick={onOpenLocationFilter}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all border bg-turf-600 border-turf-500 text-white shadow-lg shadow-turf-600/20 whitespace-nowrap shrink-0"
            >
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                {`Yakınımda (${locationFilter.radius ?? 20}km)`}
            </button>

            <button
                onClick={onOpenDateFilter}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all border bg-slate-800 border-slate-700 text-slate-300 hover:border-turf-500 hover:text-white whitespace-nowrap shrink-0"
            >
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                {new Date(selectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
            </button>

            <button
                onClick={onOpenSort}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all border whitespace-nowrap shrink-0 ${
                    isNonDefaultSort
                        ? 'bg-turf-900/40 border-turf-500 text-turf-400'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-turf-500 hover:text-white'
                }`}
            >
                <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                Sırala
            </button>
        </div>
    );
};
