import React from 'react';
import { MapPin, Calendar, ArrowUpDown, Search, X, Loader2 } from 'lucide-react';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';

interface FilterBarProps {
    locationFilter: LocationFilter;
    selectedDate: string;
    sortBy: string;
    onOpenLocationFilter: () => void;
    onOpenDateFilter: () => void;
    onOpenSort: () => void;
    // Arama (morph) — ikon hapı büyüyüp input'a dönüşür, filtreler solup kaybolur
    searchQuery: string;
    onSearchChange: (v: string) => void;
    isSearchOpen: boolean;
    onOpenSearch: () => void;
    onCloseSearch: () => void;
    isSearching?: boolean; // sunucu isim aramasını çekerken sol ikonu spinner yap
}

export const FilterBar: React.FC<FilterBarProps> = ({
    locationFilter, selectedDate, sortBy,
    onOpenLocationFilter, onOpenDateFilter, onOpenSort,
    searchQuery, onSearchChange, isSearchOpen, onOpenSearch, onCloseSearch, isSearching,
}) => {
    const isNonDefaultSort = sortBy !== 'distance';

    return (
        <div className="relative pb-2" style={{ minHeight: 46 }}>
            {/* ── KAPALI: filtre satırı (öne çıkan arama hapı + 3 pill) ──
                Arama açılınca solup tıklanamaz olur; yükseklik bu katmandan gelir. */}
            <div
                className={`flex gap-2 overflow-x-auto scrollbar-hide transition-all duration-300 ease-out ${
                    isSearchOpen ? 'opacity-0 -translate-x-1 pointer-events-none' : 'opacity-100 translate-x-0'
                }`}
            >
                {/* Arama ikon hapı — basınca sağdaki input'a "büyür" */}
                <button
                    onClick={onOpenSearch}
                    aria-label="Saha ara"
                    className="flex items-center justify-center w-[46px] h-[46px] shrink-0 rounded-xl border bg-slate-800 border-slate-700 text-turf-400 transition-all active:scale-95 hover:border-turf-500"
                >
                    <Search className="w-[18px] h-[18px]" />
                </button>

                <button
                    onClick={onOpenLocationFilter}
                    className="flex items-center gap-1.5 px-3 py-3 rounded-xl font-bold text-sm transition-all border bg-turf-600 border-turf-500 text-white shadow-lg shadow-turf-600/20 whitespace-nowrap shrink-0"
                >
                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    {`Yakınımda (${locationFilter.radius ?? 20}km)`}
                </button>

                <button
                    onClick={onOpenDateFilter}
                    className="flex items-center gap-1.5 px-3 py-3 rounded-xl font-bold text-sm transition-all border bg-slate-800 border-slate-700 text-slate-300 hover:border-turf-500 hover:text-white whitespace-nowrap shrink-0"
                >
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    {new Date(selectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                </button>

                <button
                    onClick={onOpenSort}
                    className={`flex items-center gap-1.5 px-3 py-3 rounded-xl font-bold text-sm transition-all border whitespace-nowrap shrink-0 ${isNonDefaultSort
                        ? 'bg-turf-900/40 border-turf-500 text-turf-400'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-turf-500 hover:text-white'
                        }`}
                >
                    <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    Sırala
                </button>
            </div>

            {/* ── AÇIK: tam-genişlik arama input'u ──
                Absolute overlay; kapalıyken scale-x-0 + origin-left → ikondan "büyüyerek"
                çıkar. Yükseklik kapalı katmandan geldiği için layout kaymaz. Input KOŞULLU
                mount + autoFocus: iOS WKWebView klavyeyi yalnız kullanıcı-jesti içindeki
                taze mount+autoFocus ile açar (effect'le programatik focus güvenilmez). */}
            <div
                className={`absolute inset-x-0 top-0 transition-all duration-300 ${
                    isSearchOpen ? 'opacity-100 scale-x-100 pointer-events-auto' : 'opacity-0 scale-x-0 pointer-events-none'
                }`}
                style={{ transformOrigin: 'left center', transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
            >
                {isSearchOpen && (
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                            {isSearching
                                ? <Loader2 className="w-[18px] h-[18px] animate-spin text-turf-400" />
                                : <Search className="w-[18px] h-[18px]" />}
                        </span>
                        <input
                            autoFocus
                            type="text"
                            inputMode="search"
                            enterKeyHint="search"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Saha ara…"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl h-[46px] pl-11 pr-11 text-white text-sm placeholder:text-slate-500 focus:border-turf-500 focus:outline-none focus:ring-2 focus:ring-turf-500/20 transition-colors"
                        />
                        <button
                            // Doluyken metni temizle (odak kalır), boşken aramayı kapat.
                            onClick={() => (searchQuery ? onSearchChange('') : onCloseSearch())}
                            aria-label={searchQuery ? 'Aramayı temizle' : 'Aramayı kapat'}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white active:scale-90 transition-all"
                        >
                            <X className="w-[18px] h-[18px]" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
