import React, { useMemo } from 'react';
import { X, Clock, AlertTriangle } from 'lucide-react';
import { Business, Pitch } from '../../types';
import { useModalBodyClass } from '../../utils/useModalBodyClass';

interface TimeSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (time: string) => void;
    selectedTime: string;
    business?: Business;
    pitch?: Pitch | any;
    selectedDate: string;
    bookedHours?: string[]; // Changed to string[] to support HH:MM
}

export const TimeSelectionModal: React.FC<TimeSelectionModalProps> = (props) => {
    useModalBodyClass(props.isOpen);
    if (!props.isOpen) return null;
    return <TimeSelectionModalContent {...props} />;
};

const TimeSelectionModalContent: React.FC<TimeSelectionModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    selectedTime,
    business,
    pitch,
    selectedDate,
    bookedHours = [],
}) => {
    const timeSlots = useMemo(() => {
        if (!business && !pitch) return [];

        // 1. DYNAMIC SLOTS (from pitch)
        if (pitch?.timeSlots && pitch.timeSlots.length > 0) {
            return pitch.timeSlots
                .filter((ts: any) => ts.isActive !== false)
                .map((ts: any) => {
                    const timeStr = ts.startTime;
                    const label = `${ts.startTime} – ${ts.endTime}`;

                    // Check past
                    const [h, m] = ts.startTime.split(':').map(Number);
                    const now = new Date();
                    const slotDate = new Date(selectedDate);
                    slotDate.setHours(h, m || 0, 0, 0);
                    const isPast = slotDate < now;

                    const isBooked = bookedHours.includes(ts.startTime);

                    return {
                        value: timeStr,
                        label,
                        isPast,
                        isBooked
                    };
                })
                .sort((a: any, b: any) => a.value.localeCompare(b.value));
        }

        // 2. FALLBACK HOURLY SLOTS
        // Parse open/close times (e.g. "09:00", "23:00")
        const openTime = pitch?.openTime || business?.openTime || '09:00';
        const closeTime = pitch?.closeTime || business?.closeTime || '23:00';

        const openHour = parseInt(openTime.split(':')[0]);
        const closeHour = parseInt(closeTime.split(':')[0]);

        const slots = [];
        for (let h = openHour; h < closeHour; h++) {
            const timeStr = `${String(h).padStart(2, '0')}:00`;
            const label = `${String(h).padStart(2, '0')}:00 – ${String(h + 1).padStart(2, '0')}:00`;

            const now = new Date();
            const slotDate = new Date(selectedDate);
            slotDate.setHours(h, 0, 0, 0);
            const isPast = slotDate < now;

            const isBooked = bookedHours.includes(timeStr);

            slots.push({
                value: timeStr,
                label,
                isPast,
                isBooked,
                hour: h
            });
        }
        return slots;
    }, [business, pitch, selectedDate, bookedHours]);

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
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
