import React from 'react';
import { ChevronRight, Goal } from 'lucide-react';

interface PitchListItemProps {
    pitch: any;
    onClick: () => void;
}

export const PitchListItem: React.FC<PitchListItemProps> = ({ pitch, onClick }) => {
    const isActive = pitch.isActive !== false;

    return (
        <button
            onClick={onClick}
            className="w-full bg-slate-800 p-4 rounded-2xl border border-slate-700 flex items-center justify-between hover:bg-slate-700 transition-colors group"
        >
            <div className="flex items-center gap-4">
                {/* Photo thumbnail or fallback icon */}
                {pitch.imageUrl ? (
                    <img
                        src={pitch.imageUrl}
                        alt={pitch.name}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-600 flex-shrink-0"
                    />
                ) : (
                    <div className="w-14 h-14 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 flex-shrink-0">
                        <Goal className="w-6 h-6" />
                    </div>
                )}

                <div className="text-left">
                    <h3 className="text-base font-bold text-white group-hover:text-orange-500 transition-colors">
                        {pitch.name}
                    </h3>
                    <div className="text-sm text-slate-400">
                        {pitch.type === 'INDOOR' ? 'Kapalı Saha' : 'Açık Saha'} • {pitch.pricePerHour} TL/Saat
                    </div>
                    {/* Closed days info */}
                    {pitch.closedDays && pitch.closedDays.length > 0 && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            Kapalı günler var
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
                {/* Active/Passive badge */}
                <span className={`text-[11px] font-bold px-2 py-1 rounded-lg ${isActive
                    ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                    : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}>
                    {isActive ? 'Aktif' : 'Pasif'}
                </span>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
            </div>
        </button>
    );
};
