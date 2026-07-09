import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Star, CheckCircle, Building2, Shield, MapPin, Users } from 'lucide-react';
import { JokerMatchHistoryItem, PendingRating } from '../../../../types';
import { JokerRatingModal } from '../../../../components/Modals/JokerRatingModal';
import api from '../../../../services/api';
import { useModalBodyClass } from '../../../../utils/useModalBodyClass';

interface JokerHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    matches: JokerMatchHistoryItem[];
    isLoading: boolean;
}

export const JokerHistoryModal: React.FC<JokerHistoryModalProps> = ({
    isOpen,
    onClose,
    matches,
    isLoading,
}) => {
    const [localMatches, setLocalMatches] = useState<JokerMatchHistoryItem[]>([]);
    const [selectedForRating, setSelectedForRating] = useState<PendingRating | null>(null);
    // Joker formundaki "{takım} için oynadın" bağlamı (PendingRating bunu taşımıyor)
    const [ratingInvitingTeam, setRatingInvitingTeam] = useState<string | null>(null);

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
            month: d.toLocaleDateString('tr-TR', { month: 'short' }).toUpperCase(),
            time: d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        };
    };

    const openRatingForMatch = (match: JokerMatchHistoryItem) => {
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
        setRatingInvitingTeam(match.invitingTeamName ?? null);
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
                        <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 flex-shrink-0">
                            <Sparkles className="w-6 h-6 text-amber-400" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-sport font-bold text-white uppercase italic tracking-wide truncate" style={{ fontSize: 'clamp(1rem, 4.5vw, 1.25rem)' }}>
                                Joker Geçmişi
                            </h3>
                            <p className="text-slate-400 truncate" style={{ fontSize: 'clamp(0.7rem, 3vw, 0.875rem)' }}>Joker olarak oynadığın maçlar</p>
                        </div>
                    </div>

                    <div className="bg-slate-900/60 p-3 rounded-xl text-center border border-slate-700/50">
                        <div className="text-amber-400 font-sport font-bold" style={{ fontSize: 'clamp(1.25rem, 6vw, 1.5rem)' }}>{totalMatches}</div>
                        <div className="text-slate-500 font-bold uppercase mt-0.5 whitespace-nowrap" style={{ fontSize: 'clamp(0.55rem, 2.4vw, 0.75rem)' }}>Joker Maçı</div>
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
                                <Sparkles className="w-10 h-10 text-slate-600" />
                            </div>
                            <p className="text-slate-500 text-sm font-medium">Henüz joker olarak oynadığın maç yok</p>
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
                                            ? 'border-amber-500/30'
                                            : 'border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-stretch">
                                        {/* Sol: Tarih bloğu */}
                                        <div
                                            className="bg-slate-800/60 flex flex-col items-center justify-center flex-shrink-0 border-r border-slate-700/50"
                                            style={{ width: 'clamp(46px, 13.5vw, 64px)', padding: 'clamp(0.5rem, 2vw, 1rem) clamp(0.25rem, 1vw, 0.5rem)' }}
                                        >
                                            <span className="text-white font-sport font-black leading-none" style={{ fontSize: 'clamp(1.1rem, 5.2vw, 1.5rem)' }}>{dt.day}</span>
                                            <span className="text-amber-400 font-bold uppercase mt-0.5" style={{ fontSize: 'clamp(0.55rem, 2.4vw, 0.7rem)' }}>{dt.month}</span>
                                            <span className="text-slate-400 mt-1" style={{ fontSize: 'clamp(0.5rem, 2.1vw, 0.625rem)' }}>{dt.time}</span>
                                        </div>

                                        {/* Orta: Maç bilgileri */}
                                        <div className="flex-1 min-w-0" style={{ padding: 'clamp(0.5rem, 2vw, 0.75rem)' }}>
                                            <div className="flex items-center gap-1.5 mb-1 min-w-0">
                                                <MapPin className="text-slate-500 flex-shrink-0" style={{ width: 'clamp(0.7rem, 3vw, 0.85rem)', height: 'clamp(0.7rem, 3vw, 0.85rem)' }} />
                                                <span className="text-slate-300 font-semibold truncate" style={{ fontSize: 'clamp(0.6rem, 2.7vw, 0.75rem)' }}>
                                                    {match.pitchName}
                                                </span>
                                                <span className="text-slate-600 flex-shrink-0" style={{ fontSize: 'clamp(0.6rem, 2.7vw, 0.75rem)' }}>·</span>
                                                <span className="text-slate-500 truncate" style={{ fontSize: 'clamp(0.6rem, 2.7vw, 0.75rem)' }}>{match.businessName}</span>
                                            </div>

                                            {match.invitingTeamName && (
                                                <div className="flex items-center gap-1.5 mb-1 min-w-0">
                                                    <Sparkles className="text-amber-500/80 flex-shrink-0" style={{ width: 'clamp(0.7rem, 3vw, 0.85rem)', height: 'clamp(0.7rem, 3vw, 0.85rem)' }} />
                                                    <span className="text-amber-400/90 truncate" style={{ fontSize: 'clamp(0.6rem, 2.7vw, 0.72rem)' }}>
                                                        {match.invitingTeamName} için oynadın
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                                                <Users className="text-slate-500 flex-shrink-0" style={{ width: 'clamp(0.7rem, 3vw, 0.85rem)', height: 'clamp(0.7rem, 3vw, 0.85rem)' }} />
                                                <span className="text-slate-400 truncate" style={{ fontSize: 'clamp(0.6rem, 2.7vw, 0.75rem)' }}>
                                                    {match.opponentTeamDeleted
                                                        ? `vs ${match.opponentTeamName || 'Silinmiş takım'}`
                                                        : match.opponentTeamName
                                                        ? `vs ${match.opponentTeamName}`
                                                        /* APPROVED joker maçında rakip yoksa maç kendi_aramizda'dır
                                                           (invariant: rakip_araniyor ancak opponent set edilince APPROVED olur;
                                                           canlı DB'de APPROVED+rakip_araniyor+rakipsiz = 0). */
                                                        : 'Kendi aramızda maçı'}
                                                </span>
                                            </div>
                                            {match.opponentTeamDeleted && (
                                                <p className="text-amber-500/80 font-medium mb-1.5 -mt-0.5 truncate" style={{ fontSize: 'clamp(0.55rem, 2.3vw, 0.65rem)' }}>
                                                    Bu takım artık mevcut değil
                                                </p>
                                            )}

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

                                        {/* Sağ: Durum */}
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
                                                    className="bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold rounded-xl transition-all whitespace-nowrap"
                                                    style={{ fontSize: 'clamp(0.6rem, 2.6vw, 0.72rem)', padding: 'clamp(0.4rem, 1.6vw, 0.55rem) clamp(0.6rem, 2.6vw, 0.9rem)' }}
                                                >
                                                    Değerlendir
                                                </button>
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

            {/* Inline Joker Rating Modal — joker maçından değerlendirme (amber, "{takım} için oynadın") */}
            {selectedForRating && (
                <JokerRatingModal
                    key={selectedForRating.reservationId}
                    pending={selectedForRating}
                    invitingTeamName={ratingInvitingTeam}
                    onSubmit={handleRatingSubmit}
                    onSkip={handleRatingSkip}
                />
            )}
        </div>,
        document.body
    );
};
