import React from 'react';
import { Calendar, Clock, MapPin, Shield, X, Lock, TurkishLira, ChevronRight } from 'lucide-react';
import { LevelBadge } from '../../../../components/UI/LevelBadge';
import { FairPlayScore } from '../../../../components/UI/FairPlayScore';
import { Pitch, Business } from '../../../../types';

interface MatchAnnouncementCardProps {
    announcement: any;
    myTeam: any;
    myChallenges: any[];
    isAuthorized: boolean;
    canChallenge: boolean;
    getPitchDetails: (pitchId: string) => { pitch: Pitch | null, business: Business | null };
    setSelectedTeamId: (teamId: string) => void;
    handleDeleteAdClick: (adId: string) => void;
    handleCancelClick: (challengeId: string) => void;
    handleOpenChallengeModal: (announcement: any) => void;
}

export const MatchAnnouncementCard: React.FC<MatchAnnouncementCardProps> = ({
    announcement,
    myTeam,
    myChallenges,
    isAuthorized,
    canChallenge,
    getPitchDetails,
    setSelectedTeamId,
    handleDeleteAdClick,
    handleCancelClick,
    handleOpenChallengeModal
}) => {
    const isOwnTeam = announcement.teamId === myTeam?.id;
    const { pitch, business } = getPitchDetails(announcement.pitchId);

    return (
        <div
            className={`group relative rounded-3xl border overflow-hidden transition-all duration-300 ${isOwnTeam
                ? 'bg-turf-900/20 border-turf-500/50'
                : 'bg-slate-800 border-slate-700 hover:border-turf-500/50 hover:shadow-neon'
                }`}
        >
            <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-2xl transition-colors ${isOwnTeam ? 'bg-turf-600/20' : 'bg-slate-700/20 group-hover:bg-turf-600/10'
                }`}></div>

            <div className="p-5 relative z-10">
                {isOwnTeam && (
                    isAuthorized ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAdClick(announcement.id);
                            }}
                            className="w-full mb-4 bg-turf-900/30 border border-turf-500/30 text-turf-400 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-900/30 hover:text-red-400 hover:border-red-900/50 transition-all group"
                        >
                            <span className="group-hover:hidden flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Sizin İlanınız (Aktif)
                            </span>
                            <span className="hidden group-hover:flex items-center gap-2">
                                <X className="w-4 h-4" /> İlanı Kaldır
                            </span>
                        </button>
                    ) : (
                        <div className="w-full mb-4 bg-turf-900/20 border border-turf-500/20 text-turf-500 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                            <Shield className="w-4 h-4" /> Sizin İlanınız (Yönetici Değilsiniz)
                        </div>
                    )
                )}

                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                        <div
                            className="relative cursor-pointer hover:scale-105 transition-transform"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (announcement.teamId) setSelectedTeamId(announcement.teamId);
                            }}
                        >
                            <img src={announcement.team?.logoUrl || '/default-team-logo.png'} alt={announcement.team?.name} className="w-14 h-14 rounded-full bg-slate-900 object-cover border-2 border-slate-600 shadow-lg" />
                        </div>
                        <div
                            className="cursor-pointer group/team"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (announcement.teamId) setSelectedTeamId(announcement.teamId);
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <h3 className="font-sport font-bold text-2xl text-white uppercase italic tracking-wide group-hover/team:text-turf-500 transition-colors">{announcement.team?.name}</h3>
                                <FairPlayScore score={announcement.team?.fairPlayScore || 0} />
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <LevelBadge level={announcement.team?.level || 'INTERMEDIATE'} />
                                <span className="text-[10px] font-bold text-turf-500 bg-turf-900/30 px-2 py-0.5 rounded border border-turf-500/20">RAKİP ARANIYOR</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-center bg-slate-900/50 p-2 rounded-lg border border-slate-700/50 backdrop-blur-sm min-w-[80px]">
                        <span className="block text-[10px] text-slate-500 uppercase font-bold">Oyuncu</span>
                        <span className="block text-lg font-bold text-white">{announcement.playerCount}v{announcement.playerCount}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="bg-slate-800 p-2 rounded-lg">
                            <Calendar className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase">Tarih</div>
                            <div className="text-sm font-bold text-slate-200">{announcement.date}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="bg-slate-800 p-2 rounded-lg">
                            <Clock className="w-4 h-4 text-orange-400" />
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase">Saat</div>
                            <div className="text-sm font-bold text-slate-200">
                                {announcement.time} - {`${(parseInt(announcement.time.split(':')[0]) + 1).toString().padStart(2, '0')}:${announcement.time.split(':')[1]}`}
                            </div>
                        </div>
                    </div>
                    <div className="col-span-2 flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="bg-slate-800 p-2 rounded-lg">
                            <MapPin className="w-4 h-4 text-turf-500" />
                        </div>
                        <div className="overflow-hidden">
                            <div className="text-[10px] text-slate-500 font-bold uppercase">Saha & Konum</div>
                            <div className="text-sm font-bold text-slate-200 truncate flex flex-wrap gap-x-2 items-center">
                                {pitch ? (
                                    <>
                                        <span className="text-turf-400">{business?.name}</span>
                                        <span className="text-slate-500">-</span>
                                        <span>{pitch.name}</span>
                                        <span className="flex items-center gap-1 text-xs text-turf-400 bg-turf-900/40 px-2 py-0.5 rounded-md border border-turf-500/20 whitespace-nowrap">
                                            <MapPin className="w-3 h-3" />
                                            {business?.district}
                                        </span>
                                    </>
                                ) : (
                                    'Saha Bilgisi Yükleniyor'
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Price Display */}
                    <div className="col-span-2 flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                        <div className="bg-slate-800 p-2 rounded-lg">
                            <TurkishLira className="w-4 h-4 text-green-500" />
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase">Saha Ücreti (Takım Başı)</div>
                            <div className="text-sm font-bold text-slate-200">
                                {pitch ? (
                                    <span className="text-green-400 flex items-center gap-1">
                                        {pitch.pricePerHour / 2} <TurkishLira size={12} className="stroke-[3]" />
                                    </span>
                                ) : (
                                    <span className="text-slate-500 text-xs">Fiyat Bilgisi Yok</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {announcement.description && (
                    <div className="mb-4 text-sm text-slate-400 italic">
                        "{announcement.description}"
                    </div>
                )}

                {isOwnTeam ? (
                    <div className="w-full bg-turf-900/30 border border-turf-500/30 text-turf-400 py-3.5 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                        <Shield className="w-4 h-4" />
                        İlanınız Aktif
                    </div>
                ) : myChallenges.find(c => c.toMatchId === announcement.id && c.status === 'PENDING') ? (
                    <button
                        onClick={() => handleCancelClick(myChallenges.find(c => c.toMatchId === announcement.id && c.status === 'PENDING').id)}
                        className="w-full bg-slate-700/50 border border-slate-600/50 text-slate-400 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-red-900/30 hover:text-red-400 hover:border-red-900/50 transition-all group"
                    >
                        <span className="group-hover:hidden flex items-center gap-2"><Clock className="w-4 h-4" /> İstek Gönderildi</span>
                        <span className="hidden group-hover:flex items-center gap-2"><X className="w-4 h-4" /> İsteği İptal Et</span>
                    </button>
                ) : canChallenge ? (
                    <button
                        onClick={() => handleOpenChallengeModal(announcement)}
                        className="w-full bg-turf-600 text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-turf-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-turf-600/20"
                    >
                        Meydan Oku <ChevronRight className="w-5 h-5" />
                    </button>
                ) : (
                    <div className="w-full bg-slate-700/50 text-slate-500 py-3.5 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-600/50 cursor-not-allowed">
                        <Lock className="w-4 h-4" />
                        Sadece Kaptan ve Yardımcıları
                    </div>
                )}
            </div>
        </div>
    );
};
