import React from 'react';
import { Team } from '../../../../types';

interface TeamStatsRowProps {
    myTeam: Team;
}

export const TeamStatsRow: React.FC<TeamStatsRowProps> = ({ myTeam }) => {
    return (
        <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                <div className="text-slate-400 text-xs font-bold uppercase mb-1">Galibiyet</div>
                <div className="text-white font-sport text-3xl font-bold">{myTeam.wins || 0}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                <div className="text-slate-400 text-xs font-bold uppercase mb-1">Mağlubiyet</div>
                <div className="text-white font-sport text-3xl font-bold text-red-400">{myTeam.losses || 0}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                <div className="text-slate-400 text-xs font-bold uppercase mb-1">Kazanma Oranı</div>
                <div className="text-turf-500 font-sport text-3xl font-bold">
                    {(myTeam.wins || 0) + (myTeam.losses || 0) > 0
                        ? `%${Math.round(((myTeam.wins || 0) / ((myTeam.wins || 0) + (myTeam.losses || 0))) * 100)}`
                        : '%0'}
                </div>
            </div>
        </div>
    );
};
