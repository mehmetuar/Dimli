import React from 'react';
import { MapPin } from 'lucide-react';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';

interface JokerLocationFilterProps {
    locationFilter: LocationFilter;
    setLocationFilter: (filter: LocationFilter) => void;
    setIsLocationFilterOpen: (open: boolean) => void;
}

export const JokerLocationFilter: React.FC<JokerLocationFilterProps> = ({
    locationFilter,
    setLocationFilter,
    setIsLocationFilterOpen
}) => {
    return (
        <div className="mb-6 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
                onClick={() => setIsLocationFilterOpen(true)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all border ${locationFilter.type === 'NEARBY'
                    ? 'bg-turf-600 border-turf-500 text-white shadow-lg shadow-turf-600/20'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-turf-500 hover:text-white'
                    }`}
            >
                <MapPin className="w-4 h-4" />
                {locationFilter.type === 'NEARBY' ? `Yakınımda (${locationFilter.radius}km)` : 'Yakınımda'}
            </button>

            {locationFilter.type === 'NEARBY' && (
                <button
                    onClick={() => setLocationFilter({ type: 'ALL' })}
                    className="flex items-center gap-2 px-4 py-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl font-bold text-sm hover:text-white hover:bg-slate-700 transition-all"
                >
                    Filtreyi Temizle
                </button>
            )}
        </div>
    );
};
