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
        <div className="mb-6 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
                onClick={() => setIsLocationFilterOpen(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all border bg-turf-600 border-turf-500 text-white shadow-lg shadow-turf-600/20"
            >
                <MapPin className="w-4 h-4" />
                {`Yakınımda (${locationFilter.radius ?? 20}km)`}
            </button>
            <button
                onClick={() => setIsSortOpen(true)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all border ${
                    sortBy !== 'distance'
                        ? 'bg-turf-600 border-turf-500 text-white shadow-lg shadow-turf-600/20'
                        : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-turf-500 hover:text-white'
                }`}
            >
                <ArrowUpDown className="w-4 h-4" />
                Sırala
            </button>
        </div>
    );
};
