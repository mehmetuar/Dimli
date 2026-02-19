import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DateSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (date: string) => void;
    selectedDate: string;
}

export const DateSelectionModal: React.FC<DateSelectionModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    selectedDate,
}) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        if (isOpen && selectedDate) {
            setCurrentMonth(new Date(selectedDate));
        }
    }, [isOpen, selectedDate]);

    if (!isOpen) return null;

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        // Adjust for Monday start (0=Sun, 1=Mon -> 0=Mon, 6=Sun)
        const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
        return { days, firstDay: adjustedFirstDay };
    };

    const { days, firstDay } = getDaysInMonth(currentMonth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const handlePrevMonth = () => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() - 1);
        // Don't go back past current month if it's the current month
        if (newDate.getFullYear() < today.getFullYear() ||
            (newDate.getFullYear() === today.getFullYear() && newDate.getMonth() < today.getMonth())) {
            return;
        }
        setCurrentMonth(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentMonth(newDate);
    };

    const handleDateClick = (day: number) => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        // Check if past date
        if (date < today) return;

        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onSelect(dateStr);
        onClose();
    };

    const isToday = (day: number) => {
        return today.getDate() === day &&
            today.getMonth() === currentMonth.getMonth() &&
            today.getFullYear() === currentMonth.getFullYear();
    };

    const isSelected = (day: number) => {
        if (!selectedDate) return false;
        const sel = new Date(selectedDate);
        return sel.getDate() === day &&
            sel.getMonth() === currentMonth.getMonth() &&
            sel.getFullYear() === currentMonth.getFullYear();
    };

    const isPast = (day: number) => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return date < today;
    };

    const months = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];

    const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 w-full max-w-sm rounded-3xl border border-slate-700 overflow-hidden shadow-2xl animate-scale-in">
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-turf-500" />
                        Tarih Seçin
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Calendar Controls */}
                <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={handlePrevMonth}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            disabled={currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear()}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="text-white font-bold text-lg">
                            {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </div>
                        <button
                            onClick={handleNextMonth}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Week Days */}
                    <div className="grid grid-cols-7 mb-2">
                        {weekDays.map(day => (
                            <div key={day} className="text-center text-xs font-bold text-slate-500 py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {/* Empty slots for start of month */}
                        {Array.from({ length: firstDay }).map((_, i) => (
                            <div key={`empty-${i}`} />
                        ))}

                        {/* Days */}
                        {Array.from({ length: days }).map((_, i) => {
                            const day = i + 1;
                            const disabled = isPast(day);
                            const selected = isSelected(day);
                            const current = isToday(day);

                            return (
                                <button
                                    key={day}
                                    onClick={() => handleDateClick(day)}
                                    disabled={disabled}
                                    className={`
                                        aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all
                                        ${selected
                                            ? 'bg-turf-600 text-white shadow-lg shadow-turf-600/20 scale-105'
                                            : disabled
                                                ? 'text-slate-600 cursor-not-allowed'
                                                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                                        }
                                        ${current && !selected ? 'border border-turf-500/50 text-turf-500' : ''}
                                    `}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
