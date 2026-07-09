import React from 'react';
import { X } from 'lucide-react';
import { CalendarPicker } from '../../../../components/UI/CalendarPicker';

interface BusinessDateFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: string;
    onSelect: (date: string) => void;
}

export const BusinessDateFilterModal: React.FC<BusinessDateFilterModalProps> = ({
    isOpen,
    onClose,
    selectedDate,
    onSelect,
}) => {
    if (!isOpen) return null;

    const minDate = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        return d;
    })();

    const maxDate = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d;
    })();

    return (
        <div
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-slate-800 w-full max-w-md sm:rounded-3xl rounded-t-3xl border border-slate-700/60 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-3 sm:p-6 border-b border-slate-700/50 bg-slate-800/80 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="font-sport font-black text-xl sm:text-2xl text-white italic uppercase tracking-wide">
                            TARİH <span className="text-orange-500">SEÇ</span>
                        </h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-tighter">
                            Son 3 ay – gelecek 1 ay arası seçilebilir
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-700/60 rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-3 sm:p-6 space-y-3 sm:space-y-6 overflow-y-auto">
                    <CalendarPicker
                        selectedDate={selectedDate}
                        onDateSelect={(date) => {
                            onSelect(date);
                            setTimeout(onClose, 200);
                        }}
                        minDate={minDate}
                        maxDate={maxDate}
                        variant="orange"
                    />

                    {/* Hızlı Seçim */}
                    <div className="space-y-2 sm:space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                            Hızlı Seçim
                        </label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    const today = new Date();
                                    const formatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                    onSelect(formatted);
                                    onClose();
                                }}
                                className="flex-1 px-4 py-2 sm:py-4 bg-slate-700/60 hover:bg-orange-500 hover:text-white border border-slate-600/50 text-white rounded-2xl text-sm font-black uppercase italic transition-all"
                            >
                                Bugün
                            </button>
                            <button
                                onClick={() => {
                                    const tomorrow = new Date();
                                    tomorrow.setDate(tomorrow.getDate() + 1);
                                    const formatted = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
                                    onSelect(formatted);
                                    onClose();
                                }}
                                className="flex-1 px-4 py-2 sm:py-4 bg-slate-700/60 hover:bg-orange-500 hover:text-white border border-slate-600/50 text-white rounded-2xl text-sm font-black uppercase italic transition-all"
                            >
                                Yarın
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-3 sm:p-6 bg-slate-800/60 border-t border-slate-700/50 flex-shrink-0">
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
