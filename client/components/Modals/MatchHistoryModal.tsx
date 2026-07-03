import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trophy, Star, CheckCircle, Building2, Shield, MapPin, Users } from 'lucide-react';
import { MatchHistoryItem, PendingRating } from '../../types';
import { RatingModal } from './RatingModal';
import api from '../../services/api';
import { useModalBodyClass } from '../../utils/useModalBodyClass';

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

    // matches prop değişince local kopyayı güncelle
    React.useEffect(() => {
        setLocalMatches(matches);
    }, [matches]);

    if (!isOpen) return null;

    const totalMatches = localMatches.length;
    const ratedCount = localMatches.filter(m => m.isBusinessRated).length;

    const formatDate = (isoStr: string) => {
        const d = new Date(isoStr);
        return {
            day: d.toLocaleDateString('tr-TR', { day: '2-digit' }),
            month: d.toLocaleDateString('tr-TR', { month: 'short' }).toUpperCase(),
            time: d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
            full: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
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
            // 409 duplicate ise zaten yapılmış, sessizce geç
        }

        // Yerel state'i güncelle
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

    // Portal → body: TeamProfile scroll konteynerine hapsolmasın (backdrop tüm ekranı kaplasın)
    return createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 w-full max-w-2xl max-h-[85vh] rounded-3xl border border-slate-700 overflow-hidden relative shadow-2xl animate-scale-in flex flex-col">

                {/* Header */}
                <div className="p-5 border-b border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-slate-900/50 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-purple-500/10 p-3 rounded-xl border border-purple-500/20">
                            <Trophy className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-sport font-bold text-white uppercase italic tracking-wide">
                                Geçmiş Maçlar
                            </h3>
                            <p className="text-sm text-slate-400">{totalMatches} maç oynandı</p>
                        </div>
                    </div>

                    {/* İki istatistik kartı */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-900/60 p-3 rounded-xl text-center border border-slate-700/50">
                            <div className="text-white font-sport font-bold text-2xl">{totalMatches}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase mt-0.5">Toplam Maç</div>
                        </div>
                        <div className="bg-slate-900/60 p-3 rounded-xl text-center border border-slate-700/50">
                            <div className="flex items-center justify-center gap-1">
                                <Star className="w-4 h-4 text-green-500 fill-green-500" />
                                <span className="text-green-500 font-sport font-bold text-2xl">
                                    {(teamFairPlayScore || 5.0).toFixed(1)}
                                </span>
                            </div>
                            <div className="text-xs text-slate-500 font-bold uppercase mt-0.5">Fair Play Puanı</div>
                        </div>
                    </div>
                </div>

                {/* Maç Listesi */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="text-slate-500 text-sm animate-pulse">Maçlar yükleniyor...</div>
                        </div>
                    ) : localMatches.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="bg-slate-700/50 p-4 rounded-2xl">
                                <Trophy className="w-10 h-10 text-slate-600" />
                            </div>
                            <p className="text-slate-500 text-sm font-medium">Henüz oynanan maç bulunmuyor</p>
                        </div>
                    ) : (
                        localMatches.map((match) => {
                            const dt = formatDate(match.slotTime);
                            const isFullyRated = match.isBusinessRated && (!match.needsFairPlayRating || match.isFairPlayRated);
                            const needsRating = match.needsBusinessRating || match.needsFairPlayRating;

                            return (
                                <div
                                    key={match.reservationId}
                                    className={`bg-slate-900/50 border rounded-2xl overflow-hidden transition-colors ${
                                        isFullyRated
                                            ? 'border-turf-500/20'
                                            : needsRating
                                            ? 'border-indigo-500/30'
                                            : 'border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-stretch">
                                        {/* Sol: Tarih bloğu */}
                                        <div className="bg-turf-700/30 flex flex-col items-center justify-center px-4 py-4 min-w-[60px] border-r border-turf-700/20">
                                            <span className="text-turf-300 font-sport font-bold text-2xl leading-none">{dt.day}</span>
                                            <span className="text-turf-400 text-xs font-bold uppercase mt-0.5">{dt.month}</span>
                                            <span className="text-slate-500 text-[10px] mt-1">{dt.time}</span>
                                        </div>

                                        {/* Orta: Maç bilgileri */}
                                        <div className="flex-1 p-3 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                                <span className="text-slate-300 text-xs font-semibold truncate">
                                                    {match.pitchName}
                                                </span>
                                                <span className="text-slate-600 text-xs">·</span>
                                                <span className="text-slate-500 text-xs truncate">{match.businessName}</span>
                                            </div>

                                            <div className="flex items-center gap-1.5 mb-2">
                                                <Users className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                                <span className="text-slate-400 text-xs truncate">
                                                    {match.opponentTeamDeleted
                                                        ? `vs ${match.opponentTeamName || 'Silinmiş takım'}`
                                                        : match.opponentTeamName
                                                        ? `vs ${match.opponentTeamName}`
                                                        : 'Kendi Aramızda'}
                                                </span>
                                            </div>
                                            {match.opponentTeamDeleted && (
                                                <p className="text-[10px] text-amber-500/80 font-medium mb-2 -mt-1">
                                                    Bu takım artık mevcut değil
                                                </p>
                                            )}

                                            {/* Rating bilgisi - Yapıldıysa göster */}
                                            {isFullyRated && (
                                                <div className="flex items-center gap-3">
                                                    {match.businessScore !== null && (
                                                        <div className="flex items-center gap-1">
                                                            <Building2 className="w-3 h-3 text-yellow-500" />
                                                            <div className="flex gap-0.5">
                                                                {[1,2,3,4,5].map(s => (
                                                                    <Star
                                                                        key={s}
                                                                        className={`w-2.5 h-2.5 ${s <= (match.businessScore || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {match.fairPlayScore !== null && (
                                                        <div className="flex items-center gap-1">
                                                            <Shield className="w-3 h-3 text-green-500" />
                                                            <div className="flex gap-0.5">
                                                                {[1,2,3,4,5].map(s => (
                                                                    <Star
                                                                        key={s}
                                                                        className={`w-2.5 h-2.5 ${s <= (match.fairPlayScore || 0) ? 'text-green-500 fill-green-500' : 'text-slate-600'}`}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Sağ: Durum */}
                                        <div className="flex items-center justify-center px-3">
                                            {isFullyRated ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <CheckCircle className="w-5 h-5 text-turf-400" />
                                                    <span className="text-[9px] text-turf-400 font-bold uppercase text-center leading-tight">
                                                        Değer<br/>lendirildi
                                                    </span>
                                                </div>
                                            ) : needsRating ? (
                                                <button
                                                    onClick={() => openRatingForMatch(match)}
                                                    className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[10px] font-bold px-2.5 py-2 rounded-xl transition-all text-center leading-tight"
                                                >
                                                    Değer<br/>lendir
                                                </button>
                                            ) : match.businessDeleted ? (
                                                <span className="text-[9px] text-slate-600 font-bold uppercase text-center leading-tight">
                                                    Kapandı
                                                </span>
                                            ) : (
                                                <span className="text-[9px] text-slate-600 font-bold uppercase text-center leading-tight">
                                                    Rakip<br/>Yok
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700 bg-slate-900/50">
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-700 text-white font-bold py-3 rounded-xl hover:bg-slate-600 transition-colors"
                    >
                        Kapat
                    </button>
                </div>
            </div>

            {/* Inline Rating Modal — Geçmiş maçtan değerlendirme */}
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
