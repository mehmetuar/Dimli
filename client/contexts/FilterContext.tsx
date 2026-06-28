import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import { todayStr } from '../utils/today';

const DATE_KEY = 'filter_selected_date';
const MKT_SORT_KEY = 'filter_marketplace_sort';
const PITCH_SORT_KEY = 'filter_pitch_sort';

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
    // Açılışta (cold start): saklı tarih geçmişteyse bugüne çek; bugün/gelecek ise koru.
    // Geçmiş tarih hiçbir zaman seçili kalmamalı.
    const [selectedDate, setSelectedDateState] = useState(() => {
        const t = todayStr();
        const stored = load(DATE_KEY, t);
        return stored < t ? t : stored;
    });
    const [marketplaceSortBy, setMarketplaceSortByState] = useState(() => load(MKT_SORT_KEY, 'date_desc'));
    const [pitchSortBy, setPitchSortByState] = useState(() => load(PITCH_SORT_KEY, 'distance'));
    const [isDateFilterModalOpen, setIsDateFilterModalOpen] = useState(false);

    const setSelectedDate = useCallback((d: string) => {
        setSelectedDateState(d);
        save(DATE_KEY, d);
    }, []);

    // Cold start'ta saklı değeri geçmişten bugüne çektiysek localStorage'ı da güncelle
    // ki bayat tarih kalmasın (yalnızca ilk mount'ta bir kez çalışır).
    useEffect(() => {
        save(DATE_KEY, selectedDate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sıcak başlatma (arka plandan dönüş): mobilde uygulama gece arka plandayken JS
    // bağlamı yaşar, FilterProvider yeniden mount olmaz. Uygulama öne gelince seçili
    // tarih geçmişe düştüyse bugüne çek. Dinleyici bir kez kaydedilir; güncel tarihi
    // ref üzerinden okuruz (her tarih değişiminde native dinleyiciyi yeniden eklememek için).
    const selectedDateRef = useRef(selectedDate);
    useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);

    useEffect(() => {
        const lp = CapApp.addListener('appStateChange', (state) => {
            if (!state.isActive) return;
            const t = todayStr();
            if (selectedDateRef.current < t) setSelectedDate(t);
        });
        return () => { lp.then(h => h.remove()).catch(() => {}); };
    }, [setSelectedDate]);

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
