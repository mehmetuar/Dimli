import React from 'react';
import { MapPin, ArrowUpDown } from 'lucide-react';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';

interface JokerLocationFilterProps {
    locationFilter: LocationFilter;
    setIsLocationFilterOpen: (open: boolean) => void;
    sortBy: string;
    setIsSortOpen: (open: boolean) => void;
}

export const JokerLocationFilter: React.FC<JokerLocationFilterProps> = ({
    locationFilter,
    setIsLocationFilterOpen,
    sortBy,
    setIsSortOpen,
}) => {
    return (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
                onClick={() => setIsLocationFilterOpen(true)}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-3 rounded-xl font-bold text-sm transition-all border bg-turf-600 border-turf-500 text-white shadow-lg shadow-turf-600/20 whitespace-nowrap shrink-0"
            >
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                {`Yakınımda (${locationFilter.radius ?? 20}km)`}
            </button>
            <button
                onClick={() => setIsSortOpen(true)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-3 rounded-xl font-bold text-sm transition-all border whitespace-nowrap shrink-0 ${
                    sortBy !== 'distance'
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
