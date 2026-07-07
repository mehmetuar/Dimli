import React, { useMemo } from 'react';
import { Shield, UserPlus, Crown, MoreVertical, X } from 'lucide-react';
import { Player, Team } from '../../../../types';

interface TeamRosterProps {
    myTeam: Team;
    currentUser: any;
    roster: Partial<Player>[];
    guestPlayers: Player[];
    isCaptain: boolean;
    isViceCaptain: boolean;
    setIsAddPlayerModalOpen: (isOpen: boolean) => void;
    setPlayerActionsModal: (modal: { isOpen: boolean, player: any }) => void;
    setPlayerCardModal: (modal: { isOpen: boolean, player: any }) => void;
    setMyTeam: (team: Team) => void;
}

export const TeamRoster: React.FC<TeamRosterProps> = ({
    myTeam, currentUser, roster, guestPlayers,
    isCaptain, isViceCaptain, setIsAddPlayerModalOpen, setPlayerActionsModal, setPlayerCardModal, setMyTeam
}) => {
    // Kadro sırası: kendisi → kaptan → yardımcılar → diğerleri (kendisi kaptansa tek
    // satırda birleşir). Grup içinde mevcut sıra korunur (stable sort). Yardımcı
    // atama/alma myTeam'i güncellediğinden liste anında yeniden sıralanır.
    const captainId = myTeam.captainId || (myTeam.captain as any)?.id;
    const viceIds = myTeam.viceCaptainIds;
    const sortedRoster = useMemo(() => {
        const rank = (p: Partial<Player>) =>
            p.id === currentUser.id ? 0
                : p.id === captainId ? 1
                    : viceIds?.includes(p.id!) ? 2
                        : 3;
        return [...roster].sort((a, b) => rank(a) - rank(b));
    }, [roster, captainId, viceIds, currentUser.id]);

    return (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
            <div className="flex justify-between items-center gap-2 mb-4">
                <h3 className="font-sport font-bold text-sm xs:text-base sm:text-xl text-white flex items-center gap-1.5 min-w-0">
                    <Shield className="w-4 h-4 xs:w-5 xs:h-5 text-blue-500 shrink-0" /> KADRO
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-lg shrink-0 ${roster.length >= 28
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-slate-700 text-slate-300'
                        }`}>{roster.length}/28</span>
                </h3>
                {isCaptain && (
                    <div className="flex items-center gap-1.5 shrink-0">
                        {roster.length >= 28 ? (
                            <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase border border-red-500/30 whitespace-nowrap">Kadro Dolu</span>
                        ) : (
                            <button
                                onClick={() => setIsAddPlayerModalOpen(true)}
                                className="bg-turf-600 hover:bg-turf-500 text-white p-1.5 rounded-lg transition-colors shadow-lg shadow-turf-600/20 shrink-0"
                                title="Oyuncu Ekle / Davet Et"
                            >
                                <UserPlus className="w-4 h-4" />
                            </button>
                        )}
                        <span className="text-[9px] bg-turf-900/50 text-turf-500 px-1.5 py-0.5 rounded font-bold uppercase border border-turf-500/20 whitespace-nowrap">Yönetici Modu</span>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {/* Regular Players */}
                <div className="space-y-2">
                    {sortedRoster.map((player) => (
                        // Satıra dokunma → oyuncu bilgi kartı (kendine dokununca kendi kartı).
                        <div
                            key={player.id}
                            onClick={() => setPlayerCardModal({ isOpen: true, player })}
                            className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50 hover:bg-slate-700/50 active:bg-slate-700/70 transition-colors group cursor-pointer"
                        >
                            <div className="w-10 h-10 rounded-full bg-slate-600 overflow-hidden relative border border-slate-700">
                                <img src={player.avatarUrl} alt="Player" className="w-full h-full object-cover" />
                                {myTeam.captainId === player.id && (
                                    <div className="absolute bottom-0 right-0 bg-yellow-500 rounded-full p-0.5 border border-slate-900" title="Kaptan">
                                        <Crown className="w-2.5 h-2.5 text-black fill-black" />
                                    </div>
                                )}
                                {myTeam.viceCaptainIds?.includes(player.id!) && (
                                    <div className="absolute bottom-0 right-0 bg-slate-400 rounded-full p-0.5 border border-slate-900" title="Kaptan Yardımcısı">
                                        <Shield className="w-2.5 h-2.5 text-slate-900 fill-slate-900" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="text-white text-sm font-bold flex items-center gap-2">
                                    {player.name}
                                    {player.id === currentUser.id && <span className="text-[10px] text-slate-500">(Sen)</span>}
                                </div>
                                <div className="text-slate-500 text-[10px] uppercase font-bold">{player.position}</div>
                            </div>

                            <div className="text-white font-sport font-bold text-lg mr-2">{player.rating}</div>

                            {(() => {
                                if (player.id === currentUser.id) return false;
                                if (isCaptain) return true;
                                if (isViceCaptain) {
                                    const isPlayerCaptain = player.id === myTeam.captainId;
                                    const isPlayerViceCaptain = myTeam.viceCaptainIds?.includes(player.id!);
                                    return !isPlayerCaptain && !isPlayerViceCaptain;
                                }
                                return false;
                            })() && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // satır tıklaması (bilgi kartı) tetiklenmesin
                                            setPlayerActionsModal({ isOpen: true, player });
                                        }}
                                        className="p-3 text-slate-400 hover:text-white rounded-xl hover:bg-slate-700 transition-colors active:bg-slate-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                    >
                                        <MoreVertical className="w-6 h-6" />
                                    </button>
                                )}
                        </div>
                    ))}
                </div>

                {/* Guest Players */}
                {guestPlayers.length > 0 && (
                    <div className="animate-fade-in-up mt-4 pt-4 border-t border-slate-700">
                        <h4 className="text-xs font-bold text-turf-500 uppercase mb-2 flex items-center gap-1">
                            <UserPlus className="w-3 h-3" /> Misafir Oyuncular
                        </h4>
                        <div className="space-y-2">
                            {guestPlayers.map((player) => (
                                <div key={player.id} className="flex items-center gap-3 p-2 rounded-lg bg-turf-900/10 border border-turf-500/30">
                                    <div className="w-8 h-8 rounded-full bg-slate-600 overflow-hidden border border-turf-500">
                                        <img src={player.avatarUrl} alt="Player" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-white text-sm font-bold">{player.name}</div>
                                        <div className="text-turf-400 text-[10px] uppercase font-bold">Kiralık</div>
                                    </div>
                                    {isCaptain && (
                                        <button
                                            onClick={() => {
                                                if (myTeam.guestPlayerIds) {
                                                    const updatedGuestIds = myTeam.guestPlayerIds.filter(id => id !== player.id);
                                                    const updatedTeam = { ...myTeam, guestPlayerIds: updatedGuestIds };
                                                    setMyTeam(updatedTeam as any);
                                                }
                                            }}
                                            className="text-slate-500 hover:text-red-400"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
