import React from 'react';
import { ChevronRight, Goal, TurkishLira, Clock, AlertTriangle } from 'lucide-react';

interface PitchListItemProps {
    pitch: any;
    onClick: () => void;
    isPending?: boolean;
    isSuspended?: boolean;
}

export const PitchListItem: React.FC<PitchListItemProps> = ({ pitch, onClick, isPending = false, isSuspended = false }) => {
    const isActive = pitch.isActive !== false;
    const approvalStatus = pitch.approvalStatus ?? 'approved';

    return (
        <button
            onClick={onClick}
            className="w-full bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 flex items-center gap-4 active:scale-[0.98] transition-all"
            style={{ WebkitTapHighlightColor: 'transparent', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}
        >
            {pitch.imageUrl ? (
                <img
                    src={pitch.imageUrl}
                    alt={pitch.name}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-600/50 flex-shrink-0"
                />
            ) : (
                <div className="w-14 h-14 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 flex-shrink-0">
                    <Goal className="w-6 h-6" />
                </div>
            )}

            <div className="flex-1 text-left min-w-0">
                <h3 className="text-[clamp(13px,3.8vw,15px)] font-black text-white leading-tight truncate">
                    {pitch.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[clamp(10px,2.8vw,12px)] text-slate-400">
                        {pitch.type === 'INDOOR' ? 'Kapalı Saha' : 'Açık Saha'}
                    </span>
                    <span className="text-slate-600">•</span>
                    <div className="flex items-center gap-0.5">
                        <TurkishLira className="w-3 h-3 text-slate-400" />
                        <span className="text-[clamp(10px,2.8vw,12px)] text-slate-400 font-bold">{pitch.pricePerHour}/sa</span>
                    </div>
                </div>
                {pitch.closedDays && pitch.closedDays.length > 0 && (
                    <p className="text-[clamp(9px,2.5vw,11px)] text-slate-500 mt-0.5">
                        {pitch.closedDays.length} kapalı gün
                    </p>
                )}
                {approvalStatus === 'rejected' && (
                    <div className="mt-2 flex items-start gap-1.5 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5">
                        <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-[clamp(9px,2.5vw,11px)] text-red-300 leading-relaxed">
                            {pitch.rejectionReason || 'Reddedildi'} — Düzenleyip tekrar gönderin.
                        </p>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
                {isSuspended ? (
                    <span className="text-[clamp(9px,2.5vw,11px)] font-bold px-2.5 py-1 rounded-lg border bg-red-500/10 text-red-400 border-red-500/25 whitespace-nowrap">
                        Askıda
                    </span>
                ) : approvalStatus === 'pending' ? (
                    <span className="flex items-center gap-1 text-[clamp(9px,2.5vw,11px)] font-bold px-2.5 py-1 rounded-lg border bg-orange-500/10 text-orange-400 border-orange-500/25 whitespace-nowrap">
                        <Clock className="w-3 h-3" /> Onay Bekliyor
                    </span>
                ) : approvalStatus === 'rejected' ? (
                    <span className="text-[clamp(9px,2.5vw,11px)] font-bold px-2.5 py-1 rounded-lg border bg-red-500/10 text-red-400 border-red-500/25 whitespace-nowrap">
                        Reddedildi
                    </span>
                ) : isPending ? (
                    <span className="text-[clamp(9px,2.5vw,11px)] font-bold px-2.5 py-1 rounded-lg border bg-orange-500/10 text-orange-400 border-orange-500/25 whitespace-nowrap">
                        Onay Bekliyor
                    </span>
                ) : (
                    <span className={`text-[clamp(9px,2.5vw,11px)] font-bold px-2.5 py-1 rounded-lg border ${isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                        : 'bg-red-500/10 text-red-400 border-red-500/25'
                    }`}>
                        {isActive ? 'Aktif' : 'Pasif'}
                    </span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>
        </button>
    );
};
