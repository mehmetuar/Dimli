import React from 'react';
import { MapPin, Calendar, ArrowUpDown } from 'lucide-react';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';

interface MarketplaceHeaderProps {
    locationFilter: LocationFilter;
    setLocationFilter: (filter: LocationFilter) => void;
    setIsLocationFilterOpen: (isOpen: boolean) => void;
    selectedDate: string;
    onOpenDateFilter: () => void;
    sortBy: string;
    onOpenSort: () => void;
}

export const MarketplaceHeader: React.FC<MarketplaceHeaderProps> = ({
    locationFilter,
    setIsLocationFilterOpen,
    selectedDate,
    onOpenDateFilter,
    sortBy,
    onOpenSort,
}) => {
    const isNonDefaultSort = sortBy !== 'date_desc';

    return (
        <>
            <header className="mb-8">
                <h1 className="font-sport font-black text-5xl text-white uppercase italic tracking-tighter leading-none">
                    MAÇ <span className="text-turf-500">PAZARI</span>
                </h1>
                <p className="text-slate-400 mt-2 font-medium">Sahaya çıkmaya hazır mısın kaptan?</p>
            </header>

            <div className="flex gap-2 mb-8 overflow-x-auto pb-4 scrollbar-hide mask-linear">
                <button
                    onClick={onOpenDateFilter}
                    className="px-4 py-2.5 border border-turf-500/50 bg-turf-900/20 text-white rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap hover:bg-turf-800 transition-colors skew-x-[-6deg] shrink-0"
                >
                    <span className="skew-x-[6deg] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-turf-500 shrink-0" />
                        {new Date(selectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    </span>
                </button>

                <button
                    onClick={() => setIsLocationFilterOpen(true)}
                    className={`px-4 py-2.5 border text-slate-300 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap hover:border-turf-500 hover:text-white transition-colors skew-x-[-6deg] shrink-0 ${locationFilter.type === 'NEARBY' ? 'bg-turf-900/50 border-turf-500 text-white' : 'bg-slate-800 border-slate-700'}`}
                >
                    <span className="skew-x-[6deg] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        {locationFilter.type === 'NEARBY' ? `Yakınımda (${locationFilter.radius}km)` : 'Yakınımda'}
                    </span>
                </button>

                <button
                    onClick={onOpenSort}
                    className={`px-4 py-2.5 border rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors skew-x-[-6deg] shrink-0 ${
                        isNonDefaultSort
                            ? 'bg-turf-900/40 border-turf-500 text-turf-400'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-turf-500 hover:text-white'
                    }`}
                >
                    <span className="skew-x-[6deg] flex items-center gap-1.5">
                        <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        Sırala
                    </span>
                </button>
            </div>
        </>
    );
};
