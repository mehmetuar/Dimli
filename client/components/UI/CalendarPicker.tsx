import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarPickerProps {
    selectedDate: string; // YYYY-MM-DD
    onDateSelect: (date: string) => void;
    minDate?: Date;
    maxDate?: Date;
    variant?: 'default' | 'orange';
}

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
    selectedDate,
    onDateSelect,
    minDate = new Date(),
    maxDate = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d;
    })(),
    variant = 'default'
}) => {
    const accent = variant === 'orange'
        ? {
            hover: 'hover:bg-orange-500/20',
            selected: 'bg-orange-500 text-white ring-4 ring-orange-500/20 scale-110 z-10',
            todayBorder: 'border border-orange-500/50 text-orange-400',
            dot: 'bg-orange-500',
            wrapper: 'bg-slate-800/50 border-slate-700/50',
        }
        : {
            hover: 'hover:bg-turf-500/20',
            selected: 'bg-turf-500 text-slate-900 ring-4 ring-turf-500/20 scale-110 z-10',
            todayBorder: 'border border-turf-500/50 text-turf-400',
            dot: 'bg-turf-500',
            wrapper: 'bg-slate-900/50 border-slate-700/50',
        };
    const [viewDate, setViewDate] = useState(new Date(selectedDate || new Date()));

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const monthNames = [
        "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
    ];

    const dayNames = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const isDateDisabled = (date: Date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);

        const min = new Date(minDate);
        min.setHours(0, 0, 0, 0);

        const max = new Date(maxDate);
        max.setHours(0, 0, 0, 0);

        return d < min || d > max;
    };

    // FIX: Parse selectedDate string directly instead of via new Date()
    // to avoid timezone conversion issues (e.g. UTC+3 shifting date back 1 day)
    const isSelected = (date: Date) => {
        if (!selectedDate) return false;
        const [year, month, day] = selectedDate.split('-').map(Number);
        return (
            date.getDate() === day &&
            date.getMonth() === month - 1 &&
            date.getFullYear() === year
        );
    };

    const renderDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const days = [];
        const totalDays = daysInMonth(year, month);
        let firstDay = firstDayOfMonth(year, month);

        // Adjust for Monday start (0=Sunday, 1=Monday... 6=Saturday)
        // JS: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
        // Desired: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
        firstDay = firstDay === 0 ? 6 : firstDay - 1;

        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="w-full aspect-square"></div>);
        }

        for (let day = 1; day <= totalDays; day++) {
            const date = new Date(year, month, day);
            const disabled = isDateDisabled(date);
            const selected = isSelected(date);
            const isToday = new Date().toDateString() === date.toDateString();

            days.push(
                <button
                    key={day}
                    disabled={disabled}
                    onClick={() => {
                        // FIX: Use local date parts instead of toISOString() which converts
                        // to UTC and causes a 1-day shift in UTC+ timezones (e.g. Turkey UTC+3)
                        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                        onDateSelect(formattedDate);
                    }}
                    className={`
                        w-full aspect-square rounded-xl flex items-center justify-center text-xs sm:text-sm font-bold transition-all relative
                        ${disabled ? 'text-slate-700 cursor-not-allowed' : `text-white ${accent.hover}`}
                        ${selected ? accent.selected : ''}
                        ${isToday && !selected ? accent.todayBorder : ''}
                    `}
                >
                    {day}
                    {isToday && !selected && (
                        <span className={`absolute bottom-1 w-1 h-1 ${accent.dot} rounded-full`}></span>
                    )}
                </button>
            );
        }

        return days;
    };

    return (
        <div className={`${accent.wrapper} rounded-2xl p-2 sm:p-4 border backdrop-blur-sm`}>
            <div className="flex items-center justify-between mb-2 sm:mb-4">
                <button
                    onClick={handlePrevMonth}
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="font-sport font-black text-white italic uppercase tracking-wider">
                    {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
                </h3>
                <button
                    onClick={handleNextMonth}
                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
                {dayNames.map(day => (
                    <div key={day} className="w-full aspect-square flex items-center justify-center text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {renderDays()}
            </div>
        </div>
    );
};