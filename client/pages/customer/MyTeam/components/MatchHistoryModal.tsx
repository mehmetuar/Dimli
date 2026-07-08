import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trophy, Star, CheckCircle, Building2, Shield, MapPin, Users } from 'lucide-react';
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

                    <div className="flex items-center gap-3 mb-4 min-w-0">
                        <div className="bg-purple-500/10 p-3 rounded-xl border border-purple-500/20 flex-shrink-0">
                            <Trophy className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-sport font-bold text-white uppercase italic tracking-wide truncate" style={{ fontSize: 'clamp(1rem, 4.5vw, 1.25rem)' }}>
                                Geçmiş Maçlar
                            </h3>
                            <p className="text-slate-400 truncate" style={{ fontSize: 'clamp(0.7rem, 3vw, 0.875rem)' }}>{totalMatches} maç oynandı</p>
                        </div>
                    </div>

                    {/* İki istatistik kartı */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-900/60 p-3 rounded-xl text-center border border-slate-700/50">
                            <div className="text-white font-sport font-bold" style={{ fontSize: 'clamp(1.25rem, 6vw, 1.5rem)' }}>{totalMatches}</div>
                            <div className="text-slate-500 font-bold uppercase mt-0.5 whitespace-nowrap" style={{ fontSize: 'clamp(0.55rem, 2.4vw, 0.75rem)' }}>Toplam Maç</div>
                        </div>
                        <div className="bg-slate-900/60 p-3 rounded-xl text-center border border-slate-700/50">
                            <div className="flex items-center justify-center gap-1">
                                <Star className="text-green-500 fill-green-500 flex-shrink-0" style={{ width: 'clamp(0.85rem, 3.6vw, 1rem)', height: 'clamp(0.85rem, 3.6vw, 1rem)' }} />
                                <span className="text-green-500 font-sport font-bold" style={{ fontSize: 'clamp(1.25rem, 6vw, 1.5rem)' }}>
                                    {(teamFairPlayScore || 5.0).toFixed(1)}
                                </span>
                            </div>
                            <div className="text-slate-500 font-bold uppercase mt-0.5 whitespace-nowrap" style={{ fontSize: 'clamp(0.55rem, 2.4vw, 0.75rem)' }}>Fair Play Puanı</div>
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
                                        {/* Sol: Tarih bloğu — koyu ton arka plan, beyaz gün sayısı, ekranla ölçeklenir */}
                                        <div
                                            className="bg-slate-800/60 flex flex-col items-center justify-center flex-shrink-0 border-r border-slate-700/50"
                                            style={{ width: 'clamp(46px, 13.5vw, 64px)', padding: 'clamp(0.5rem, 2vw, 1rem) clamp(0.25rem, 1vw, 0.5rem)' }}
                                        >
                                            <span className="text-white font-sport font-black leading-none" style={{ fontSize: 'clamp(1.1rem, 5.2vw, 1.5rem)' }}>{dt.day}</span>
                                            <span className="text-turf-400 font-bold uppercase mt-0.5" style={{ fontSize: 'clamp(0.55rem, 2.4vw, 0.7rem)' }}>{dt.month}</span>
                                            <span className="text-slate-400 mt-1" style={{ fontSize: 'clamp(0.5rem, 2.1vw, 0.625rem)' }}>{dt.time}</span>
                                        </div>

                                        {/* Orta: Maç bilgileri — yalnız burası daralır/truncate olur */}
                                        <div className="flex-1 min-w-0" style={{ padding: 'clamp(0.5rem, 2vw, 0.75rem)' }}>
                                            <div className="flex items-center gap-1.5 mb-1 min-w-0">
                                                <MapPin className="text-slate-500 flex-shrink-0" style={{ width: 'clamp(0.7rem, 3vw, 0.85rem)', height: 'clamp(0.7rem, 3vw, 0.85rem)' }} />
                                                <span className="text-slate-300 font-semibold truncate" style={{ fontSize: 'clamp(0.6rem, 2.7vw, 0.75rem)' }}>
                                                    {match.pitchName}
                                                </span>
                                                <span className="text-slate-600 flex-shrink-0" style={{ fontSize: 'clamp(0.6rem, 2.7vw, 0.75rem)' }}>·</span>
                                                <span className="text-slate-500 truncate" style={{ fontSize: 'clamp(0.6rem, 2.7vw, 0.75rem)' }}>{match.businessName}</span>
                                            </div>

                                            <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                                                <Users className="text-slate-500 flex-shrink-0" style={{ width: 'clamp(0.7rem, 3vw, 0.85rem)', height: 'clamp(0.7rem, 3vw, 0.85rem)' }} />
                                                <span className="text-slate-400 truncate" style={{ fontSize: 'clamp(0.6rem, 2.7vw, 0.75rem)' }}>
                                                    {match.opponentTeamDeleted
                                                        ? `vs ${match.opponentTeamName || 'Silinmiş takım'}`
                                                        : match.opponentTeamName
                                                        ? `vs ${match.opponentTeamName}`
                                                        : 'Kendi Aramızda'}
                                                </span>
                                            </div>
                                            {match.opponentTeamDeleted && (
                                                <p className="text-amber-500/80 font-medium mb-1.5 -mt-0.5 truncate" style={{ fontSize: 'clamp(0.55rem, 2.3vw, 0.65rem)' }}>
                                                    Bu takım artık mevcut değil
                                                </p>
                                            )}

                                            {/* Rating bilgisi - Yapıldıysa göster */}
                                            {isFullyRated && (
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    {match.businessScore !== null && (
                                                        <div className="flex items-center gap-1">
                                                            <Building2 className="text-yellow-500 flex-shrink-0" style={{ width: 'clamp(0.7rem, 3vw, 0.85rem)', height: 'clamp(0.7rem, 3vw, 0.85rem)' }} />
                                                            <div className="flex gap-0.5">
                                                                {[1,2,3,4,5].map(s => (
                                                                    <Star
                                                                        key={s}
                                                                        className={s <= (match.businessScore || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}
                                                                        style={{ width: 'clamp(0.55rem, 2.4vw, 0.7rem)', height: 'clamp(0.55rem, 2.4vw, 0.7rem)' }}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {match.fairPlayScore !== null && (
                                                        <div className="flex items-center gap-1">
                                                            <Shield className="text-green-500 flex-shrink-0" style={{ width: 'clamp(0.7rem, 3vw, 0.85rem)', height: 'clamp(0.7rem, 3vw, 0.85rem)' }} />
                                                            <div className="flex gap-0.5">
                                                                {[1,2,3,4,5].map(s => (
                                                                    <Star
                                                                        key={s}
                                                                        className={s <= (match.fairPlayScore || 0) ? 'text-green-500 fill-green-500' : 'text-slate-600'}
                                                                        style={{ width: 'clamp(0.55rem, 2.4vw, 0.7rem)', height: 'clamp(0.55rem, 2.4vw, 0.7rem)' }}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Sağ: Durum — tek satır, asla wrap/sıkışma; ekranla küçülür */}
                                        <div className="flex items-center justify-center flex-shrink-0" style={{ padding: 'clamp(0.5rem, 2vw, 0.75rem)' }}>
                                            {isFullyRated ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <CheckCircle className="text-turf-400" style={{ width: 'clamp(1rem, 4.5vw, 1.25rem)', height: 'clamp(1rem, 4.5vw, 1.25rem)' }} />
                                                    <span className="text-turf-400 font-bold uppercase text-center whitespace-nowrap leading-none" style={{ fontSize: 'clamp(0.5rem, 2.1vw, 0.62rem)' }}>
                                                        Değerlendirildi
                                                    </span>
                                                </div>
                                            ) : needsRating ? (
                                                <button
                                                    onClick={() => openRatingForMatch(match)}
                                                    className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-xl transition-all whitespace-nowrap"
                                                    style={{ fontSize: 'clamp(0.6rem, 2.6vw, 0.72rem)', padding: 'clamp(0.4rem, 1.6vw, 0.55rem) clamp(0.6rem, 2.6vw, 0.9rem)' }}
                                                >
                                                    Değerlendir
                                                </button>
                                            ) : !match.participated ? (
                                                <span className="text-slate-500 font-bold uppercase text-center whitespace-nowrap" style={{ fontSize: 'clamp(0.5rem, 2.1vw, 0.62rem)' }}>
                                                    Katılmadın
                                                </span>
                                            ) : match.businessDeleted ? (
                                                <span className="text-slate-500 font-bold uppercase text-center whitespace-nowrap" style={{ fontSize: 'clamp(0.5rem, 2.1vw, 0.62rem)' }}>
                                                    Kapandı
                                                </span>
                                            ) : (
                                                <span className="text-slate-500 font-bold uppercase text-center whitespace-nowrap" style={{ fontSize: 'clamp(0.5rem, 2.1vw, 0.62rem)' }}>
                                                    Rakip Yok
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
