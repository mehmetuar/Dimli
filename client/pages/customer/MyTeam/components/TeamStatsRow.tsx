import React from 'react';
import { Star } from 'lucide-react';
import { Team } from '../../../../types';

interface TeamStatsRowProps {
    myTeam: Team;
    matchCount: number;
}

export const TeamStatsRow: React.FC<TeamStatsRowProps> = ({ myTeam, matchCount }) => {
    return (
        <div className="grid grid-cols-3 gap-2 sm:gap-3" data-tour-id="team-stats">
            <div className="bg-slate-800 p-2 sm:p-4 rounded-xl border border-slate-700 text-center flex flex-col justify-center min-w-0">
                <div className="text-slate-400 text-[8px] xs:text-[9px] sm:text-xs font-bold uppercase mb-1 leading-tight">Oynanan Maç</div>
                <div className="text-white font-sport text-base xs:text-xl sm:text-3xl font-bold">{matchCount}</div>
            </div>
            <div className="bg-slate-800 p-2 sm:p-4 rounded-xl border border-slate-700 text-center flex flex-col justify-center min-w-0">
                <div className="text-slate-400 text-[8px] xs:text-[9px] sm:text-xs font-bold uppercase mb-1 leading-tight">Fair Play</div>
                <div className="inline-flex items-center justify-center gap-0.5">
                    <Star className="w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-4 sm:h-4 text-green-500 fill-green-500 flex-shrink-0" />
                    <span className="text-green-500 font-sport text-sm xs:text-base sm:text-2xl font-bold">
                        {(myTeam.fairPlayScore || 5.0).toFixed(1)}
                    </span>
                </div>
            </div>
            <div className="bg-slate-800 p-2 sm:p-4 rounded-xl border border-slate-700 text-center flex flex-col justify-center min-w-0">
                <div className="text-slate-400 text-[8px] xs:text-[9px] sm:text-xs font-bold uppercase mb-1 leading-tight">Değerlendirme</div>
                <div className="text-turf-500 font-sport text-base xs:text-xl sm:text-3xl font-bold">
                    {myTeam.fairPlayRatingCount || 0}
                </div>
            </div>
        </div>
    );
};
