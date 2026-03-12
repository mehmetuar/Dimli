import React from 'react';
import { Clock, Phone, AlertCircle } from 'lucide-react';
import { generateSlots, isPastSlot } from '../utils/pitchUtils';

interface PitchScheduleProps {
    business: any;
    selectedPitch: any;
    selectedDate: string;
    pitchAnnouncements: any[];
    reservations: any[];
    isAuthorized: boolean;
    openSlotDetail: (slotTime: string, slotEndTime: string, resList: any[], announcements: any[], approvedReservation?: any) => void;
    handleCreateAd: (pitchId: string, startTime: string) => void;
    handleReserve: (pitchId: string, startTime: string) => void;
}

export const PitchSchedule: React.FC<PitchScheduleProps> = ({
    business, selectedPitch, selectedDate, pitchAnnouncements, reservations,
    isAuthorized, openSlotDetail, handleCreateAd, handleReserve
}) => {
    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-bold text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-turf-500" /> {selectedPitch.name.toUpperCase()} AKIŞI
                </h4>
                <a
                    href={`tel:${business.phone}`}
                    className="bg-turf-600 hover:bg-turf-500 text-white px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-turf-600/20"
                >
                    <Phone className="w-4 h-4" />
                    <span className="hidden sm:inline">Rezervasyon Yap</span>
                    <span className="sm:hidden">Ara</span>
                </a>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {generateSlots(selectedPitch, business).map((slot: any, slotIdx: number) => {
                    const isPast = isPastSlot(slot.startTime, selectedDate);

                    if (isPast) {
                        return (
                            <div
                                key={slotIdx}
                                className="p-3 rounded-xl border border-slate-700 bg-slate-800/30 text-slate-600 opacity-50 cursor-not-allowed flex flex-col items-center justify-center min-h-[80px]"
                            >
                                <span className="text-[15px] sm:text-base font-black tracking-tighter leading-none">{slot.startTime}</span>
                                {slot.endTime && (
                                    <span className="text-[10px] font-bold opacity-75 mt-0.5">{slot.endTime}</span>
                                )}
                                <span className="text-[10px] font-bold mt-1.5 tracking-widest uppercase">GEÇTİ</span>
                            </div>
                        );
                    }

                    const [slotH, slotM] = slot.startTime.split(':').map(Number);

                    const announcements = pitchAnnouncements.filter((announcement: any) => {
                        const announcementTime = announcement.time || '';
                        const announcementDate = announcement.date || '';
                        return announcementDate === selectedDate && announcementTime.startsWith(slot.startTime) && announcement.matchType !== 'kendi_aramizda';
                    });
                    const hasAnnouncement = announcements.length > 0;

                    const slotReservations = reservations.filter((res: any) => {
                        const resTime = new Date(res.slotTime);
                        return resTime.getHours() === slotH && resTime.getMinutes() === (slotM || 0);
                    });

                    const approvedReservation = slotReservations.find((r: any) => r.status === 'APPROVED');
                    const pendingReservations = slotReservations.filter((r: any) => r.status === 'PENDING');
                    const hasPending = pendingReservations.length > 0;

                    let slotClass = '';
                    let label = '';
                    let subLabel = '';
                    let action: (() => void) | null = null;

                    if (hasPending && hasAnnouncement && !approvedReservation) {
                        slotClass = 'bg-slate-800 border-orange-500/50 text-orange-400 cursor-pointer hover:border-turf-500';
                        label = 'ONAY BEKLİYOR';
                        subLabel = 'RAKİP ARANIYOR';
                        action = () => openSlotDetail(slot.startTime, slot.endTime || '', pendingReservations, announcements);
                    }
                    else if (approvedReservation) {
                        slotClass = 'bg-red-900/20 border-red-900/50 text-red-700 cursor-pointer hover:opacity-80';
                        label = 'DOLU';
                        action = () => openSlotDetail(slot.startTime, slot.endTime || '', [], [], approvedReservation);
                    } else if (hasPending) {
                        slotClass = 'bg-orange-900/20 border-orange-500/50 text-orange-400 cursor-pointer hover:border-turf-500';
                        label = 'ONAY BEKLİYOR';
                        action = () => openSlotDetail(slot.startTime, slot.endTime || '', pendingReservations, announcements);
                    } else if (hasAnnouncement) {
                        slotClass = 'bg-orange-900/20 border-orange-500/50 text-orange-400 animate-pulse cursor-pointer hover:border-turf-500';
                        label = 'RAKİP ARANIYOR';
                        action = () => openSlotDetail(slot.startTime, slot.endTime || '', pendingReservations, announcements);
                    } else {
                        if (isAuthorized) {
                            slotClass = 'bg-slate-800 border-slate-700 text-slate-300 hover:border-turf-500 hover:text-white cursor-pointer';
                            label = 'BOŞ';
                            action = () => handleCreateAd(selectedPitch.id, slot.startTime);
                        } else if (slot.status === 'AVAILABLE') {
                            slotClass = 'bg-slate-800 border-slate-700 text-slate-300 hover:border-turf-500 hover:text-white cursor-pointer';
                            label = 'BOŞ';
                            action = () => handleReserve(selectedPitch.id, slot.startTime);
                        } else {
                            slotClass = 'bg-slate-800 border-slate-700 text-slate-500 opacity-60 cursor-not-allowed';
                            label = 'BOŞ';
                        }
                    }

                    return (
                        <div
                            key={slotIdx}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (action) action();
                            }}
                            className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center relative overflow-hidden group min-h-[80px] ${slotClass}`}
                        >
                            <span className="text-[15px] sm:text-base font-black tracking-tighter leading-none">{slot.startTime}</span>
                            {slot.endTime && (
                                <span className="text-[10px] font-bold opacity-75 mt-0.5 mb-1">{slot.endTime}</span>
                            )}

                            {subLabel ? (
                                <div className="flex flex-col items-center gap-1 mt-0.5">
                                    <span className="text-[9px] font-bold bg-orange-500/20 px-1.5 py-0.5 rounded tracking-wider text-orange-400 uppercase">{label}</span>
                                    <span className="text-[9px] font-bold text-turf-400 tracking-wider uppercase">{subLabel}</span>
                                </div>
                            ) : (
                                <span className="text-[10px] font-bold mt-0.5 tracking-widest uppercase">{label}</span>
                            )}

                            {slot.status === 'AVAILABLE' && isAuthorized && !approvedReservation && !hasPending && !hasAnnouncement && (
                                <div className="absolute inset-0 bg-turf-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white font-bold text-xs">+ İlan Aç</span>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Boş saatlere tıklayarak ilan açabilirsiniz. Dolu/Bekleyen saatlere tıklayarak detayları görebilirsiniz.
            </p>
        </div>
    );
};
