import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trophy, Star, CheckCircle, Building2, Shield, MapPin, Users, Calendar, Clock } from 'lucide-react';
import { MatchHistoryItem, PendingRating } from '../../../../types';
import { RatingModal } from '../../../../components/Modals/RatingModal';
import api from '../../../../services/api';
import { useModalBodyClass } from '../../../../utils/useModalBodyClass';
import { addOneHour } from '../../../../utils/time';

interface MatchHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    matches: MatchHistoryItem[];
    /** Sunucudaki toplam maç sayısı (sayfalı) — matches.length değil */
    total: number;
    hasMore: boolean;
    isLoading: boolean;
    isLoadingMore: boolean;
    onLoadMore: () => void;
    applyRatingResult: (reservationId: string, businessScore: number, fairPlayScore: number | null) => void;
    teamFairPlayScore: number;
}

export const MatchHistoryModal: React.FC<MatchHistoryModalProps> = ({
    isOpen,
    onClose,
    matches,
    total,
    hasMore,
    isLoading,
    isLoadingMore,
    onLoadMore,
    applyRatingResult,
    teamFairPlayScore,
}) => {
    const [selectedForRating, setSelectedForRating] = useState<PendingRating | null>(null);

    useModalBodyClass(isOpen);

    if (!isOpen) return null;

    const totalMatches = total;

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

        // Güncelleme hook'un birikmeli listesinde yaşar — sonraki sayfa
        // append'leri bu optimistic sonucu silemez.
        applyRatingResult(reservationId, businessScore, fairPlayScore);
        setSelectedForRating(null);
    };

    const handleRatingSkip = () => {
        setSelectedForRating(null);
    };

    return createPortal(
        <>
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="bg-slate-800 w-full max-w-lg max-h-[85vh] rounded-[2.5rem] border border-slate-700/50 overflow-hidden relative shadow-2xl flex flex-col animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Header */}
                <div className="p-6 border-b border-slate-700/50 relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-800/40 to-slate-900" />
                    
                    {/* z-20: başlık satırı da z-10 — buton altta kalırsa dokunuşları başlık yutar */}
                    <button
                        onClick={onClose}
                        aria-label="Kapat"
                        className="absolute top-3 right-3 bg-slate-900/50 p-3 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 active:bg-slate-700 transition-colors z-20 backdrop-blur-sm shadow-sm"
                    >
                        <X className="w-6 h-6" />
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

                {/* Match List — sonsuz kaydırma: dibe <600px kala sonraki sayfa (yarış guard'ı hook'ta) */}
                <div
                    className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
                    onScroll={(e) => {
                        const el = e.currentTarget;
                        if (hasMore && el.scrollHeight - el.scrollTop - el.clientHeight < 600) onLoadMore();
                    }}
                >
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-400 text-sm font-bold animate-pulse">Yükleniyor...</p>
                        </div>
                    ) : matches.length === 0 ? (
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
                        matches.map((match) => {
                            const dt = formatDate(match.slotTime);
                            const endTimeStr = addOneHour(dt.time) || '';
                            const isFullyRated = match.isBusinessRated && (!match.needsFairPlayRating || match.isFairPlayRated);
                            const needsRating = match.needsBusinessRating || match.needsFairPlayRating;
                            const opponent = match.opponentTeamDeleted ? `(Silinmiş) ${match.opponentTeamName || 'Takım'}` : match.opponentTeamName;

                            return (
                                <div
                                    key={match.reservationId}
                                    className={`bg-slate-900/40 rounded-2xl border overflow-hidden transition-all duration-300 ${
                                        isFullyRated
                                            ? 'border-turf-500/20'
                                            : needsRating
                                            ? 'border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                                            : 'border-slate-700/50'
                                    }`}
                                >
                                    {/* Durum çubuğu — tam genişlik: dar ekranda rozet/yazı taşması imkânsız */}
                                    <div className={`px-3 py-1.5 min-h-[38px] flex items-center justify-between gap-2 border-b ${
                                        isFullyRated
                                            ? 'bg-turf-500/10 border-turf-500/10'
                                            : needsRating
                                            ? 'bg-purple-500/10 border-purple-500/10'
                                            : 'bg-slate-800/60 border-slate-700/40'
                                    }`}>
                                        {isFullyRated ? (
                                            <>
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <CheckCircle className="w-3.5 h-3.5 text-turf-400 shrink-0" />
                                                    <span className="text-turf-400 font-black text-[clamp(9px,2.6vw,10px)] uppercase tracking-wider truncate">Değerlendirildi</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {match.businessScore !== null && (
                                                        <span className="flex items-center gap-1 bg-slate-900/50 px-1.5 py-1 rounded-md border border-slate-700/50">
                                                            <Building2 className="w-3 h-3 text-yellow-500" />
                                                            <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                                                            <span className="text-yellow-400 text-[10px] font-bold leading-none">{match.businessScore}</span>
                                                        </span>
                                                    )}
                                                    {match.fairPlayScore !== null && (
                                                        <span className="flex items-center gap-1 bg-slate-900/50 px-1.5 py-1 rounded-md border border-slate-700/50">
                                                            <Shield className="w-3 h-3 text-green-500" />
                                                            <Star className="w-2.5 h-2.5 text-green-500 fill-green-500" />
                                                            <span className="text-green-400 text-[10px] font-bold leading-none">{match.fairPlayScore}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </>
                                        ) : needsRating ? (
                                            <>
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <Star className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                                    <span className="text-purple-300 font-black text-[clamp(9px,2.6vw,10px)] uppercase tracking-wider truncate">Puan Bekliyor</span>
                                                </div>
                                                <button
                                                    onClick={() => openRatingForMatch(match)}
                                                    className="shrink-0 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[clamp(9px,2.8vw,11px)] uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all shadow-lg shadow-purple-600/20 active:scale-95 border border-purple-500"
                                                >
                                                    Değerlendir
                                                </button>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <CheckCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                                <span className="text-slate-400 font-black text-[clamp(9px,2.6vw,10px)] uppercase tracking-wider truncate">
                                                    {!match.participated ? 'Katılmadın' : match.businessDeleted ? 'Kapandı' : 'Rakipsiz'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Bilgi satırları — tek konteyner + ayraç: kart başına dikey alan minimum */}
                                    <div className="p-3">
                                        <div className="bg-slate-800/40 rounded-xl border border-slate-700/30 divide-y divide-slate-700/30">
                                            <div className="px-3 py-2 flex items-center gap-2.5">
                                                <Calendar className="w-4 h-4 text-turf-400 shrink-0" />
                                                <span className="text-white font-bold text-[clamp(11px,3.4vw,13px)] truncate flex-1 min-w-0">{dt.day} {dt.month}</span>
                                                <span className="flex items-center gap-1 text-slate-300 text-[clamp(10px,3vw,12px)] font-medium shrink-0">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    {dt.time} - {endTimeStr}
                                                </span>
                                            </div>
                                            <div className="px-3 py-2 flex items-center gap-2.5">
                                                <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                                                <div className="min-w-0">
                                                    <div className="text-white font-bold text-[clamp(12px,3.6vw,14px)] truncate">{match.pitchName}</div>
                                                    <div className="text-slate-400 text-[clamp(10px,3vw,12px)] truncate mt-0.5">{match.businessName}</div>
                                                </div>
                                            </div>
                                            <div className="px-3 py-2 flex items-center gap-2.5">
                                                <Users className="w-4 h-4 text-orange-400 shrink-0" />
                                                <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider shrink-0">Rakip</span>
                                                <span className={`font-bold text-[clamp(12px,3.6vw,14px)] truncate flex-1 min-w-0 text-right ${match.opponentTeamDeleted ? 'text-amber-500/80' : 'text-white'}`}>
                                                    {opponent || 'Kendi Aramızda'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {isLoadingMore && (
                        <div className="flex justify-center py-3">
                            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Backdrop'un DIŞINDA kardeş katman: iç içe render'da RatingModal'a her dokunuş
            backdrop onClick'ine kabarcıklanıp geçmiş maçlar modalını kapatıyordu → puanlama yapılamıyordu */}
        {selectedForRating && (
            <RatingModal
                key={selectedForRating.reservationId}
                pending={selectedForRating}
                onSubmit={handleRatingSubmit}
                onSkip={handleRatingSkip}
            />
        )}
        </>,
        document.body
    );
};
