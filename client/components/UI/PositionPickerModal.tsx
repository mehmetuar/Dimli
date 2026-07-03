import React from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Shield, ShieldOff, Zap, Flame, Minus } from 'lucide-react';

interface PositionOption {
    key: string;
    label: string;
    Icon: React.FC<any>;
    iconBg: string;
    iconColor: string;
    description: string;
}

const POSITION_OPTIONS: PositionOption[] = [
    {
        key: 'Kaleci',
        label: 'Kaleci',
        Icon: ShieldOff,
        iconBg: 'bg-blue-500/20',
        iconColor: 'text-blue-400',
        description: 'Kaleyi koruyan oyuncu',
    },
    {
        key: 'Defans',
        label: 'Defans',
        Icon: Shield,
        iconBg: 'bg-green-500/20',
        iconColor: 'text-green-400',
        description: 'Savunma oyuncusu',
    },
    {
        key: 'Orta Saha',
        label: 'Orta Saha',
        Icon: Zap,
        iconBg: 'bg-yellow-500/20',
        iconColor: 'text-yellow-400',
        description: 'Oyun kurucu',
    },
    {
        key: 'Forvet',
        label: 'Forvet',
        Icon: Flame,
        iconBg: 'bg-orange-500/20',
        iconColor: 'text-orange-400',
        description: 'Hücum oyuncusu',
    },
];

const EMPTY_OPTION: PositionOption = {
    key: '',
    label: 'Yok',
    Icon: Minus,
    iconBg: 'bg-slate-700',
    iconColor: 'text-slate-400',
    description: 'Yedek mevkim yok',
};

interface PositionPickerModalProps {
    isOpen: boolean;
    title: string;
    value: string;
    allowEmpty?: boolean;
    excludeKey?: string;  // bu key'e sahip seçenek gösterilmez (aynı mevki iki kez seçilmez)
    onSelect: (val: string) => void;
    onClose: () => void;
}

export const PositionPickerModal: React.FC<PositionPickerModalProps> = ({
    isOpen, title, value, allowEmpty = false, excludeKey, onSelect, onClose,
}) => {
    if (!isOpen) return null;

    const base = allowEmpty ? [EMPTY_OPTION, ...POSITION_OPTIONS] : POSITION_OPTIONS;
    const options = excludeKey ? base.filter(o => o.key !== excludeKey) : base;

    // §35: fixed overlay'ler document.body'ye portal'lanır — sabit/scroll konteyner
    // içinde (ör. tam-sayfa kayıt sihirbazı) hapsolmasın.
    return createPortal(
        <div
            className="fixed inset-0 z-[90] flex items-center justify-center px-5 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm bg-slate-900 rounded-3xl border border-slate-700/60 shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-800">
                    <h3 className="font-black text-white text-base uppercase tracking-wide">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Options */}
                <div className="p-3 space-y-2">
                    {options.map(opt => {
                        const isSelected = value === opt.key;
                        return (
                            <button
                                key={opt.key}
                                onClick={() => { onSelect(opt.key); onClose(); }}
                                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-all active:scale-[0.98] ${
                                    isSelected
                                        ? 'border-turf-500/60 bg-turf-600/10'
                                        : 'border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800'
                                }`}
                            >
                                {/* Icon badge */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${opt.iconBg}`}>
                                    <opt.Icon className={`w-5 h-5 ${opt.iconColor}`} />
                                </div>

                                {/* Label + description */}
                                <div className="flex-1 text-left">
                                    <p className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                                        {opt.label}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
                                </div>

                                {/* Check */}
                                {isSelected && (
                                    <Check className="w-4 h-4 text-turf-400 flex-shrink-0" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Bottom padding */}
                <div className="pb-3" />
            </div>
        </div>,
        document.body
    );
};
