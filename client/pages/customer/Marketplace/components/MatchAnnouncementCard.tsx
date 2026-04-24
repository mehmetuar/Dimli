import React from 'react';
import { Calendar, Clock, MapPin, Navigation, Shield, X, Lock, TurkishLira, ChevronRight, Users } from 'lucide-react';
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

/** Find end time from pitch time slots; fall back to +1 h */
const resolveEndTime = (time: string, pitch: Pitch | null): string => {
    if (pitch && (pitch as any).timeSlots?.length) {
        const slot = (pitch as any).timeSlots.find((s: any) => s.startTime === time);
        if (slot?.endTime) return slot.endTime;
    }
    const [h, m] = time.split(':').map(Number);
    return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

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
    const endTime = resolveEndTime(announcement.time, pitch);
    const existingChallenge = myChallenges.find(
        c => c.toMatchId === announcement.id && c.status === 'PENDING'
    );

    return (
        <div className={`relative rounded-3xl border overflow-hidden ${isOwnTeam
            ? 'bg-turf-900/20 border-turf-500/50'
            : 'bg-slate-800 border-slate-700'
            }`}>
            {/* Ambient glow */}
            <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-2xl pointer-events-none ${isOwnTeam ? 'bg-turf-600/20' : 'bg-slate-700/20'}`} />

            <div className="p-4 relative z-10">

                {/* ── Own-team top action bar ── */}
                {isOwnTeam && (
                    isAuthorized ? (
                        <button
                            onClick={e => { e.stopPropagation(); handleDeleteAdClick(announcement.id); }}
                            className="w-full mb-4 bg-turf-900/30 border border-turf-500/30 text-turf-400 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:bg-red-900/30 active:text-red-400 active:border-red-900/50 transition-all group"
                        >
                            <span className="group-hover:hidden flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Sizin İlanınız (Aktif)
                            </span>
                            <span className="hidden group-hover:flex items-center gap-2">
                                <X className="w-4 h-4" /> İlanı Kaldır
                            </span>
                        </button>
                    ) : (
                        <div className="w-full mb-4 bg-turf-900/20 border border-turf-500/20 text-turf-500 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                            <Shield className="w-4 h-4" /> Sizin İlanınız (Yönetici Değilsiniz)
                        </div>
                    )
                )}

                {/* ── Team header row ── */}
                <div className="flex items-center gap-3 mb-4">

                    {/* Logo — overflow-hidden wrapper guarantees circle on iOS & Android */}
                    <button
                        className="flex-shrink-0 w-16 h-16 rounded-full overflow-hidden border-2 border-slate-600 bg-slate-900 shadow-lg active:scale-95 transition-transform"
                        onClick={e => { e.stopPropagation(); if (announcement.teamId) setSelectedTeamId(announcement.teamId); }}
                    >
                        <img
                            src={announcement.team?.logoUrl || '/default-team-logo.png'}
                            alt={announcement.team?.name}
                            className="w-full h-full object-cover"
                        />
                    </button>

                    {/* Team info — grows, min-w-0 prevents overflow */}
                    <button
                        className="flex-1 min-w-0 text-left"
                        onClick={e => { e.stopPropagation(); if (announcement.teamId) setSelectedTeamId(announcement.teamId); }}
                    >
                        {/* Name + FairPlay */}
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="font-sport font-bold text-xl text-white uppercase italic tracking-wide truncate">
                                {announcement.team?.name}
                            </span>
                            <span className="flex-shrink-0">
                                <FairPlayScore score={announcement.team?.fairPlayScore || 0} count={announcement.team?.fairPlayRatingCount} />
                            </span>
                        </div>
                        {/* Badges row */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <LevelBadge level={announcement.team?.level || 'INTERMEDIATE'} />
                            <span className="text-[10px] font-bold text-turf-500 bg-turf-900/30 px-2 py-0.5 rounded border border-turf-500/20 whitespace-nowrap">
                                RAKİP ARANIYOR
                            </span>
                        </div>
                    </button>

                    {/* Player count — fixed width, flex-shrink-0 */}
                    <div className="flex-shrink-0 flex flex-col items-center bg-slate-900/60 border border-slate-700/60 rounded-xl px-3 py-2">
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wide leading-none mb-0.5">Oyuncu</span>
                        <span className="text-base font-black text-white leading-none">
                            {announcement.playerCount}v{announcement.playerCount}
                        </span>
                    </div>
                </div>

                {/* ── Info grid ── */}
                <div className="grid grid-cols-2 gap-2 mb-4">

                    {/* Date */}
                    <div className="flex items-center gap-2.5 bg-slate-900/50 p-2.5 rounded-xl border border-slate-700/50">
                        <div className="flex-shrink-0 bg-slate-800 p-1.5 rounded-lg">
                            <Calendar className="w-4 h-4 text-blue-400" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[9px] text-slate-500 font-bold uppercase leading-none mb-0.5">Tarih</div>
                            <div className="text-xs font-bold text-slate-200 truncate">{announcement.date}</div>
                        </div>
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-2.5 bg-slate-900/50 p-2.5 rounded-xl border border-slate-700/50">
                        <div className="flex-shrink-0 bg-slate-800 p-1.5 rounded-lg">
                            <Clock className="w-4 h-4 text-orange-400" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[9px] text-slate-500 font-bold uppercase leading-none mb-0.5">Saat</div>
                            <div className="text-xs font-bold text-slate-200 truncate">
                                {announcement.time} - {endTime}
                            </div>
                        </div>
                    </div>

                    {/* Location — full width */}
                    <div className="col-span-2 bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 pt-2 pb-1.5 border-b border-slate-700/40">
                            <div className="flex-shrink-0 bg-slate-800 p-1.5 rounded-lg">
                                <MapPin className="w-3.5 h-3.5 text-turf-500" />
                            </div>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider flex-1">Saha &amp; Konum</span>
                            {announcement.distanceKm !== undefined && (
                                <div className="flex items-center gap-1 bg-turf-600/25 border border-turf-500/50 px-2 py-0.5 rounded-full">
                                    <Navigation className="w-2.5 h-2.5 text-turf-400" />
                                    <span className="text-[10px] font-black text-white">{announcement.distanceKm} km</span>
                                </div>
                            )}
                        </div>
                        <div className="px-3 py-2">
                            {pitch ? (
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-sm font-black text-white">{business?.name}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-600 flex-shrink-0" />
                                        <span className="text-xs font-semibold text-slate-300">{pitch.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-turf-500 flex-shrink-0" />
                                        <span className="text-xs font-semibold text-turf-400">{business?.district}</span>
                                        {business?.city && business.city !== business.district && (
                                            <>
                                                <span className="text-slate-600 text-xs">·</span>
                                                <span className="text-xs text-slate-500">{business.city}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <span className="text-xs text-slate-500 italic">Saha bilgisi yükleniyor...</span>
                            )}
                        </div>
                    </div>

                    {/* Price — full width */}
                    <div className="col-span-2 flex items-center gap-3 bg-slate-900/50 p-2.5 rounded-xl border border-slate-700/50">
                        <div className="flex-shrink-0 bg-slate-800 p-1.5 rounded-lg">
                            <TurkishLira className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[9px] text-slate-500 font-bold uppercase leading-none mb-0.5">Saha Ücreti (Takım Başı)</div>
                            {pitch ? (
                                <span className="text-sm font-bold text-green-400 flex items-center gap-0.5">
                                    {pitch.pricePerHour / 2} <TurkishLira size={12} className="stroke-[3]" />
                                </span>
                            ) : (
                                <span className="text-xs text-slate-500">Fiyat Bilgisi Yok</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Description */}
                {announcement.description && (
                    <div className="mb-4 text-xs text-slate-400 italic leading-relaxed">
                        "{announcement.description}"
                    </div>
                )}

                {/* ── Action button ── */}
                {isOwnTeam ? (
                    <div className="w-full bg-turf-900/30 border border-turf-500/30 text-turf-400 py-3 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                        <Shield className="w-4 h-4" /> İlanınız Aktif
                    </div>
                ) : existingChallenge ? (
                    <button
                        onClick={() => handleCancelClick(existingChallenge.id)}
                        className="w-full bg-slate-700/50 border border-slate-600/50 text-slate-400 py-3 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:bg-red-900/30 active:text-red-400 active:border-red-900/50 transition-all group"
                    >
                        <span className="group-hover:hidden flex items-center gap-2">
                            <Clock className="w-4 h-4" /> İstek Gönderildi
                        </span>
                        <span className="hidden group-hover:flex items-center gap-2">
                            <X className="w-4 h-4" /> İsteği İptal Et
                        </span>
                    </button>
                ) : canChallenge ? (
                    <button
                        onClick={() => handleOpenChallengeModal(announcement)}
                        className="w-full bg-turf-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-wider active:bg-turf-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-turf-600/20"
                    >
                        Meydan Oku <ChevronRight className="w-5 h-5" />
                    </button>
                ) : (
                    <div className="w-full bg-slate-700/50 text-slate-500 py-3 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-600/50 cursor-not-allowed">
                        <Lock className="w-4 h-4" />
                        <span className="text-xs">Sadece Kaptan ve Yardımcıları</span>
                    </div>
                )}
            </div>
        </div>
    );
};
