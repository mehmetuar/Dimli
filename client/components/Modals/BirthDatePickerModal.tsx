import React, { useState } from 'react';
import { X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface BirthDatePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (date: string) => void;
    selectedDate?: string; // YYYY-MM-DD
}

const MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];
const WEEK_DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const parseDate = (dateStr?: string) => {
    if (!dateStr) return { year: 1995, month: 0, day: 1 };
    const [y, m, d] = dateStr.split('-').map(Number);
    return { year: y || 1995, month: (m - 1) || 0, day: d || 1 };
};

const daysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();

const firstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Monday-first
};

export const BirthDatePickerModal: React.FC<BirthDatePickerModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    selectedDate,
}) => {
    const parsed = parseDate(selectedDate);
    const [year, setYear] = useState(parsed.year);
    const [month, setMonth] = useState(parsed.month);
    const [day, setDay] = useState(parsed.day);

    if (!isOpen) return null;

    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear - 5; y >= 1940; y--) years.push(y);

    const totalDays = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);

    // Clamp day when month/year changes
    const clampedDay = Math.min(day, totalDays);

    const handlePrevMonth = () => {
        if (month === 0) { setMonth(11); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    };

    const handleNextMonth = () => {
        const maxYear = currentYear - 5;
        if (month === 11) {
            if (year < maxYear) { setMonth(0); setYear(y => y + 1); }
        } else {
            setMonth(m => m + 1);
        }
    };

    const handleConfirm = () => {
        const d = Math.min(day, daysInMonth(year, month));
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        onSelect(dateStr);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-slate-800 w-full max-w-sm sm:rounded-3xl rounded-t-3xl border border-slate-700 overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-700 bg-slate-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-turf-500" />
                        <h3 className="text-white font-bold">Doğum Tarihi</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Year + Month navigation */}
                    <div className="flex items-center gap-2">
                        {/* Year dropdown */}
                        <select
                            value={year}
                            onChange={e => setYear(Number(e.target.value))}
                            className="flex-1 bg-slate-900 border border-slate-700 text-white font-bold rounded-xl px-3 py-2.5 focus:border-turf-500 focus:outline-none text-sm"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>

                        {/* Month navigation */}
                        <button
                            onClick={handlePrevMonth}
                            className="p-2.5 bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:border-turf-500 rounded-xl transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-white font-bold text-sm w-14 text-center">
                            {MONTHS[month]}
                        </span>
                        <button
                            onClick={handleNextMonth}
                            className="p-2.5 bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:border-turf-500 rounded-xl transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Day grid */}
                    <div>
                        {/* Week headers */}
                        <div className="grid grid-cols-7 mb-1">
                            {WEEK_DAYS.map(d => (
                                <div key={d} className="text-center text-[10px] font-black text-slate-500 py-1 uppercase">
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Days */}
                        <div className="grid grid-cols-7 gap-0.5">
                            {Array.from({ length: firstDay }).map((_, i) => (
                                <div key={`e-${i}`} />
                            ))}
                            {Array.from({ length: totalDays }).map((_, i) => {
                                const d = i + 1;
                                const isSelected = d === clampedDay;
                                return (
                                    <button
                                        key={d}
                                        onClick={() => setDay(d)}
                                        className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all
                                            ${isSelected
                                                ? 'bg-turf-600 text-white shadow-lg shadow-turf-600/20 scale-105'
                                                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                                            }`}
                                    >
                                        {d}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Selected date preview */}
                    <div className="bg-slate-900/60 rounded-xl px-4 py-3 border border-slate-700 text-center">
                        <span className="text-turf-400 font-black text-lg">
                            {clampedDay} {MONTHS[month]} {year}
                        </span>
                    </div>
                </div>

                {/* Confirm */}
                <div className="px-4 pb-5">
                    <button
                        onClick={handleConfirm}
                        className="w-full py-4 bg-gradient-to-r from-turf-600 to-turf-500 hover:from-turf-500 hover:to-turf-400 text-white font-black uppercase italic rounded-2xl transition-all shadow-lg shadow-turf-600/20"
                    >
                        Tarihi Onayla
                    </button>
                </div>
            </div>
        </div>
    );
};
