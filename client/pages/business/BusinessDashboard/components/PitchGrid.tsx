import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CalendarX, Settings, Clock, AlertTriangle } from 'lucide-react';

interface PitchGridProps {
    pitches: any[];
    selectedDate: string;
    isPastSlot: (time: string, date: string) => boolean;
    setSelectedSlot: (slot: any) => void;
    isPending?: boolean;
    focusPitchId?: string | null;
}

export const PitchGrid: React.FC<PitchGridProps> = ({
    pitches,
    selectedDate,
    isPastSlot,
    setSelectedSlot,
    isPending = false,
    focusPitchId = null,
}) => {
    const [activePitchIndex, setActivePitchIndex] = useState(0);
    const navigate = useNavigate();

    // Bildirimden gelinen sahanın sekmesini öne al (slot auto-open ile birlikte,
    // modal kapanınca kullanıcı doğru sahada kalır). Kullanıcının sonraki manuel
    // sekme seçimini ezmemek için yalnız focusPitchId değişince çalışır.
    useEffect(() => {
        if (!focusPitchId) return;
        const idx = pitches.findIndex((p: any) => p.pitchId === focusPitchId);
        if (idx >= 0) setActivePitchIndex(idx);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusPitchId]);

    const formatTimeRange = (time: string): string => {
        if (time.includes(' - ')) return time;
        const [hour, minute] = time.split(':').map(Number);
        const endHour = (hour + 1) % 24;
        const endTime = `${endHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        return `${time} - ${endTime}`;
    };

    // Plan düşürmede silinmesi planlanan sahanın silinme tarihi (İstanbul).
    const deletionDateLabel = (value: string | null | undefined): string =>
        value
            ? new Date(value).toLocaleDateString('tr-TR', {
                  timeZone: 'Europe/Istanbul',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
              })
            : '';

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
                                ${scrollable ? 'flex-shrink-0 px-6' : 'w-full px-2'}
                                py-3 rounded-full font-black italic uppercase tracking-wider text-[clamp(11px,3.5vw,13px)] transition-all border
                                ${activePitchIndex === idx
                                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 border-orange-400/50 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)]'
                                    : 'bg-slate-600/60 backdrop-blur-md border-slate-500/50 text-slate-200 hover:bg-slate-500/60 hover:text-white hover:border-slate-400'
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

                    {activePitch.approvalStatus === 'pending' ? (
                        <div className="flex flex-col items-center justify-center py-14 bg-slate-800/40 backdrop-blur-md rounded-3xl border border-white/10 text-center px-6 relative overflow-hidden shadow-lg animate-fade-in">
                            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent" />
                            <div className="w-16 h-16 bg-orange-500/10 rounded-[24px] flex items-center justify-center mb-5 border border-orange-500/20 shadow-inner relative z-10">
                                <Clock className="w-7 h-7 text-orange-400 drop-shadow-md" />
                            </div>
                            <h3 className="text-white font-black text-[clamp(15px,4.5vw,19px)] uppercase tracking-widest mb-3 relative z-10 drop-shadow-sm">SAHANIZ ONAY BEKLİYOR</h3>
                            <p className="text-slate-300 text-[clamp(12px,3.5vw,14px)] leading-relaxed max-w-sm mb-8 relative z-10 font-medium">
                                Saha bilgileriniz admin incelemesindedir. Onaylandığında saat slotları aktif hale gelecek ve rezervasyon almaya başlayabileceksiniz.
                            </p>
                            <button
                                onClick={() => navigate(`/business/settings/pitches/${activePitch.pitchId}`)}
                                className="flex items-center gap-2.5 bg-slate-700/80 hover:bg-slate-600/80 text-white font-bold px-6 py-3.5 rounded-2xl transition-all border border-white/10 relative z-10 shadow-lg active:scale-95"
                            >
                                <Settings className="w-4.5 h-4.5 shrink-0" />
                                <span>Saha Ayarlarını Görüntüle</span>
                            </button>
                        </div>
                    ) : activePitch.approvalStatus === 'rejected' ? (
                        <div className="flex flex-col items-center justify-center py-14 bg-slate-800/40 backdrop-blur-md rounded-3xl border border-white/10 text-center px-6 relative overflow-hidden shadow-lg animate-fade-in">
                            <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent" />
                            <div className="w-16 h-16 bg-red-500/10 rounded-[24px] flex items-center justify-center mb-5 border border-red-500/20 shadow-inner relative z-10">
                                <AlertTriangle className="w-7 h-7 text-red-400 drop-shadow-md" />
                            </div>
                            <h3 className="text-white font-black text-[clamp(15px,4.5vw,19px)] uppercase tracking-widest mb-3 relative z-10 drop-shadow-sm">SAHANIZ REDDEDİLDİ</h3>
                            <p className="text-red-300 font-medium text-[clamp(12px,3.5vw,14px)] leading-relaxed max-w-sm mb-2 bg-red-950/40 border border-red-500/20 shadow-inner rounded-xl px-4 py-3 relative z-10">
                                {activePitch.rejectionReason || 'Sebep belirtilmedi.'}
                            </p>
                            <p className="text-slate-300 text-[clamp(12px,3.5vw,14px)] font-medium leading-relaxed max-w-sm mb-8 mt-2 relative z-10">
                                Bilgileri düzenleyip yeniden onaya gönderebilirsiniz.
                            </p>
                            <button
                                onClick={() => navigate(`/business/settings/pitches/${activePitch.pitchId}`)}
                                className="flex items-center gap-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold px-6 py-3.5 rounded-2xl transition-all border border-orange-400/50 relative z-10 shadow-[0_0_20px_rgba(249,115,22,0.3)] active:scale-95"
                            >
                                <Settings className="w-4.5 h-4.5 shrink-0" />
                                <span>Saha Ayarlarına Git</span>
                            </button>
                        </div>
                    ) : isPending ? (
                        <div className="flex flex-col items-center justify-center py-14 bg-slate-800/40 backdrop-blur-md rounded-3xl border border-white/10 text-center px-6 relative overflow-hidden shadow-lg animate-fade-in">
                            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent" />
                            <div className="w-16 h-16 bg-orange-500/10 rounded-[24px] flex items-center justify-center mb-5 border border-orange-500/20 shadow-inner relative z-10">
                                <Clock className="w-7 h-7 text-orange-400 drop-shadow-md" />
                            </div>
                            <h3 className="text-white font-black text-[clamp(15px,4.5vw,19px)] uppercase tracking-widest mb-3 relative z-10 drop-shadow-sm">ONAY BEKLİYOR</h3>
                            <p className="text-slate-300 text-[clamp(12px,3.5vw,14px)] font-medium leading-relaxed max-w-sm relative z-10">
                                İşletmeniz onaylandığında saat slotları aktif hale gelecek ve rezervasyon almaya başlayabileceksiniz.
                            </p>
                        </div>
                    ) : activePitch.isClosed ? (
                        <div className="flex flex-col items-center justify-center py-16 bg-slate-800/40 backdrop-blur-md rounded-3xl border border-white/10 text-center px-6 shadow-lg animate-fade-in relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent" />
                            {activePitch.closedReason === 'PASSIVE' ? (
                                <>
                                    <div className="w-16 h-16 bg-red-500/10 rounded-[24px] flex items-center justify-center mb-5 border border-red-500/20 shadow-inner relative z-10">
                                        <Lock className="w-7 h-7 text-red-400 drop-shadow-md" />
                                    </div>
                                    <h3 className="text-white font-black text-[clamp(15px,4.5vw,19px)] uppercase tracking-widest mb-3 relative z-10 drop-shadow-sm">SAHA KAPALI</h3>
                                    {activePitch.scheduledDeletionAt ? (
                                        <p className="text-slate-300 font-medium text-[clamp(12px,3.5vw,14px)] mb-8 leading-relaxed relative z-10">
                                            Plan düşürme talebiniz nedeniyle bu saha{' '}
                                            <span className="text-orange-400 font-black">{deletionDateLabel(activePitch.scheduledDeletionAt)}</span>{' '}
                                            tarihinde otomatik silinecek. O tarihe kadar dilerseniz ayarlardan tekrar aktifleştirip rezervasyon alabilirsiniz.
                                        </p>
                                    ) : (
                                        <p className="text-slate-300 font-medium text-[clamp(12px,3.5vw,14px)] mb-8 relative z-10">Bu saha şu an pasif konumdadır. Rezervasyon alınamaz.</p>
                                    )}
                                    <button
                                        onClick={() => navigate(`/business/settings/pitches/${activePitch.pitchId}`)}
                                        className="flex items-center gap-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold px-6 py-3.5 rounded-2xl transition-all border border-orange-400/50 relative z-10 shadow-[0_0_20px_rgba(249,115,22,0.3)] active:scale-95"
                                    >
                                        <Settings className="w-4.5 h-4.5 shrink-0" />
                                        <span>Ayarlara Git</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-slate-700/50 rounded-[24px] flex items-center justify-center mb-5 border border-white/10 shadow-inner relative z-10">
                                        <CalendarX className="w-7 h-7 text-slate-400 drop-shadow-md" />
                                    </div>
                                    <h3 className="text-white font-black text-[clamp(15px,4.5vw,19px)] uppercase tracking-widest mb-3 relative z-10 drop-shadow-sm">BUGÜN KAPALI</h3>
                                    <p className="text-slate-300 font-medium text-[clamp(12px,3.5vw,14px)] relative z-10">Bu gün için saha kapalı olarak ayarlanmıştır.</p>
                                </>
                            )}
                        </div>
                    ) : (
                    <>
                    {/* Silinmesi planlanmış ama owner tarafından geri aktifleştirilmiş saha:
                        slotlar çalışır, üstte silinme tarihi uyarısı gösterilir. */}
                    {activePitch.scheduledDeletionAt && (
                        <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3.5 py-3 mb-3">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-amber-200/90 text-xs leading-relaxed">
                                Bu saha{' '}
                                <span className="font-bold text-amber-300">{deletionDateLabel(activePitch.scheduledDeletionAt)}</span>{' '}
                                tarihinde plan düşürme nedeniyle otomatik silinecek — o tarihe kadar rezervasyon alabilirsiniz. Bu tarih sonrası için rezervasyon kabul edilmez.
                            </p>
                        </div>
                    )}
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {activePitch.slots.map((slot: any, slotIdx: number) => {
                            const isPast = isPastSlot(slot.time, selectedDate);
                            const formattedTime = formatTimeRange(slot.time);

                            return (
                                <button
                                    key={slotIdx}
                                    onClick={() => {
                                        // Geçmiş slotlar da açılır — modal geçmiş modunda
                                        // (boş geçti / oynandı / süresi geçmiş istek) pasif gösterir.
                                        setSelectedSlot({ ...slot, pitchId: activePitch.pitchId });
                                    }}
                                    className={`
                                        aspect-[1.1] p-2 rounded-2xl flex flex-col items-center justify-center border backdrop-blur-sm transition-all relative overflow-hidden active:scale-95 shadow-sm
                                        ${isPast && slot.status === 'FULL'
                                            ? 'bg-emerald-900/30 border-emerald-700/40 shadow-inner'
                                            : isPast
                                                ? 'bg-slate-800/60 border-slate-700/50 shadow-inner'
                                                : ''}
                                        ${!isPast && slot.status === 'EMPTY'
                                            ? 'bg-slate-700/80 border-slate-400/60 hover:border-white/40 hover:bg-slate-600'
                                            : ''}
                                        ${!isPast && slot.status === 'PENDING'
                                            ? 'bg-orange-500/10 border-orange-500/40 shadow-[inset_0_0_20px_rgba(249,115,22,0.1),0_4px_15px_rgba(249,115,22,0.15)]'
                                            : ''}
                                        ${!isPast && slot.status === 'FULL'
                                            ? 'bg-red-500/10 border-red-500/40 shadow-[inset_0_0_20px_rgba(239,68,68,0.1),0_4px_15px_rgba(239,68,68,0.15)]'
                                            : ''}
                                    `}
                                >
                                    <span className={`
                                        font-black tracking-tighter leading-none text-center !whitespace-nowrap
                                        ${formattedTime.includes(' - ') ? 'text-[clamp(11px,3.5vw,15px)]' : 'text-[clamp(14px,4vw,20px)]'}
                                        ${isPast ? 'text-slate-400 drop-shadow-sm' : 'text-white'}
                                    `}>
                                        {formattedTime}
                                    </span>

                                    <span className={`
                                        text-[clamp(8px,2.2vw,10px)] font-bold uppercase mt-1.5 tracking-widest !whitespace-nowrap overflow-hidden text-ellipsis
                                        ${isPast
                                            ? slot.status === 'FULL' ? 'text-emerald-400/80 drop-shadow-sm' : 'text-slate-500 drop-shadow-sm'
                                            : slot.status === 'EMPTY' ? 'text-white drop-shadow-sm'
                                                : slot.status === 'PENDING' ? 'text-orange-400'
                                                    : 'text-red-400'}
                                    `}>
                                        {isPast
                                            ? slot.status === 'FULL' ? 'OYNANDI' : 'GEÇTİ'
                                            : slot.status === 'EMPTY' ? 'BOŞ'
                                                : slot.status === 'PENDING' ? 'ONAY BEKLİYOR'
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
                    </>
                    )}
                </div>
            )}
        </div>
    );
};
