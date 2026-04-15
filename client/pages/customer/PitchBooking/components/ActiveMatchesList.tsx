import React from 'react';
import { Calendar, Shield, X, Trophy, Clock, Users } from 'lucide-react';
import { Team } from '../../../../types';
import { LevelBadge } from '../../../../components/UI/LevelBadge';
import { FairPlayScore } from '../../../../components/UI/FairPlayScore';
import { getRelativeDateLabel } from '../utils/pitchUtils';

interface ActiveMatchesListProps {
    activeMatches: any[];
    groupedMatches: Record<string, any[]>;
    currentUser: any;
    myChallenges: any[];
    isAuthorized: boolean;
    setViewingTeam: (team: Team) => void;
    setOfferMode: (mode: { matchId: string, teamName: string }) => void;
    handleDeleteAdClick: (adId: string) => void;
    handleCancelClick: (challengeId: string) => void;
    selectedPitch: any;
    handleCreateAd: (pitchId: string) => void;
}

export const ActiveMatchesList: React.FC<ActiveMatchesListProps> = ({
    activeMatches, groupedMatches, currentUser, myChallenges, isAuthorized,
    setViewingTeam, setOfferMode, handleDeleteAdClick, handleCancelClick,
    selectedPitch, handleCreateAd
}) => {
    return (
        <div className="pb-20">
            <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                BURADA RAKİP ARAYANLAR ({activeMatches.length})
            </h4>

            {activeMatches.length > 0 ? (
                <div className="space-y-6">
                    {Object.keys(groupedMatches).map(date => (
                        <div key={date}>
                            {/* Date Divider */}
                            <div className="flex items-center gap-2 mb-3">
                                <Calendar className="w-4 h-4 text-turf-500" />
                                <span className="text-sm font-bold text-turf-400 uppercase tracking-wide">
                                    {getRelativeDateLabel(date)}
                                </span>
                                <div className="flex-1 h-px bg-slate-700"></div>
                            </div>

                            <div className="space-y-3">
                                {groupedMatches[date].map((announcement: any) => {
                                    const team = announcement.team;
                                    const isOwnTeam = announcement.teamId === currentUser?.team?.id;
                                    const existingChallenge = myChallenges.find(c => c.toMatchId === announcement.id && c.status === 'PENDING');

                                    return (
                                        <div key={announcement.id} className={`p-4 rounded-2xl border flex flex-col gap-3 group transition-colors relative overflow-hidden ${isOwnTeam
                                            ? 'bg-turf-900/20 border-turf-500/50'
                                            : 'bg-slate-800 border-slate-700 hover:border-turf-500/50'
                                            }`}>
                                            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-xl ${isOwnTeam ? 'bg-turf-600/20' : 'bg-turf-500/10'}`}></div>

                                            {isOwnTeam && (
                                                <div className="bg-turf-600/20 border border-turf-500/50 rounded-xl px-3 py-2 flex items-center gap-2 relative z-10">
                                                    <Shield className="w-4 h-4 text-turf-400" />
                                                    <span className="text-turf-300 text-xs font-bold uppercase">Sizin İlanınız</span>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between relative z-10">
                                                <div className="flex items-center gap-3">
                                                    <img src={team?.logoUrl || '/default-team-logo.png'} className="w-14 h-14 rounded-full border-2 border-slate-600 object-cover bg-slate-900 shadow-md" alt={team?.name} />
                                                    <div>
                                                        <div className="text-white font-bold text-lg font-sport tracking-wide italic">{team?.name}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <LevelBadge level={team?.level || 'INTERMEDIATE'} />
                                                            <span className="text-xs text-white font-bold bg-slate-700 px-2 py-0.5 rounded flex items-center gap-1">
                                                                <Clock className="w-3 h-3" /> {announcement.time}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {team && <FairPlayScore score={team.fairPlayScore || 0} count={team.fairPlayRatingCount} />}
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-700/50 relative z-10">
                                                <button
                                                    onClick={() => {
                                                        if (team) setViewingTeam(team);
                                                    }}
                                                    className="bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                                                >
                                                    <Shield className="w-4 h-4" /> Rakibi Görüntüle
                                                </button>

                                                {isOwnTeam ? (
                                                    isAuthorized ? (
                                                        <button
                                                            onClick={() => handleDeleteAdClick(announcement.id)}
                                                            className="bg-turf-900/30 border border-turf-500/30 text-turf-400 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-900/30 hover:text-red-400 hover:border-red-900/50 transition-all group"
                                                        >
                                                            <span className="group-hover:hidden flex items-center gap-2"><Shield className="w-4 h-4" /> İlanınız Aktif</span>
                                                            <span className="hidden group-hover:flex items-center gap-2"><X className="w-4 h-4" /> İlanı Kaldır</span>
                                                        </button>
                                                    ) : (
                                                        <div className="bg-turf-900/20 border border-turf-500/20 text-turf-500 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                                                            <Shield className="w-4 h-4" /> Sizin İlanınız
                                                        </div>
                                                    )
                                                ) : existingChallenge ? (
                                                    <button
                                                        onClick={() => handleCancelClick(existingChallenge.id)}
                                                        className="bg-slate-700/50 border border-slate-600/50 text-slate-400 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-900/30 hover:text-red-400 hover:border-red-900/50 transition-all group"
                                                    >
                                                        <span className="group-hover:hidden flex items-center gap-2"><Clock className="w-4 h-4" /> İstek Gönderildi</span>
                                                        <span className="hidden group-hover:flex items-center gap-2"><X className="w-4 h-4" /> İsteği İptal Et</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => setOfferMode({ matchId: announcement.id, teamName: team?.name || '' })}
                                                        className="bg-turf-600 text-white hover:bg-turf-500 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-turf-600/20"
                                                    >
                                                        <Trophy className="w-4 h-4" /> Maç Teklifi Et
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/50">
                    <p className="text-slate-500 text-sm mb-3">Bu sahada henüz aktif ilan yok.</p>
                    {isAuthorized && (
                        <button
                            onClick={() => handleCreateAd(selectedPitch.id)}
                            className="text-slate-900 bg-turf-500 px-6 py-2 rounded-lg text-sm font-bold hover:scale-105 transition-transform"
                        >
                            İlk ilanı sen aç!
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
