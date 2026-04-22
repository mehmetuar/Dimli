import React, { useState } from 'react';

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
    const [activePitchIndex, setActivePitchIndex] = useState(0);

    const formatTimeRange = (time: string): string => {
        if (time.includes(' - ')) return time;
        const [hour, minute] = time.split(':').map(Number);
        const endHour = (hour + 1) % 24;
        const endTime = `${endHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        return `${time} - ${endTime}`;
    };

    const activePitch = pitches[activePitchIndex];
    const scrollable = pitches.length > 4;

    return (
        <div className="space-y-4">
            {/* Pitch Switcher Tabs */}
            {pitches.length > 1 && (
                <div
                    className={`
                        ${scrollable
                            ? 'flex overflow-x-auto gap-2 px-4 pt-4 scrollbar-hide'
                            : 'grid px-4 pt-4 gap-2'
                        }
                    `}
                    style={!scrollable ? { gridTemplateColumns: `repeat(${pitches.length}, 1fr)` } : undefined}
                >
                    {pitches.map((pitch: any, idx: number) => (
                        <button
                            key={pitch.pitchId}
                            onClick={() => setActivePitchIndex(idx)}
                            className={`
                                ${scrollable ? 'flex-shrink-0 px-5' : 'w-full px-2'}
                                py-2.5 rounded-xl font-black italic uppercase tracking-tight text-sm transition-all border-2
                                ${activePitchIndex === idx
                                    ? 'bg-orange-500 border-orange-500 text-white shadow-[0_0_16px_rgba(249,115,22,0.4)]'
                                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white'
                                }
                            `}
                        >
                            {pitch.pitchName}
                        </button>
                    ))}
                </div>
            )}

            {/* Active Pitch */}
            {activePitch && (
                <div className="px-4 pb-4 animate-fade-in">
                    <div className="flex items-center gap-3 mb-4 px-1">
                        <div className="w-1 h-6 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.6)]" />
                        <h2 className="text-xl font-black italic uppercase tracking-tight text-white">
                            {activePitch.pitchName}
                        </h2>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {activePitch.slots.map((slot: any, slotIdx: number) => {
                            const isPast = isPastSlot(slot.time, selectedDate);
                            const formattedTime = formatTimeRange(slot.time);

                            return (
                                <button
                                    key={slotIdx}
                                    onClick={() => {
                                        if (!isPast) {
                                            setSelectedSlot({ ...slot, pitchId: activePitch.pitchId });
                                        }
                                    }}
                                    disabled={isPast}
                                    className={`
                                        aspect-[1.1] p-2 rounded-2xl flex flex-col items-center justify-center border-2 transition-all relative overflow-hidden
                                        ${isPast
                                            ? 'bg-slate-800/60 border-slate-700/40 cursor-not-allowed'
                                            : ''}
                                        ${!isPast && slot.status === 'EMPTY'
                                            ? 'bg-[#131f35] border-slate-700/50 hover:border-slate-500 hover:bg-[#1a2844]'
                                            : ''}
                                        ${!isPast && slot.status === 'PENDING'
                                            ? 'bg-orange-500/20 border-orange-500/70 shadow-[0_0_16px_rgba(249,115,22,0.2)]'
                                            : ''}
                                        ${!isPast && slot.status === 'FULL'
                                            ? 'bg-red-500/20 border-red-500/70 shadow-[0_0_16px_rgba(239,68,68,0.2)]'
                                            : ''}
                                    `}
                                >
                                    <span className={`
                                        font-black tracking-tighter leading-none text-center
                                        ${formattedTime.includes(' - ') ? 'text-[14px] sm:text-[15px]' : 'text-lg sm:text-xl'}
                                        ${isPast ? 'text-slate-500' : 'text-white'}
                                    `}>
                                        {formattedTime}
                                    </span>

                                    <span className={`
                                        text-[9px] sm:text-[10px] font-bold uppercase mt-1.5 tracking-widest
                                        ${isPast ? 'text-slate-600'
                                            : slot.status === 'EMPTY' ? 'text-slate-400'
                                                : slot.status === 'PENDING' ? 'text-orange-400'
                                                    : 'text-red-400'}
                                    `}>
                                        {isPast ? 'GEÇTİ'
                                            : slot.status === 'EMPTY' ? 'BOŞ'
                                                : slot.status === 'PENDING' ? 'Onay Bekliyor'
                                                    : 'DOLU'}
                                    </span>

                                    {/* Cancellation Request */}
                                    {!isPast && slot.status === 'FULL' && slot.reservations?.some((r: any) => r.cancelRequested) && (
                                        <span className="text-[8px] font-black text-orange-400 uppercase tracking-tighter mt-0.5 animate-pulse">
                                            İptal İsteği
                                        </span>
                                    )}

                                    {/* Status Dot */}
                                    {!isPast && slot.status !== 'EMPTY' && (
                                        <div className={`
                                            absolute top-2 right-2 w-1.5 h-1.5 rounded-full
                                            ${slot.status === 'PENDING' ? 'bg-orange-400 animate-pulse' : 'bg-red-400'}
                                        `} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
