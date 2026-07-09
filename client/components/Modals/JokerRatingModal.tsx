import React, { useState, useEffect } from 'react';
import { Building2, Shield, Sparkles } from 'lucide-react';
import { PendingRating } from '../../types';
import { useModalBodyClass } from '../../utils/useModalBodyClass';
import { StarRating } from '../UI/StarRating';

interface JokerRatingModalProps {
    pending: PendingRating;
    /** Kullanıcının JOKER olarak oynadığı takım — "X için oynadın" bağlamı */
    invitingTeamName?: string | null;
    onSubmit: (
        reservationId: string,
        businessScore: number,
        fairPlayScore: number | null
    ) => Promise<void>;
    onSkip: () => void;
}

const LABELS: Record<number, string> = { 1: 'Berbat', 2: 'Kötü', 3: 'Orta', 4: 'İyi', 5: 'Harika!' };
const FP_LABELS: Record<number, string> = { 1: 'Çok Kötü', 2: 'Kötü', 3: 'Orta', 4: 'İyi', 5: 'Mükemmel!' };

/**
 * JOKER maçı değerlendirme formu — takım formundan (RatingModal) AYRI tasarım.
 * Amber tema + "{takım} için joker oynadın" bağlam bandı. Yalnız Joker Geçmişi'nden manuel açılır
 * (asla otomatik değil). Alanlar aynı: tesis (sarı) + varsa rakip fair-play (yeşil).
 */
export const JokerRatingModal: React.FC<JokerRatingModalProps> = ({ pending, invitingTeamName, onSubmit, onSkip }) => {
    useModalBodyClass(true);
    useEffect(() => { (document.activeElement as HTMLElement)?.blur(); }, []);

    const hasBothSteps = pending.needsFairPlayRating && !!pending.opponentTeamId;
    const initialStep = !pending.needsBusinessRating && hasBothSteps ? 'fairplay' : 'business';
    const [step, setStep] = useState<'business' | 'fairplay'>(initialStep);
    const [businessScore, setBusinessScore] = useState(0);
    const [fairPlayScore, setFairPlayScore] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    const start = new Date(pending.slotTime);
    const matchDate = start.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
    const matchTime = start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const matchEndTime = new Date(start.getTime() + 60 * 60 * 1000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    const activeScore = step === 'business' ? businessScore : fairPlayScore;
    const canProceed = (activeScore > 0 || (step === 'business' && pending.businessDeleted)) && !submitting;

    const handlePrimaryAction = async () => {
        if (step === 'business' && hasBothSteps) {
            setStep('fairplay');
            return;
        }
        setSubmitting(true);
        try {
            const fpScore = hasBothSteps && fairPlayScore > 0 ? fairPlayScore : null;
            await onSubmit(pending.reservationId, businessScore, fpScore);
        } finally {
            setSubmitting(false);
        }
    };

    const buttonLabel = submitting ? 'Gönderiliyor...' : step === 'business' && hasBothSteps ? 'Devam Et →' : 'Gönder';

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-sm bg-slate-800 rounded-3xl border border-amber-500/20 shadow-2xl overflow-hidden">
                {/* Header — amber joker teması */}
                <div className="bg-gradient-to-b from-amber-950/40 to-slate-800 px-5 py-4 border-b border-amber-500/20">
                    <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-0.5">
                        Joker Değerlendirmesi
                    </p>
                    <p className="text-white font-bold text-sm">{matchDate} · {matchTime} - {matchEndTime}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{pending.pitchName} — {pending.businessName}</p>
                </div>

                {/* Bağlam bandı: "{takım} için joker oynadın" */}
                <div className="mx-5 mt-4 flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl px-3.5 py-2.5">
                    <div className="bg-amber-500/15 p-1.5 rounded-lg border border-amber-500/25 shrink-0">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-[13px] text-amber-100/90 font-semibold leading-tight">
                        {invitingTeamName
                            ? <><span className="text-amber-300 font-black">{invitingTeamName}</span> için joker oynadın</>
                            : 'Joker olarak oynadın'}
                    </p>
                </div>

                {/* Tab (yalnız iki adım gerektiğinde) */}
                {hasBothSteps && (
                    <div className="flex border-b border-slate-700 mt-4">
                        <button
                            type="button"
                            onClick={() => { if (!pending.businessDeleted) setStep('business'); }}
                            disabled={pending.businessDeleted}
                            className={`flex-1 py-2.5 text-center text-xs font-bold transition-colors ${
                                pending.businessDeleted
                                    ? 'text-slate-700 cursor-not-allowed'
                                    : step === 'business'
                                    ? 'text-amber-400 border-b-2 border-amber-400'
                                    : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            <Building2 className="w-3.5 h-3.5 inline mr-1 mb-0.5" />
                            İşletme{pending.businessDeleted ? ' (Kapandı)' : ''}
                        </button>
                        <button
                            type="button"
                            onClick={() => { if (!pending.needsBusinessRating || businessScore > 0) setStep('fairplay'); }}
                            className={`flex-1 py-2.5 text-center text-xs font-bold transition-colors ${
                                step === 'fairplay'
                                    ? 'text-green-400 border-b-2 border-green-400'
                                    : pending.needsBusinessRating && businessScore === 0
                                    ? 'text-slate-700 cursor-not-allowed'
                                    : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            <Shield className="w-3.5 h-3.5 inline mr-1 mb-0.5" />
                            Fair Play
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="p-6 pt-4">
                    {step === 'business' && pending.businessDeleted ? (
                        <div className="text-center py-2">
                            <div className="bg-slate-700/50 p-3 rounded-2xl inline-flex mb-3">
                                <Building2 className="w-6 h-6 text-slate-500" />
                            </div>
                            <p className="text-white font-bold text-sm">{pending.businessName}</p>
                            <p className="text-slate-400 text-xs mt-1">
                                Bu işletme artık hizmet vermiyor, değerlendirme yapılamıyor.
                            </p>
                        </div>
                    ) : step === 'business' ? (
                        <>
                            <div className="flex items-center gap-2 mb-5">
                                <div className="bg-yellow-500/10 p-2 rounded-xl border border-yellow-500/20">
                                    <Building2 className="w-5 h-5 text-yellow-400" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">{pending.businessName}</p>
                                    <p className="text-slate-400 text-xs">Tesis deneyimini değerlendir</p>
                                </div>
                            </div>
                            <StarRating value={businessScore} onChange={setBusinessScore} color="yellow" />
                            <p className="text-center text-slate-400 text-xs mt-2 h-4">{LABELS[businessScore] ?? ''}</p>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 mb-5">
                                <div className="bg-green-500/10 p-2 rounded-xl border border-green-500/20">
                                    <Shield className="w-5 h-5 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">{pending.opponentTeamName}</p>
                                    <p className="text-slate-400 text-xs">Rakip takımın fair play'ini değerlendir</p>
                                </div>
                            </div>
                            <StarRating value={fairPlayScore} onChange={setFairPlayScore} color="green" />
                            <p className="text-center text-slate-400 text-xs mt-2 h-4">{FP_LABELS[fairPlayScore] ?? ''}</p>
                        </>
                    )}

                    <button
                        onClick={handlePrimaryAction}
                        disabled={!canProceed}
                        className="mt-5 w-full py-3 rounded-2xl font-bold text-sm text-white bg-amber-600 active:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                        {buttonLabel}
                    </button>

                    <button
                        onClick={onSkip}
                        className="mt-3 w-full py-2 text-slate-500 text-xs font-medium hover:text-slate-400 transition-colors"
                    >
                        Sonra Yap
                    </button>
                </div>
            </div>
        </div>
    );
};
