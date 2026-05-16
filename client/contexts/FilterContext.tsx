import React, { createContext, useContext, useState, useCallback } from 'react';

const DATE_KEY = 'filter_selected_date';
const MKT_SORT_KEY = 'filter_marketplace_sort';
const PITCH_SORT_KEY = 'filter_pitch_sort';

const today = () => new Date().toISOString().split('T')[0];

const load = (key: string, fallback: string): string => {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
};

const save = (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch {}
};

interface FilterContextValue {
    selectedDate: string;
    setSelectedDate: (d: string) => void;
    marketplaceSortBy: string;
    setMarketplaceSortBy: (s: string) => void;
    pitchSortBy: string;
    setPitchSortBy: (s: string) => void;
    isDateFilterModalOpen: boolean;
    setIsDateFilterModalOpen: (v: boolean) => void;
}

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectedDate, setSelectedDateState] = useState(() => load(DATE_KEY, today()));
    const [marketplaceSortBy, setMarketplaceSortByState] = useState(() => load(MKT_SORT_KEY, 'date_desc'));
    const [pitchSortBy, setPitchSortByState] = useState(() => load(PITCH_SORT_KEY, 'distance'));
    const [isDateFilterModalOpen, setIsDateFilterModalOpen] = useState(false);

    const setSelectedDate = useCallback((d: string) => {
        setSelectedDateState(d);
        save(DATE_KEY, d);
    }, []);

    const setMarketplaceSortBy = useCallback((s: string) => {
        setMarketplaceSortByState(s);
        save(MKT_SORT_KEY, s);
    }, []);

    const setPitchSortBy = useCallback((s: string) => {
        setPitchSortByState(s);
        save(PITCH_SORT_KEY, s);
    }, []);

    return (
        <FilterContext.Provider value={{ selectedDate, setSelectedDate, marketplaceSortBy, setMarketplaceSortBy, pitchSortBy, setPitchSortBy, isDateFilterModalOpen, setIsDateFilterModalOpen }}>
            {children}
        </FilterContext.Provider>
    );
};

export const useFilterContext = () => {
    const ctx = useContext(FilterContext);
    if (!ctx) throw new Error('useFilterContext must be used inside FilterProvider');
    return ctx;
};
