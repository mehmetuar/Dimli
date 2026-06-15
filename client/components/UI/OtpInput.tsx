import React, { useEffect, useRef, useState } from 'react';

interface OtpInputProps {
    value: string;
    onChange: (value: string) => void;
    length?: number;
    disabled?: boolean;
    autoFocus?: boolean;
    accent?: 'turf' | 'orange';
}

// Tek görünmez input, görünür kutuların üzerine bindirilir.
// iOS/Android SMS kod önerisi tek inputa tıklandığında tüm kodu yazar — 6 ayrı input'a güvenilir şekilde dağıtmanın yolu yoktur.
export const OtpInput: React.FC<OtpInputProps> = ({
    value,
    onChange,
    length = 6,
    disabled,
    autoFocus,
    accent = 'turf',
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        if (autoFocus) inputRef.current?.focus();
    }, [autoFocus]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, length);
        onChange(digits);
    };

    const accentBorder = accent === 'orange' ? 'border-orange-500' : 'border-turf-500';
    const activeIndex = Math.min(value.length, length - 1);

    return (
        <div className="relative flex justify-center gap-2" onClick={() => inputRef.current?.focus()}>
            <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={length}
                value={value}
                onChange={handleChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                disabled={disabled}
                className="absolute inset-0 w-full h-full opacity-0 text-base"
            />
            {Array.from({ length }).map((_, i) => {
                const filled = !!value[i];
                const isActive = focused && i === activeIndex;
                return (
                    <div
                        key={i}
                        className={`w-11 h-14 flex items-center justify-center text-center text-xl font-bold bg-slate-900 text-white rounded-xl border transition-colors
                            ${filled || isActive ? accentBorder : 'border-slate-700'}`}
                    >
                        {value[i] || ''}
                    </div>
                );
            })}
        </div>
    );
};
