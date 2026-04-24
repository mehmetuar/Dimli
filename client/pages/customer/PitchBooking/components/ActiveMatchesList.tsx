import React, { useState, useEffect } from 'react';
import { Calendar, Shield, X, Trophy, Clock, Users, ChevronRight } from 'lucide-react';
import { Team } from '../../../../types';
import { LevelBadge } from '../../../../components/UI/LevelBadge';
import { FairPlayScore } from '../../../../components/UI/FairPlayScore';
import { getRelativeDateLabel } from '../utils/pitchUtils';

interface ActiveMatchesListProps {
    activeMatches: any[];
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

// ── Helpers ────────────────────────────────────────────────────────────────────

const getEndTime = (time: string, selectedPitch: any): string => {
    if (!selectedPitch?.timeSlots?.length) return '';
    const slot = selectedPitch.timeSlots.find((s: any) => s.startTime === time);
    return slot?.endTime || '';
};

const groupByDate = (matches: any[]): Record<string, any[]> => {
    return matches.reduce((acc: Record<string, any[]>, m) => {
        const date = m.date || '';
        if (!acc[date]) acc[date] = [];
        acc[date].push(m);
        return acc;
    }, {});
};

/** Compact date label for card badges: "Bugün" / "Yarın" / "25 Nis Sal" */
const getCompactDateLabel = (dateStr: string): string => {
    const today = new Date().toISOString().split('T')[0];
    if (dateStr === today) return 'Bugün';

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Yarın';

    const d = new Date(dateStr);
    // "25 Nis Sal"
    const day = d.toLocaleDateString('tr-TR', { day: 'numeric' });
    const month = d.toLocaleDateString('tr-TR', { month: 'short' });
    const weekday = d.toLocaleDateString('tr-TR', { weekday: 'short' });
    return `${day} ${month} ${weekday}`;
};

/** Sort for modal: own team first (by date asc), then others (by date asc, time asc) */
const sortForModal = (matches: any[], currentTeamId?: string): any[] => {
    const own = matches
        .filter(m => m.teamId === currentTeamId)
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    const others = matches
        .filter(m => m.teamId !== currentTeamId)
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    return [...own, ...others];
};

const DISPLAY_LIMIT = 3;

// ── Match Card ─────────────────────────────────────────────────────────────────

interface MatchCardProps {
    announcement: any;
    isOwnTeam: boolean;
    existingChallenge: any;
    isAuthorized: boolean;
    selectedPitch: any;
    showDateBadge?: boolean;
    setViewingTeam: (team: Team) => void;
    setOfferMode: (mode: { matchId: string, teamName: string }) => void;
    handleDeleteAdClick: (adId: string) => void;
    handleCancelClick: (challengeId: string) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({
    announcement, isOwnTeam, existingChallenge, isAuthorized, selectedPitch, showDateBadge,
    setViewingTeam, setOfferMode, handleDeleteAdClick, handleCancelClick
}) => {
    const team = announcement.team;
    const endTime = getEndTime(announcement.time, selectedPitch);
    const timeLabel = endTime ? `${announcement.time}-${endTime}` : announcement.time;
    const playerCount = announcement.playerCount;
    const vsLabel = playerCount ? `${playerCount}v${playerCount}` : null;
    const dateBadge = showDateBadge ? getCompactDateLabel(announcement.date) : null;

    return (
        <div className={`p-4 rounded-2xl border flex flex-col gap-3 transition-colors relative overflow-hidden ${isOwnTeam
            ? 'bg-turf-900/20 border-turf-500/50'
            : 'bg-slate-800 border-slate-700'
            }`}>
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-xl ${isOwnTeam ? 'bg-turf-600/20' : 'bg-turf-500/10'}`} />

            {isOwnTeam && (
                <div className="bg-turf-600/20 border border-turf-500/50 rounded-xl px-3 py-2 flex items-center gap-2 relative z-10">
                    <Shield className="w-4 h-4 text-turf-400" />
                    <span className="text-turf-300 text-xs font-bold uppercase">Sizin İlanınız</span>
                </div>
            )}

            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                    <img
                        src={team?.logoUrl || '/default-team-logo.png'}
                        className="w-14 h-14 rounded-full border-2 border-slate-600 object-cover bg-slate-900 shadow-md"
                        alt={team?.name}
                    />
                    <div>
                        <div className="text-white font-bold text-lg font-sport tracking-wide italic">{team?.name}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <LevelBadge level={team?.level || 'INTERMEDIATE'} />
                            {vsLabel && (
                                <span className="text-xs text-orange-300 font-bold bg-orange-900/30 border border-orange-700/40 px-2 py-0.5 rounded flex items-center gap-1">
                                    <Users className="w-3 h-3" /> {vsLabel}
                                </span>
                            )}
                            <span className="text-xs text-white font-bold bg-slate-700 px-2 py-0.5 rounded flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {timeLabel}
                            </span>
                            {dateBadge && (
                                <span className="text-xs text-turf-300 font-bold bg-turf-900/30 border border-turf-700/40 px-2 py-0.5 rounded flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {dateBadge}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                {team && <FairPlayScore score={team.fairPlayScore || 0} count={team.fairPlayRatingCount} />}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1 pt-3 border-t border-slate-700/50 relative z-10">
                <button
                    onClick={() => { if (team) setViewingTeam(team); }}
                    className="bg-slate-700 text-slate-300 active:bg-slate-600 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                    <Shield className="w-4 h-4" /> Rakibi Görüntüle
                </button>

                {isOwnTeam ? (
                    isAuthorized ? (
                        <button
                            onClick={() => handleDeleteAdClick(announcement.id)}
                            className="bg-turf-900/30 border border-turf-500/30 text-turf-400 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:bg-red-900/30 active:text-red-400 transition-all"
                        >
                            <Shield className="w-4 h-4" /> İlanı Kaldır
                        </button>
                    ) : (
                        <div className="bg-turf-900/20 border border-turf-500/20 text-turf-500 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                            <Shield className="w-4 h-4" /> Sizin İlanınız
                        </div>
                    )
                ) : existingChallenge ? (
                    <button
                        onClick={() => handleCancelClick(existingChallenge.id)}
                        className="bg-slate-700/50 border border-slate-600/50 text-slate-400 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:bg-red-900/30 active:text-red-400 transition-all"
                    >
                        <Clock className="w-4 h-4" /> İstek Gönderildi
                    </button>
                ) : (
                    <button
                        onClick={() => setOfferMode({ matchId: announcement.id, teamName: team?.name || '' })}
                        className="bg-turf-600 text-white active:bg-turf-500 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-turf-600/20"
                    >
                        <Trophy className="w-4 h-4" /> Maç Teklifi Et
                    </button>
                )}
            </div>
        </div>
    );
};

// ── All Matches Bottom Sheet Modal ─────────────────────────────────────────────

interface AllMatchesModalProps {
    activeMatches: any[];
    currentUser: any;
    myChallenges: any[];
    isAuthorized: boolean;
    selectedPitch: any;
    setViewingTeam: (team: Team) => void;
    setOfferMode: (mode: { matchId: string, teamName: string }) => void;
    handleDeleteAdClick: (adId: string) => void;
    handleCancelClick: (challengeId: string) => void;
    onClose: () => void;
}

const AllMatchesModal: React.FC<AllMatchesModalProps> = ({
    activeMatches, currentUser, myChallenges, isAuthorized, selectedPitch,
    setViewingTeam, setOfferMode, handleDeleteAdClick, handleCancelClick, onClose
}) => {
    useEffect(() => {
        document.body.classList.add('modal-open');
        return () => document.body.classList.remove('modal-open');
    }, []);

    const currentTeamId = currentUser?.team?.id;

    // Own team announcements pinned at top, then others by date+time
    const ownMatches = activeMatches
        .filter(m => m.teamId === currentTeamId)
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

    const otherMatches = activeMatches
        .filter(m => m.teamId !== currentTeamId)
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

    const otherGrouped = groupByDate(otherMatches);

    const renderCard = (announcement: any) => {
        const isOwnTeam = announcement.teamId === currentTeamId;
        const existingChallenge = myChallenges.find(
            c => c.toMatchId === announcement.id && c.status === 'PENDING'
        );
        return (
            <MatchCard
                key={announcement.id}
                announcement={announcement}
                isOwnTeam={isOwnTeam}
                existingChallenge={existingChallenge}
                isAuthorized={isAuthorized}
                selectedPitch={selectedPitch}
                showDateBadge
                setViewingTeam={setViewingTeam}
                setOfferMode={setOfferMode}
                handleDeleteAdClick={handleDeleteAdClick}
                handleCancelClick={handleCancelClick}
            />
        );
    };

    return (
        <div
            className="fixed inset-0 z-[70] flex flex-col justify-end modal-overlay animate-fade-in"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/75" />

            <div
                className="relative w-full flex flex-col animate-slide-up"
                style={{ maxHeight: '92dvh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1 bg-slate-900 rounded-t-3xl flex-shrink-0">
                    <div className="w-10 h-1 rounded-full bg-slate-600" />
                </div>

                {/* Header */}
                <div className="bg-slate-900 px-5 pt-2 pb-4 border-b border-slate-700/60 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-400" />
                                <h2 className="text-white font-bold text-base">Rakip Arayanlar</h2>
                                <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {activeMatches.length}
                                </span>
                            </div>
                            {selectedPitch?.name && (
                                <p className="text-slate-500 text-xs mt-0.5 ml-7">{selectedPitch.name}</p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-800 active:bg-slate-700 transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Scrollable list */}
                <div
                    className="bg-slate-900 overflow-y-auto modal-scroll flex-1 px-4 py-4"
                    style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
                >
                    {/* ── Own team section (always at top) ── */}
                    {ownMatches.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Shield className="w-4 h-4 text-turf-500" />
                                <span className="text-sm font-bold text-turf-400 uppercase tracking-wide">
                                    Sizin İlanlarınız
                                </span>
                                <div className="flex-1 h-px bg-turf-900/60" />
                            </div>
                            <div className="space-y-3">
                                {ownMatches.map(renderCard)}
                            </div>
                        </div>
                    )}

                    {/* ── Others grouped by date ── */}
                    {Object.keys(otherGrouped).length > 0 && (
                        <div className="space-y-6">
                            {Object.keys(otherGrouped).map(date => (
                                <div key={date}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Calendar className="w-4 h-4 text-turf-500" />
                                        <span className="text-sm font-bold text-turf-400 uppercase tracking-wide">
                                            {getRelativeDateLabel(date)}
                                        </span>
                                        <div className="flex-1 h-px bg-slate-700" />
                                    </div>
                                    <div className="space-y-3">
                                        {otherGrouped[date].map(renderCard)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Main Component ─────────────────────────────────────────────────────────────

export const ActiveMatchesList: React.FC<ActiveMatchesListProps> = ({
    activeMatches, currentUser, myChallenges, isAuthorized,
    setViewingTeam, setOfferMode, handleDeleteAdClick, handleCancelClick,
    selectedPitch, handleCreateAd
}) => {
    const [showAllModal, setShowAllModal] = useState(false);

    const displayedMatches = activeMatches.slice(0, DISPLAY_LIMIT);
    const hasMore = activeMatches.length > DISPLAY_LIMIT;

    const renderInlineCards = (matches: any[]) => {
        const grouped = groupByDate(matches);
        return (
            <div className="space-y-6">
                {Object.keys(grouped).map(date => (
                    <div key={date}>
                        <div className="flex items-center gap-2 mb-3">
                            <Calendar className="w-4 h-4 text-turf-500" />
                            <span className="text-sm font-bold text-turf-400 uppercase tracking-wide">
                                {getRelativeDateLabel(date)}
                            </span>
                            <div className="flex-1 h-px bg-slate-700" />
                        </div>
                        <div className="space-y-3">
                            {grouped[date].map((announcement: any) => {
                                const isOwnTeam = announcement.teamId === currentUser?.team?.id;
                                const existingChallenge = myChallenges.find(
                                    c => c.toMatchId === announcement.id && c.status === 'PENDING'
                                );
                                return (
                                    <MatchCard
                                        key={announcement.id}
                                        announcement={announcement}
                                        isOwnTeam={isOwnTeam}
                                        existingChallenge={existingChallenge}
                                        isAuthorized={isAuthorized}
                                        selectedPitch={selectedPitch}
                                        setViewingTeam={setViewingTeam}
                                        setOfferMode={setOfferMode}
                                        handleDeleteAdClick={handleDeleteAdClick}
                                        handleCancelClick={handleCancelClick}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="pb-6">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-bold text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    BURADA RAKİP ARAYANLAR ({activeMatches.length})
                </h4>
                {hasMore && (
                    <button
                        onClick={() => setShowAllModal(true)}
                        className="flex items-center gap-1 text-xs font-bold text-turf-400 active:text-turf-300 transition-colors"
                    >
                        Tümünü Gör <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {activeMatches.length > 0 ? (
                renderInlineCards(displayedMatches)
            ) : (
                <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/50">
                    <p className="text-slate-500 text-sm mb-3">Bu sahada henüz aktif ilan yok.</p>
                    {isAuthorized && (
                        <button
                            onClick={() => handleCreateAd(selectedPitch.id)}
                            className="text-slate-900 bg-turf-500 px-6 py-2 rounded-lg text-sm font-bold active:scale-95 transition-transform"
                        >
                            İlk ilanı sen aç!
                        </button>
                    )}
                </div>
            )}

            {showAllModal && (
                <AllMatchesModal
                    activeMatches={activeMatches}
                    currentUser={currentUser}
                    myChallenges={myChallenges}
                    isAuthorized={isAuthorized}
                    selectedPitch={selectedPitch}
                    setViewingTeam={setViewingTeam}
                    setOfferMode={setOfferMode}
                    handleDeleteAdClick={handleDeleteAdClick}
                    handleCancelClick={handleCancelClick}
                    onClose={() => setShowAllModal(false)}
                />
            )}
        </div>
    );
};
