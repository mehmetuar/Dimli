import React, { useEffect, useState } from 'react';
import { IconSearch } from './Icons';

interface SearchInputProps {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    delay?: number;
}

/**
 * Debounce'lu arama kutusu. Yazarken ~300ms bekleyip `onChange` tetikler.
 * `value` dışarıdan sıfırlanırsa (ör. sekme değişimi) içerik senkronlanır.
 */
const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder = 'Ara...', delay = 300 }) => {
    const [text, setText] = useState(value);

    // Dışarıdan value değişirse (reset) içeriği güncelle.
    useEffect(() => {
        setText(value);
    }, [value]);

    // Debounce: text → onChange (value ile aynıysa tetikleme).
    useEffect(() => {
        if (text === value) return;
        const t = setTimeout(() => onChange(text), delay);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [text]);

    return (
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7b9ab8] pointer-events-none">
                <IconSearch size={16} />
            </span>
            <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-[#1e2d47] border border-slate-700/40 rounded-xl pl-9 pr-3 py-2 text-sm text-[#dde8f5] placeholder-[#7b9ab8] focus:border-orange-400/60 outline-none transition-colors"
            />
        </div>
    );
};

export default SearchInput;
