import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import { KeyboardAwareModal } from '../Modals/KeyboardAwareModal';
import { COUNTRIES } from '../../data/countries';
import { Flag } from './Flag';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    /** Seçili ISO alpha-2 kod (örn. 'TR'). */
    value?: string;
    onSelect: (code: string) => void;
}

/**
 * Aramalı uyruk (ülke) seçici. LocationSelectionModal desenini izler:
 * KeyboardAwareModal (klavye + safe-area hazır) + arama header + kaydırılır liste.
 * Bayraklar gömülü (offline) <Flag/> ile gösterilir.
 */
export const CountryPickerModal: React.FC<Props> = ({ isOpen, onClose, value, onSelect }) => {
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (isOpen) setSearch('');
    }, [isOpen]);

    const filtered = useMemo(() => {
        const q = search.trim().toLocaleLowerCase('tr');
        if (!q) return COUNTRIES;
        return COUNTRIES.filter(
            c => c.name.toLocaleLowerCase('tr').includes(q) || c.code.toLowerCase().includes(q),
        );
    }, [search]);

    const handleSelect = (code: string) => {
        onSelect(code);
        onClose();
    };

    return (
        <KeyboardAwareModal
            isOpen={isOpen}
            onClose={onClose}
            zClassName="z-[100]"
            backdropClassName="bg-black/90"
            panelClassName="bg-slate-900 w-full max-w-sm rounded-3xl border border-slate-700 shadow-2xl"
            maxHeightClassName="max-h-[80vh]"
            bodyClassName="p-2 space-y-1 custom-scrollbar min-h-[300px]"
            header={
                <>
                    <div className="p-6 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
                        <h2 className="font-sport font-bold text-xl text-white italic">UYRUK SEÇİN</h2>
                        <button
                            onClick={onClose}
                            className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 border-b border-slate-800">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Ülke ara..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-turf-500 transition-all text-sm"
                            />
                        </div>
                    </div>
                </>
            }
        >
            {filtered.map(c => {
                const selected = (value || '').toUpperCase() === c.code;
                return (
                    <button
                        key={c.code}
                        onClick={() => handleSelect(c.code)}
                        className={`w-full p-4 rounded-xl flex items-center justify-between transition-all border ${
                            selected
                                ? 'bg-turf-600/15 border-turf-600/40'
                                : 'border-transparent hover:bg-slate-800 hover:border-slate-700'
                        }`}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <Flag code={c.code} />
                            <span className="font-bold text-white text-left truncate">{c.name}</span>
                        </div>
                        {selected && <Check className="w-5 h-5 text-turf-500 flex-shrink-0" />}
                    </button>
                );
            })}
            {filtered.length === 0 && (
                <div className="p-8 text-center text-slate-500 italic text-sm">Sonuç bulunamadı...</div>
            )}
        </KeyboardAwareModal>
    );
};
