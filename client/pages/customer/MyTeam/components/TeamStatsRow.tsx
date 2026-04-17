import React from 'react';
import { Star } from 'lucide-react';
import { Team } from '../../../../types';

interface TeamStatsRowProps {
    myTeam: Team;
    matchCount: number;
}

export const TeamStatsRow: React.FC<TeamStatsRowProps> = ({ myTeam, matchCount }) => {
    return (
        <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                <div className="text-slate-400 text-xs font-bold uppercase mb-1">Oynanan Maç</div>
                <div className="text-white font-sport text-3xl font-bold">{matchCount}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                <div className="text-slate-400 text-xs font-bold uppercase mb-1">Fair Play</div>
                <div className="flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-yellow-400 font-sport text-2xl font-bold">
                        {(myTeam.fairPlayScore || 5.0).toFixed(1)}
                    </span>
                </div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                <div className="text-slate-400 text-xs font-bold uppercase mb-1">Değerlendirme</div>
                <div className="text-turf-500 font-sport text-3xl font-bold">
                    {myTeam.fairPlayRatingCount || 0}
                </div>
            </div>
        </div>
    );
};
