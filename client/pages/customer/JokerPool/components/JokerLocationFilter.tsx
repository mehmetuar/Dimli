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
    // Pill stili Marketplace.tsx filtre satırıyla BİREBİR (kanonik kaynak) —
    // değişiklikte üç sayfayı (Marketplace/FilterBar/JokerLocationFilter) senkron tut.
    return (
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
            <button
                onClick={() => setIsLocationFilterOpen(true)}
                className="px-3 py-2.5 border rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors skew-x-[-6deg] shrink-0 bg-turf-900/50 border-turf-500 text-white"
            >
                <span className="skew-x-[6deg] flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {`Yakınımda (${locationFilter.radius ?? 20}km)`}
                </span>
            </button>
            <button
                onClick={() => setIsSortOpen(true)}
                className={`px-3 py-2.5 border rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors skew-x-[-6deg] shrink-0 ${
                    sortBy !== 'distance'
                        ? 'bg-turf-900/40 border-turf-500 text-turf-400'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-turf-500 hover:text-white'
                }`}
            >
                <span className="skew-x-[6deg] flex items-center gap-1">
                    <ArrowUpDown className="w-3 h-3 shrink-0" />
                    Sırala
                </span>
            </button>
        </div>
    );
};
