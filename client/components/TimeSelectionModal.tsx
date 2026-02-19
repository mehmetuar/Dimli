import React, { useMemo } from 'react';
import { X, Clock, AlertTriangle } from 'lucide-react';
import { Business } from '../types';

interface TimeSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (time: string) => void;
    selectedTime: string;
    business?: Business;
    selectedDate: string;
    bookedHours?: number[];
}

export const TimeSelectionModal: React.FC<TimeSelectionModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    selectedTime,
    business,
    selectedDate,
    bookedHours = [],
}) => {
    if (!isOpen) return null;

    const timeSlots = useMemo(() => {
        if (!business) return [];

        // Parse open/close times (e.g. "09:00", "23:00")
        const openHour = business.openTime ? parseInt(business.openTime.split(':')[0]) : 9;
        const closeHour = business.closeTime ? parseInt(business.closeTime.split(':')[0]) : 24; // Default 24 if missing

        const slots = [];
        for (let h = openHour; h < closeHour; h++) {
            const timeStr = `${h}:00`;
            const label = `${String(h).padStart(2, '0')}:00 – ${String(h + 1).padStart(2, '0')}:00`;

            // Check past time
            let isPast = false;
            const todayStr = new Date().toISOString().split('T')[0];
            if (selectedDate === todayStr) {
                const currentHour = new Date().getHours();
                if (h <= currentHour) {
                    isPast = true;
                }
            }

            const isBooked = bookedHours.includes(h);

            slots.push({
                value: timeStr,
                label,
                isPast,
                isBooked,
                hour: h
            });
        }
        return slots;
    }, [business, selectedDate, bookedHours]);

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 w-full max-w-sm rounded-3xl border border-slate-700 overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
                    <div>
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <Clock className="w-5 h-5 text-turf-500" />
                            Saat Seçin
                        </h3>
                        {business && (
                            <p className="text-xs text-slate-400 mt-1">
                                {business.name} çalışma saatleri: {business.openTime || '09:00'} - {business.closeTime || '24:00'}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Time Slots List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {timeSlots.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>Uygun saat bulunamadı.</p>
                        </div>
                    ) : (
                        timeSlots.map((slot) => (
                            <button
                                key={slot.value}
                                onClick={() => {
                                    if (!slot.isPast && !slot.isBooked) {
                                        onSelect(slot.value);
                                        onClose();
                                    }
                                }}
                                disabled={slot.isPast || slot.isBooked}
                                className={`
                                    w-full p-4 rounded-xl flex items-center justify-between transition-all group
                                    ${selectedTime === slot.value
                                        ? 'bg-turf-600/20 border border-turf-500 text-white'
                                        : slot.isBooked
                                            ? 'bg-red-900/30 border border-red-900/50 text-red-400 cursor-not-allowed'
                                            : slot.isPast
                                                ? 'bg-slate-900/30 text-slate-600 cursor-not-allowed border border-transparent'
                                                : 'bg-slate-900/50 text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent hover:border-slate-600'
                                    }
                                `}
                            >
                                <span className="font-bold font-mono text-lg">{slot.label}</span>
                                {selectedTime === slot.value && (
                                    <div className="w-3 h-3 rounded-full bg-turf-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                )}
                                {slot.isBooked && (
                                    <span className="text-xs font-bold uppercase tracking-wider text-red-500">DOLU</span>
                                )}
                                {slot.isPast && !slot.isBooked && (
                                    <span className="text-xs font-bold uppercase tracking-wider">Geçmiş</span>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
