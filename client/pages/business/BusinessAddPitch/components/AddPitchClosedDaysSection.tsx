import React from 'react';
import { Calendar } from 'lucide-react';

const DAYS = [
    { label: 'Pzt', fullLabel: 'Pazartesi', value: 'Monday' },
    { label: 'Sal', fullLabel: 'Salı',      value: 'Tuesday' },
    { label: 'Çar', fullLabel: 'Çarşamba',  value: 'Wednesday' },
    { label: 'Per', fullLabel: 'Perşembe',  value: 'Thursday' },
    { label: 'Cum', fullLabel: 'Cuma',      value: 'Friday' },
    { label: 'Cmt', fullLabel: 'Cumartesi', value: 'Saturday' },
    { label: 'Paz', fullLabel: 'Pazar',     value: 'Sunday' },
];

interface AddPitchClosedDaysSectionProps {
    closedDays: string[];
    onToggleDay: (day: string) => void;
}

export const AddPitchClosedDaysSection: React.FC<AddPitchClosedDaysSectionProps> = ({ closedDays, onToggleDay }) => {
    return (
        <div className="bg-slate-800/70 rounded-2xl border border-slate-700/60 overflow-hidden"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
            <div className="px-4 py-3.5 border-b border-slate-700/50"
                style={{ background: 'linear-gradient(90deg, rgba(249,115,22,0.06) 0%, transparent 100%)' }}>
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-orange-500/15 rounded-lg border border-orange-500/20">
                        <Calendar className="w-4 h-4 text-orange-400" />
                    </div>
                    <h2 className="text-[clamp(13px,3.8vw,15px)] font-black text-white">Kapalı Günler</h2>
                </div>
                <p className="text-[clamp(9px,2.5vw,11px)] text-slate-400 mt-1 ml-9">
                    Haftalık kapalı günleri seçin (varsa)
                </p>
            </div>
            <div className="p-4">
                <div className="grid grid-cols-7 gap-1.5">
                    {DAYS.map(day => {
                        const isClosed = closedDays.includes(day.value);
                        return (
                            <button
                                key={day.value}
                                type="button"
                                onClick={() => onToggleDay(day.value)}
                                className={`py-3 rounded-xl text-[clamp(9px,2.5vw,11px)] font-black transition-all border ${isClosed
                                    ? 'bg-red-500/15 border-red-500/50 text-red-400'
                                    : 'bg-slate-900/50 border-slate-700/50 text-slate-400'
                                    }`}
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                                {day.label}
                            </button>
                        );
                    })}
                </div>
                {closedDays.length > 0 && (
                    <p className="text-[clamp(9px,2.5vw,11px)] text-slate-500 mt-3">
                        Kapalı: {closedDays.map(d => DAYS.find(x => x.value === d)?.fullLabel).filter(Boolean).join(', ')}
                    </p>
                )}
            </div>
        </div>
    );
};
