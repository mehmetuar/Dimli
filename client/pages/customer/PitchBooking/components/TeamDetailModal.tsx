import React from 'react';
import { X, Users } from 'lucide-react';
import { LevelBadge } from '../../../../components/UI/LevelBadge';
import { FairPlayScore } from '../../../../components/UI/FairPlayScore';
import { Team } from '../../../../types';

interface TeamDetailModalProps {
    viewingTeam: Team | null;
    onClose: () => void;
}

export const TeamDetailModal: React.FC<TeamDetailModalProps> = ({ viewingTeam, onClose }) => {
    if (!viewingTeam) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 overflow-hidden relative shadow-2xl shadow-turf-500/20 max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 bg-slate-900/50 p-2 rounded-full text-white hover:bg-red-500 transition-colors z-20"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="h-32 relative">
                    <div className={`absolute inset-0 bg-gradient-to-b from-${viewingTeam.primaryColor || 'blue-500'} to-slate-800 opacity-80`}></div>
                    <img src={viewingTeam.logoUrl || '/default-team-logo.png'} className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 w-24 h-24 rounded-full border-4 border-slate-800 shadow-xl z-10 bg-slate-900 object-cover" />
                </div>

                <div className="pt-12 pb-8 px-6 text-center">
                    <h2 className="font-sport font-black text-3xl text-white uppercase italic">{viewingTeam.name}</h2>
                    <div className="flex justify-center items-center gap-2 mt-2 mb-4">
                        <LevelBadge level={viewingTeam.level} />
                        <FairPlayScore score={viewingTeam.fairPlayScore} />
                    </div>

                    <p className="text-slate-300 italic text-sm mb-6 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">"{viewingTeam.description || 'Açıklama bulunmuyor.'}"</p>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-700">
                            <div className="text-[10px] text-slate-500 uppercase font-bold">Galibiyet</div>
                            <div className="font-sport text-xl text-white">{viewingTeam.wins || 0}</div>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-700">
                            <div className="text-[10px] text-slate-500 uppercase font-bold">Mağlubiyet</div>
                            <div className="font-sport text-xl text-red-400">{viewingTeam.losses || 0}</div>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-700">
                            <div className="text-[10px] text-slate-500 uppercase font-bold">Son 3 Maç</div>
                            <div className="flex justify-center gap-1 mt-1">
                                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                            </div>
                        </div>
                    </div>

                    {/* Roster Preview */}
                    <div className="text-left mb-6">
                        <h4 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4 text-turf-500" /> MUHTEMEL KADRO
                        </h4>
                        <div className="bg-slate-900 rounded-xl p-2 space-y-1 border border-slate-700">
                            {viewingTeam.players && viewingTeam.players.length > 0 ? (
                                viewingTeam.players.map((player: any, i: number) => (
                                    <div key={player.id} className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-lg transition-colors">
                                        <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 text-sm text-slate-300">{player.full_name || player.username}</div>
                                        <div className="text-[10px] font-bold text-slate-500 uppercase">{player.position || 'MEV'}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-4 text-slate-500 text-sm">
                                    Oyuncu bilgisi bulunamadı
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Kapat Button */}
                    <button
                        onClick={onClose}
                        className="w-full bg-turf-600 text-white font-bold py-3 rounded-xl hover:bg-turf-500 transition-colors"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
};
