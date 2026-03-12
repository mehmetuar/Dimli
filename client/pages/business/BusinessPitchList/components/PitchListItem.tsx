import React from 'react';
import { ChevronRight, Goal } from 'lucide-react';

interface PitchListItemProps {
    pitch: any;
    onClick: () => void;
}

export const PitchListItem: React.FC<PitchListItemProps> = ({ pitch, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="w-full bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center justify-between hover:bg-slate-700 transition-colors group"
        >
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                    <Goal className="w-6 h-6" />
                </div>
                <div className="text-left">
                    <h3 className="text-lg font-bold text-white group-hover:text-orange-500 transition-colors">{pitch.name}</h3>
                    <div className="text-sm text-slate-400">
                        {pitch.type === 'INDOOR' ? 'Kapalı Saha' : 'Açık Saha'} • {pitch.pricePerHour} TL/Saat
                    </div>
                </div>
            </div>
            <ChevronRight className="w-6 h-6 text-slate-500 group-hover:text-white transition-colors" />
        </button>
    );
};
