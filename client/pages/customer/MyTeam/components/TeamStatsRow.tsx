import React from 'react';
import { Star } from 'lucide-react';
import { Team } from '../../../../types';

interface TeamStatsRowProps {
    myTeam: Team;
    matchCount: number;
}

export const TeamStatsRow: React.FC<TeamStatsRowProps> = ({ myTeam, matchCount }) => {
    return (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-slate-800 p-2 sm:p-4 rounded-xl border border-slate-700 text-center flex flex-col justify-center min-w-0">
                <div className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase mb-1 truncate">Oynanan Maç</div>
                <div className="text-white font-sport text-xl sm:text-3xl font-bold">{matchCount}</div>
            </div>
            <div className="bg-slate-800 p-2 sm:p-4 rounded-xl border border-slate-700 text-center flex flex-col justify-center min-w-0">
                <div className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase mb-1 truncate">Fair Play</div>
                <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-yellow-400 font-sport text-lg sm:text-2xl font-bold">
                        {(myTeam.fairPlayScore || 5.0).toFixed(1)}
                    </span>
                </div>
            </div>
            <div className="bg-slate-800 p-2 sm:p-4 rounded-xl border border-slate-700 text-center flex flex-col justify-center min-w-0">
                <div className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase mb-1 truncate">Değerlendirme</div>
                <div className="text-turf-500 font-sport text-xl sm:text-3xl font-bold">
                    {myTeam.fairPlayRatingCount || 0}
                </div>
            </div>
        </div>
    );
};
