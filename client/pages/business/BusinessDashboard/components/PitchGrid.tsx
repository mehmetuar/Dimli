import React from 'react';

interface PitchGridProps {
    pitches: any[];
    selectedDate: string;
    isPastSlot: (time: string, date: string) => boolean;
    setSelectedSlot: (slot: any) => void;
}

export const PitchGrid: React.FC<PitchGridProps> = ({
    pitches,
    selectedDate,
    isPastSlot,
    setSelectedSlot
}) => {
    const formatTimeRange = (time: string): string => {
        if (time.includes(' - ')) return time;
        const [hour, minute] = time.split(':').map(Number);
        const endHour = (hour + 1) % 24;
        const endTime = `${endHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        return `${time} - ${endTime}`;
    };

    return (
        <div className="p-4 space-y-10">
            {pitches.map((pitch: any) => (
                <div key={pitch.pitchId} className="animate-fade-in">
                    <div className="flex items-center gap-3 mb-4 px-1">
                        <div className="w-1 h-6 bg-orange-600 rounded-full shadow-[0_0_10px_rgba(234,88,12,0.5)]" />
                        <h2 className="text-xl font-black italic uppercase tracking-tight text-slate-200">{pitch.pitchName}</h2>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {pitch.slots.map((slot: any, slotIdx: number) => {
                            const isPast = isPastSlot(slot.time, selectedDate);
                            const formattedTime = formatTimeRange(slot.time);

                            return (
                                <button
                                    key={slotIdx}
                                    onClick={() => {
                                        if (!isPast) {
                                            setSelectedSlot({ ...slot, pitchId: pitch.pitchId });
                                        }
                                    }}
                                    disabled={isPast}
                                    className={`
                    aspect-[1.1] p-2 rounded-2xl flex flex-col items-center justify-center border-2 transition-all relative overflow-hidden group
                    ${isPast ? 'bg-slate-800/40 border-slate-700/50 text-slate-400 opacity-90 cursor-not-allowed' : ''}
                    ${!isPast && slot.status === 'EMPTY' ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500' : ''}
                    ${!isPast && slot.status === 'PENDING' ? 'bg-orange-500/15 border-orange-500/60 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.15)]' : ''}
                    ${!isPast && slot.status === 'FULL' ? 'bg-red-500/15 border-red-500/60 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : ''}
                  `}
                                >
                                    <span className={`font-black tracking-tighter leading-none text-center ${formattedTime.includes(' - ') ? 'text-[15px] sm:text-base' : 'text-lg sm:text-xl'} ${isPast ? 'text-slate-400' : 'text-white'}`}>
                                        {formattedTime}
                                    </span>
                                    <span className={`text-[9px] sm:text-[10px] font-bold uppercase mt-1.5 tracking-widest ${isPast ? 'text-slate-500' : 'text-slate-400'} opacity-90`}>
                                        {isPast ? 'GEÇTİ' :
                                            slot.status === 'EMPTY' ? 'BOŞ' :
                                                slot.status === 'PENDING' ? 'Onay Bekliyor' : 'DOLU'}
                                    </span>

                                    {/* Cancellation Request Indicator */}
                                    {!isPast && slot.status === 'FULL' && slot.reservations?.some((r: any) => r.cancelRequested) && (
                                        <span className="text-[8px] font-black text-orange-500 uppercase tracking-tighter mt-0.5 animate-pulse">
                                            İptal İsteği
                                        </span>
                                    )}

                                    {/* Status Indicator Dot */}
                                    {!isPast && slot.status !== 'EMPTY' && (
                                        <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${slot.status === 'PENDING' ? 'bg-orange-500 animate-pulse' : 'bg-red-500'}`} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};
