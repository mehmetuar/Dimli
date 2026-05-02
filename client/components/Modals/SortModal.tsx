import React, { ReactNode } from 'react';
import { X, ArrowUpDown } from 'lucide-react';

export interface SortOption {
    key: string;
    label: string;
    icon?: ReactNode;
}

interface SortModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    options: SortOption[];
    value: string;
    onChange: (key: string) => void;
}

export const SortModal: React.FC<SortModalProps> = ({ isOpen, onClose, title, options, value, onChange }) => {
    if (!isOpen) return null;

    const handleSelect = (key: string) => {
        onChange(key);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4 text-turf-400" />
                        <h3 className="text-white font-black text-sm uppercase tracking-widest">{title}</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Options */}
                <div className="p-3 flex flex-col gap-2">
                    {options.map((opt) => {
                        const isActive = value === opt.key;
                        return (
                            <button
                                key={opt.key}
                                onClick={() => handleSelect(opt.key)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border font-bold text-xs sm:text-sm text-left transition-all ${
                                    isActive
                                        ? 'bg-turf-600 border-turf-500 text-white shadow-lg shadow-turf-600/20'
                                        : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-turf-500 hover:text-white'
                                }`}
                            >
                                {opt.icon && <span className="shrink-0 w-4 h-4 flex items-center justify-center">{opt.icon}</span>}
                                <span className="flex-1 leading-snug">{opt.label}</span>
                                {isActive && (
                                    <span className="w-2 h-2 rounded-full bg-white shrink-0" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
