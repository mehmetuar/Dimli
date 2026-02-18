import React, { useEffect, useState } from 'react';
import { X, MapPin, Trophy, Users, Shield, Star, Store } from 'lucide-react';
import { Team, Player, Business } from '../types';
import api from '../services/api';
import { LoadingSpinner } from './LoadingSpinner';
import { LevelBadge } from './LevelBadge';
import { FairPlayScore } from './FairPlayScore';

interface TeamDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamId: string;
    onChallenge?: () => void;
    currentUserId?: string;
}

export const TeamDetailModal: React.FC<TeamDetailModalProps> = ({ isOpen, onClose, teamId, onChallenge, currentUserId }) => {
    const [team, setTeam] = useState<Team | null>(null);
    const [loading, setLoading] = useState(true);
    const [roster, setRoster] = useState<Player[]>([]);
    const [homeBusiness, setHomeBusiness] = useState<Business | null>(null);

    useEffect(() => {
        const fetchTeamDetails = async () => {
            if (!isOpen || !teamId) return;
            setLoading(true);
            try {
                // Fetch Team
                const teamRes = await api.get(`/teams/${teamId}`);
                setTeam(teamRes.data);

                // Fetch Roster (assuming endpoint exists or included in team)
                // If team players are not included, we might need a separate call
                if (teamRes.data.players) {
                    setRoster(teamRes.data.players);
                }

                // Fetch Home Business if exists
                if (teamRes.data.homeBusinessId) {
                    try {
                        const businessRes = await api.get('/businesses');
                        const business = businessRes.data.find((b: Business) => b.id === teamRes.data.homeBusinessId);
                        setHomeBusiness(business || null);
                    } catch (err) {
                        console.error('Failed to fetch business details', err);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch team details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTeamDetails();
    }, [isOpen, teamId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/90 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 w-full max-w-lg rounded-3xl border border-slate-700 overflow-hidden relative shadow-2xl flex flex-col max-h-[90vh]">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 p-2 rounded-full text-white transition-colors z-20 backdrop-blur-sm"
                >
                    <X className="w-5 h-5" />
                </button>

                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <LoadingSpinner />
                    </div>
                ) : team ? (
                    <>
                        {/* Header Image / Pattern */}
                        <div className="h-32 relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800 overflow-hidden">
                                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                            </div>
                            <div className="absolute -bottom-10 left-6 z-10">
                                <img
                                    src={team.logoUrl || '/default-team-logo.png'}
                                    alt={team.name}
                                    className="w-24 h-24 rounded-full border-4 border-slate-800 bg-slate-900 object-cover shadow-xl"
                                />
                            </div>
                        </div>

                        <div className="pt-16 px-6 pb-6 overflow-y-auto">
                            {/* Team Identity */}
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="font-sport font-black text-3xl text-white uppercase italic tracking-wide leading-none">
                                            {team.name}
                                        </h2>
                                        {currentUserId && roster.some(p => p.id === currentUserId) && (
                                            <span className="bg-turf-600 text-white text-[10px] font-bold px-2 py-0.5 rounded border border-turf-400">
                                                SİZİN TAKIMINIZ
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                                        <MapPin className="w-3 h-3 text-turf-500" /> {team.location || 'Konum Belirtilmemiş'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <LevelBadge level={team.level} />
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">Fair Play</span>
                                    <FairPlayScore score={team.fairPlayScore} />
                                </div>
                                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">Maç</span>
                                    <span className="text-white font-black text-xl">{team.wins + team.losses}</span>
                                </div>
                                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">Galibiyet</span>
                                    <span className="text-green-400 font-black text-xl">{team.wins}</span>
                                </div>
                            </div>

                            {/* Home Business */}
                            {homeBusiness && (
                                <div className="mb-6">
                                    <h3 className="font-bold text-slate-400 text-xs uppercase mb-3 flex items-center gap-2">
                                        <Store className="w-4 h-4 text-turf-500" /> Favori İşletme
                                    </h3>
                                    <div className="bg-slate-900 rounded-xl p-3 border border-slate-700 flex items-center gap-4">
                                        <img
                                            src={homeBusiness.coverImageUrl || 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&q=80&w=200'}
                                            className="w-16 h-16 rounded-lg object-cover opacity-80"
                                            alt={homeBusiness.name}
                                        />
                                        <div>
                                            <div className="font-bold text-white">{homeBusiness.name}</div>
                                            <div className="text-xs text-slate-400">{homeBusiness.district}, {homeBusiness.city}</div>
                                            <div className="flex items-center gap-1 mt-1">
                                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                                <span className="text-xs font-bold text-white">{homeBusiness.rating}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Roster */}
                            <div>
                                <h3 className="font-bold text-slate-400 text-xs uppercase mb-3 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-blue-500" /> Kadro
                                </h3>
                                <div className="space-y-2">
                                    {roster.map(player => {
                                        const isMe = currentUserId === player.id;
                                        return (
                                            <div
                                                key={player.id}
                                                className={`flex items-center gap-3 p-2 rounded-lg transition-colors border ${isMe
                                                        ? 'bg-turf-900/20 border-turf-500/50 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                                                        : 'bg-slate-900/40 hover:bg-slate-900/80 border-transparent hover:border-slate-700'
                                                    }`}
                                            >
                                                <img
                                                    src={player.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name || 'Player')}&background=random`}
                                                    className={`w-8 h-8 rounded-full object-cover border ${isMe ? 'border-turf-500 ring-1 ring-turf-500' : 'border-slate-600'}`}
                                                    alt={player.name}
                                                />
                                                <div className="flex-1">
                                                    <div className="text-sm font-bold text-white flex items-center gap-2">
                                                        {player.name}
                                                        {isMe && <span className="text-[10px] text-turf-500 font-black">(Siz)</span>}
                                                        {team.captainId === player.id && <Trophy className="w-3 h-3 text-yellow-500" />}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 uppercase font-bold">{player.position}</div>
                                                </div>
                                                <div className={`font-black text-sm ${isMe ? 'text-turf-400' : 'text-turf-500'}`}>{player.rating}</div>
                                            </div>
                                        );
                                    })}
                                    {roster.length === 0 && (
                                        <p className="text-slate-500 text-sm italic">Kadro bilgisi bulunamadı.</p>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Footer Action */}
                        {onChallenge && (
                            <div className="p-4 bg-slate-900 border-t border-slate-700">
                                <button
                                    onClick={() => { onClose(); onChallenge(); }}
                                    className="w-full bg-turf-600 text-white font-black uppercase italic py-4 rounded-xl text-lg shadow-lg shadow-turf-600/20 hover:bg-turf-500 transition-all flex items-center justify-center gap-2"
                                >
                                    Meydan Oku
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="p-8 text-center text-slate-400">Takım bulunamadı.</div>
                )}
            </div>
        </div>
    );
};
