import React from 'react';
import { X } from 'lucide-react';

interface DateFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: string;
    setSelectedDate: (date: string) => void;
}

export const DateFilterModal: React.FC<DateFilterModalProps> = ({ isOpen, onClose, selectedDate, setSelectedDate }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-slate-800 w-full max-w-md sm:rounded-3xl rounded-t-3xl border border-slate-700 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-slate-700 bg-slate-900 flex justify-between items-center">
                    <div>
                        <h2 className="font-sport font-black text-2xl text-white italic uppercase tracking-wide">
                            TARİH <span className="text-turf-500">SEÇ</span>
                        </h2>
                        <p className="text-slate-400 text-xs">Max 30 gün ileriye kadar</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* Tarih Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Tarih Seçin</label>
                        <input
                            type="date"
                            value={selectedDate}
                            min={new Date().toISOString().split('T')[0]}
                            max={(() => {
                                const maxDate = new Date();
                                maxDate.setDate(maxDate.getDate() + 30);
                                return maxDate.toISOString().split('T')[0];
                            })()}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 text-white font-bold px-4 py-3 rounded-xl focus:outline-none focus:border-turf-500 transition-colors"
                        />
                        <p className="text-sm text-slate-400 font-medium">
                            {new Date(selectedDate).toLocaleDateString('tr-TR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                            })}
                        </p>
                    </div>

                    {/* Hızlı Seçim Butonları */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Hızlı Seçim</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setSelectedDate(new Date().toISOString().split('T')[0]);
                                    onClose();
                                }}
                                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-turf-600 text-white rounded-xl text-sm font-bold transition-colors"
                            >
                                Bugün
                            </button>
                            <button
                                onClick={() => {
                                    const tomorrow = new Date();
                                    tomorrow.setDate(tomorrow.getDate() + 1);
                                    setSelectedDate(tomorrow.toISOString().split('T')[0]);
                                    onClose();
                                }}
                                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-turf-600 text-white rounded-xl text-sm font-bold transition-colors"
                            >
                                Yarın
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
