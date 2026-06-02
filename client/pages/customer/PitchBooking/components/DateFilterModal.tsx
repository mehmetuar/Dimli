import React from 'react';
import { X } from 'lucide-react';
import { CalendarPicker } from '../../../../components/UI/CalendarPicker';

interface DateFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: string;
    setSelectedDate: (date: string) => void;
}

export const DateFilterModal: React.FC<DateFilterModalProps> = ({ isOpen, onClose, selectedDate, setSelectedDate }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <div className="bg-slate-800 w-full max-w-md sm:rounded-3xl rounded-t-3xl border border-slate-700 shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-3 sm:p-6 border-b border-slate-700 bg-slate-900 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="font-sport font-black text-xl sm:text-2xl text-white italic uppercase tracking-wide">
                            TARİH <span className="text-turf-500">SEÇ</span>
                        </h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-tighter">İleriye dönük 30 gün aktif</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-3 sm:p-6 space-y-3 sm:space-y-6 overflow-y-auto">
                    {/* Takvim */}
                    <div>
                        <CalendarPicker
                            selectedDate={selectedDate}
                            onDateSelect={(date) => {
                                setSelectedDate(date);
                                setTimeout(onClose, 200);
                            }}
                        />
                    </div>

                    {/* Hızlı Seçim Butonları */}
                    <div className="space-y-2 sm:space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Hızlı Seçim</label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setSelectedDate(new Date().toISOString().split('T')[0]);
                                    onClose();
                                }}
                                className="flex-1 px-4 py-2 sm:py-4 bg-slate-900/50 hover:bg-turf-500 hover:text-slate-900 border border-slate-700 text-white rounded-2xl text-sm font-black uppercase italic transition-all"
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
                                className="flex-1 px-4 py-2 sm:py-4 bg-slate-900/50 hover:bg-turf-500 hover:text-slate-900 border border-slate-700 text-white rounded-2xl text-sm font-black uppercase italic transition-all"
                            >
                                Yarın
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-3 sm:p-6 bg-slate-900/50 border-t border-slate-700 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-2 sm:py-4 bg-slate-700 hover:bg-slate-600 text-white font-black uppercase italic rounded-2xl transition-colors"
                    >
                        KAPAT
                    </button>
                </div>
            </div>
        </div>
    );
};
