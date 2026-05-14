import React, { useState, useMemo } from 'react';
import { X, Clock, Check } from 'lucide-react';
import { useModalBodyClass } from '../../utils/useModalBodyClass';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (time: string) => void;
    initialTime?: string;
    title?: string;
}

export const BusinessTimePickerModal: React.FC<Props> = ({ isOpen, onClose, onSelect, initialTime = "09:00", title = "SAAT SEÇİN" }) => {
    const [selectedHour, setSelectedHour] = useState(initialTime.split(':')[0]);
    const [selectedMinute, setSelectedMinute] = useState(initialTime.split(':')[1] || "00");
    useModalBodyClass(isOpen);

    if (!isOpen) return null;

    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minutes = ["00", "15", "30", "45"];

    const handleConfirm = () => {
        onSelect(`${selectedHour}:${selectedMinute}`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 w-full max-w-sm rounded-3xl border border-slate-700 overflow-hidden shadow-2xl relative flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="font-sport font-bold text-xl text-white italic tracking-tight">{title}</h2>
                            <p className="text-orange-500 text-xs font-bold font-mono">{selectedHour}:{selectedMinute}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Hours Grid */}
                    <div>
                        <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4">SAAT</label>
                        <div className="grid grid-cols-6 gap-2">
                            {hours.map(h => (
                                <button
                                    key={h}
                                    onClick={() => setSelectedHour(h)}
                                    className={`
                    py-2 rounded-xl font-bold font-mono text-sm transition-all border
                    ${selectedHour === h
                                            ? 'bg-orange-500 border-orange-400 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)] scale-105'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'}
                  `}
                                >
                                    {h}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Minutes Selector */}
                    <div>
                        <label className="block text-[10px] text-slate-500 font-black uppercase tracking-widest mb-4">DAKİKA</label>
                        <div className="grid grid-cols-4 gap-3">
                            {minutes.map(m => (
                                <button
                                    key={m}
                                    onClick={() => setSelectedMinute(m)}
                                    className={`
                    py-3 rounded-xl font-bold font-mono transition-all border
                    ${selectedMinute === m
                                            ? 'bg-orange-500 border-orange-400 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'}
                  `}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Confirm Button */}
                    <button
                        onClick={handleConfirm}
                        className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold rounded-2xl shadow-xl shadow-orange-600/20 transition-all flex items-center justify-center gap-2 group"
                    >
                        <span>DEĞİŞİKLİKLERİ UYGULA</span>
                        <Check className="w-5 h-5 group-hover:scale-125 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};
