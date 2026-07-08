import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trophy, Star, CheckCircle, Building2, Shield, MapPin, Users, Calendar, Clock } from 'lucide-react';
import { MatchHistoryItem, PendingRating } from '../../../../types';
import { RatingModal } from '../../../../components/Modals/RatingModal';
import api from '../../../../services/api';
import { useModalBodyClass } from '../../../../utils/useModalBodyClass';

interface MatchHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    matches: MatchHistoryItem[];
    isLoading: boolean;
    teamFairPlayScore: number;
}

export const MatchHistoryModal: React.FC<MatchHistoryModalProps> = ({
    isOpen,
    onClose,
    matches,
    isLoading,
    teamFairPlayScore,
}) => {
    const [localMatches, setLocalMatches] = useState<MatchHistoryItem[]>([]);
    const [selectedForRating, setSelectedForRating] = useState<PendingRating | null>(null);

    useModalBodyClass(isOpen);

    React.useEffect(() => {
        setLocalMatches(matches);
    }, [matches]);

    if (!isOpen) return null;

    const totalMatches = localMatches.length;

    const formatDate = (isoStr: string) => {
        const d = new Date(isoStr);
        return {
            day: d.toLocaleDateString('tr-TR', { day: '2-digit' }),
            month: d.toLocaleDateString('tr-TR', { month: 'long' }),
            time: d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            full: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }),
        };
    };

    const openRatingForMatch = (match: MatchHistoryItem) => {
        const pending: PendingRating = {
            reservationId: match.reservationId,
            slotTime: match.slotTime,
            pitchName: match.pitchName,
            businessName: match.businessName,
            businessId: match.businessId,
            businessDeleted: match.businessDeleted,
            needsBusinessRating: match.needsBusinessRating,
            needsFairPlayRating: match.needsFairPlayRating,
            opponentTeamId: match.opponentTeamId,
            opponentTeamName: match.opponentTeamName,
            opponentTeamDeleted: match.opponentTeamDeleted,
        };
        setSelectedForRating(pending);
    };

    const handleRatingSubmit = async (
        reservationId: string,
        businessScore: number,
        fairPlayScore: number | null
    ) => {
        const current = selectedForRating;
        if (!current) return;

        try {
            if (current.needsBusinessRating && businessScore > 0) {
                await api.post('/ratings', {
                    reservationId,
                    type: 'BUSINESS',
                    targetBusinessId: current.businessId,
                    score: businessScore,
                });
            }
            if (fairPlayScore !== null && current.needsFairPlayRating && current.opponentTeamId) {
                await api.post('/ratings', {
                    reservationId,
                    type: 'FAIRPLAY',
                    targetTeamId: current.opponentTeamId,
                    score: fairPlayScore,
                });
            }
        } catch {
            // silent fail on duplicate
        }

        setLocalMatches(prev =>
            prev.map(m =>
                m.reservationId === reservationId
                    ? {
                          ...m,
                          isBusinessRated: true,
                          isFairPlayRated: m.needsFairPlayRating ? true : m.isFairPlayRated,
                          businessScore: businessScore > 0 ? businessScore : m.businessScore,
                          fairPlayScore: fairPlayScore ?? m.fairPlayScore,
                          needsBusinessRating: false,
                          needsFairPlayRating: false,
                      }
                    : m
            )
        );
        setSelectedForRating(null);
    };

    const handleRatingSkip = () => {
        setSelectedForRating(null);
    };

    return createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="bg-slate-800 w-full max-w-lg max-h-[85vh] rounded-[2.5rem] border border-slate-700/50 overflow-hidden relative shadow-2xl flex flex-col animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Header */}
                <div className="p-6 border-b border-slate-700/50 relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-slate-900" />
                    
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-slate-900/50 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-10 backdrop-blur-sm"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 relative z-10 mb-5">
                        <div className="bg-purple-500/20 p-3 rounded-2xl border border-purple-500/20 shadow-lg shadow-purple-500/10">
                            <Trophy className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="pr-10 min-w-0 flex-1">
                            <h3 className="text-[clamp(16px,5vw,22px)] font-sport font-black text-white uppercase italic tracking-wide truncate">
                                Geçmiş Maçlar
                            </h3>
                            <p className="text-[clamp(11px,3vw,13px)] text-slate-400 truncate">
                                Toplam {totalMatches} maç oynandı
                            </p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 relative z-10">
                        <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center backdrop-blur-sm">
                            <div className="text-white font-sport font-black text-[clamp(20px,5vw,28px)] leading-none">{totalMatches}</div>
                            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1.5">Toplam Maç</div>
                        </div>
                        <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center backdrop-blur-sm">
                            <div className="flex items-center gap-1.5">
                                <Star className="w-5 h-5 text-green-500 fill-green-500" />
                                <span className="text-green-400 font-sport font-black text-[clamp(20px,5vw,28px)] leading-none">
                                    {(teamFairPlayScore || 5.0).toFixed(1)}
                                </span>
                            </div>
                            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1.5">Fair Play Puanı</div>
                        </div>
                    </div>
                </div>

                {/* Match List */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-400 text-sm font-bold animate-pulse">Yükleniyor...</p>
                        </div>
                    ) : localMatches.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                            <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-slate-700/50 shadow-inner">
                                <Trophy className="w-12 h-12 text-slate-600" />
                            </div>
                            <div>
                                <p className="text-white font-black text-lg mb-1">Geçmiş maç yok</p>
                                <p className="text-slate-400 text-sm max-w-[260px] mx-auto">
                                    Henüz oynanan maç bulunmuyor.
                                </p>
                            </div>
                        </div>
                    ) : (
                        localMatches.map((match) => {
                            const dt = formatDate(match.slotTime);
                            const isFullyRated = match.isBusinessRated && (!match.needsFairPlayRating || match.isFairPlayRated);
                            const needsRating = match.needsBusinessRating || match.needsFairPlayRating;
                            const opponent = match.opponentTeamDeleted ? `(Silinmiş) ${match.opponentTeamName || 'Takım'}` : match.opponentTeamName;

                            return (
                                <div
                                    key={match.reservationId}
                                    className={`bg-slate-900/40 rounded-3xl border overflow-hidden relative group transition-all duration-300 ${
                                        isFullyRated
                                            ? 'border-turf-500/20 hover:border-turf-500/40'
                                            : needsRating
                                            ? 'border-purple-500/30 hover:border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                                            : 'border-slate-700/50 hover:border-slate-600'
                                    }`}
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity ${
                                        needsRating ? 'from-purple-500/5' : isFullyRated ? 'from-turf-500/5' : 'from-slate-500/5'
                                    } to-transparent`} />

                                    <div className="p-4 sm:p-5 relative z-10 flex flex-col gap-4">
                                        
                                        {/* Top Section: Date & Status */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3 bg-slate-800/60 p-2.5 rounded-2xl border border-slate-700/50 shrink-0">
                                                <div className="bg-slate-900/80 rounded-xl px-3 py-2 flex flex-col items-center justify-center min-w-[3.5rem] border border-slate-700/50">
                                                    <span className="text-white font-sport font-black text-lg leading-none">{dt.day}</span>
                                                    <span className="text-turf-400 font-bold text-[9px] uppercase mt-1">{dt.month}</span>
                                                </div>
                                                <div className="pr-2">
                                                    <div className="text-slate-300 text-xs font-medium flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {dt.time}</div>
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex flex-col items-end">
                                                {isFullyRated ? (
                                                    <div className="bg-turf-500/10 border border-turf-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                                        <CheckCircle className="w-3.5 h-3.5 text-turf-400" />
                                                        <span className="text-turf-400 font-bold text-[9px] uppercase tracking-wider">Değerlendirildi</span>
                                                    </div>
                                                ) : needsRating ? (
                                                    <button
                                                        onClick={() => openRatingForMatch(match)}
                                                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-lg shadow-purple-600/20 active:scale-95 border border-purple-500"
                                                    >
                                                        Değerlendir
                                                    </button>
                                                ) : !match.participated ? (
                                                    <span className="bg-slate-800 border border-slate-700 text-slate-400 font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg">Katılmadın</span>
                                                ) : match.businessDeleted ? (
                                                    <span className="bg-slate-800 border border-slate-700 text-slate-400 font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg">Kapandı</span>
                                                ) : (
                                                    <span className="bg-slate-800 border border-slate-700 text-slate-400 font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg">Rakipsiz</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Details Section */}
                                        <div className="flex flex-col gap-2.5">
                                            <div className="flex items-center gap-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/30">
                                                <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                                                <div className="min-w-0">
                                                    <div className="text-white font-bold text-sm truncate">{match.pitchName}</div>
                                                    <div className="text-slate-400 text-xs truncate mt-0.5">{match.businessName}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/30">
                                                <Users className="w-4 h-4 text-orange-400 shrink-0" />
                                                <div className="min-w-0">
                                                    <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Rakip Takım</div>
                                                    <div className={`font-bold text-sm truncate mt-0.5 ${match.opponentTeamDeleted ? 'text-amber-500/80' : 'text-white'}`}>
                                                        {opponent || 'Kendi Aramızda'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ratings Display */}
                                        {isFullyRated && (match.businessScore || match.fairPlayScore) ? (
                                            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-700/30 mt-1">
                                                {match.businessScore !== null && (
                                                    <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                                                        <Building2 className="w-3.5 h-3.5 text-yellow-500" />
                                                        <div className="flex gap-0.5">
                                                            {[1,2,3,4,5].map(s => (
                                                                <Star key={s} className={`w-3 h-3 ${s <= (match.businessScore || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {match.fairPlayScore !== null && (
                                                    <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                                                        <Shield className="w-3.5 h-3.5 text-green-500" />
                                                        <div className="flex gap-0.5">
                                                            {[1,2,3,4,5].map(s => (
                                                                <Star key={s} className={`w-3 h-3 ${s <= (match.fairPlayScore || 0) ? 'text-green-500 fill-green-500' : 'text-slate-600'}`} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : null}

                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {selectedForRating && (
                <RatingModal
                    key={selectedForRating.reservationId}
                    pending={selectedForRating}
                    onSubmit={handleRatingSubmit}
                    onSkip={handleRatingSkip}
                />
            )}
        </div>,
        document.body
    );
};
