import React from 'react';
import { MapPin } from 'lucide-react';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';

interface JokerLocationFilterProps {
    locationFilter: LocationFilter;
    setIsLocationFilterOpen: (open: boolean) => void;
}

export const JokerLocationFilter: React.FC<JokerLocationFilterProps> = ({
    locationFilter,
    setIsLocationFilterOpen
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
        </div>
    );
};
