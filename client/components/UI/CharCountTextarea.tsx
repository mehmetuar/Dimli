import React from 'react';

// Not alanları için PAYLAŞILAN textarea + karakter sayacı (0/N).
// native `maxLength` sınırı aşmaya izin vermez (boşluk dahil her karakter 1 sayılır);
// sınıra ulaşınca sayaç kırmızıya döner. Kartta taşma garantisi ayrıca line-clamp +
// break-words ile gelir. Odak rengi vb. her formun kendi reçetesi `className` ile korunur.

interface CharCountTextareaProps {
    value: string;
    onChange: (v: string) => void;
    maxChars: number;
    placeholder?: string;
    className?: string;   // textarea sınıfları (formun kendi görünümü)
    rows?: number;
    disabled?: boolean;
    onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
}

export const CharCountTextarea: React.FC<CharCountTextareaProps> = ({
    value, onChange, maxChars, placeholder, className, rows = 3, disabled, onFocus,
}) => {
    const atLimit = value.length >= maxChars;

    return (
        <div className="relative">
            <textarea
                value={value}
                maxLength={maxChars}
                onChange={(e) => onChange(e.target.value)}
                onFocus={onFocus}
                placeholder={placeholder}
                rows={rows}
                disabled={disabled}
                className={className}
            />
            <div className="mt-1.5 flex items-center justify-end pr-0.5">
                <span className={`text-[11px] font-bold tabular-nums ${atLimit ? 'text-red-400' : 'text-slate-500'}`}>
                    {value.length} / {maxChars}
                </span>
            </div>
        </div>
    );
};
