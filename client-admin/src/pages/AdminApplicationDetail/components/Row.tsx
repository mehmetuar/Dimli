import React from 'react';

interface RowProps {
    label: string;
    value: string;
    editMode?: boolean;
    onChange?: (v: string) => void;
    placeholder?: string;
    type?: string;
}

const Row: React.FC<RowProps> = ({ label, value, editMode, onChange, placeholder, type = 'text' }) => (
    <div className="flex justify-between items-start gap-4 text-sm py-2 border-b border-slate-700/40 last:border-0">
        <span className="text-slate-400 shrink-0 pt-0.5">{label}</span>
        {editMode && onChange ? (
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder ?? label}
                className="text-right bg-[#253352] border border-slate-600/60 text-[#dde8f5] px-2.5 py-1 rounded-lg focus:outline-none focus:border-orange-500 text-sm w-full max-w-[60%] transition-all"
            />
        ) : (
            <span className="text-slate-100 font-medium text-right break-words max-w-[60%]">{value || '–'}</span>
        )}
    </div>
);

export default Row;
