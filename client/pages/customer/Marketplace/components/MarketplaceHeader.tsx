import React from 'react';
import { MapPin, Calendar } from 'lucide-react';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';

interface MarketplaceHeaderProps {
    locationFilter: LocationFilter;
    setLocationFilter: (filter: LocationFilter) => void;
    setIsLocationFilterOpen: (isOpen: boolean) => void;
    selectedDate: string;
    onOpenDateFilter: () => void;
}

export const MarketplaceHeader: React.FC<MarketplaceHeaderProps> = ({
    locationFilter,
    setIsLocationFilterOpen,
    selectedDate,
    onOpenDateFilter
}) => {
    return (
        <>
            <header className="mb-8">
                <h1 className="font-sport font-black text-5xl text-white uppercase italic tracking-tighter leading-none">
                    MAÇ <span className="text-turf-500">PAZARI</span>
                </h1>
                <p className="text-slate-400 mt-2 font-medium">Sahaya çıkmaya hazır mısın kaptan?</p>
            </header>

            {/* Quick Filters */}
            <div className="flex gap-3 mb-8 overflow-x-auto pb-4 scrollbar-hide mask-linear">
                <button
                    onClick={onOpenDateFilter}
                    className="px-5 py-2.5 border border-turf-500/50 bg-turf-900/20 text-white rounded-xl text-sm font-bold whitespace-nowrap hover:bg-turf-800 transition-colors skew-x-[-6deg]"
                >
                    <span className="skew-x-[6deg] flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-turf-500" />
                        {new Date(selectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                    </span>
                </button>

                <button
                    onClick={() => setIsLocationFilterOpen(true)}
                    className={`px-5 py-2.5 border text-slate-300 rounded-xl text-sm font-bold whitespace-nowrap hover:border-turf-500 hover:text-white transition-colors skew-x-[-6deg] ${locationFilter.type === 'NEARBY' ? 'bg-turf-900/50 border-turf-500 text-white' : 'bg-slate-800 border-slate-700'}`}
                >
                    <span className="skew-x-[6deg] flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {locationFilter.type === 'NEARBY' ? `Yakınımda (${locationFilter.radius}km)` : 'Yakınımda'}
                    </span>
                </button>
            </div>
        </>
    );
};
