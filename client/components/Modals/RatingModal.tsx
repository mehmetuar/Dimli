import React, { useState, useEffect } from 'react';
import { Building2, Shield, Star } from 'lucide-react';
import { PendingRating } from '../../types';
import { useModalBodyClass } from '../../utils/useModalBodyClass';
import { StarRating } from '../UI/StarRating';

interface RatingModalProps {
    pending: PendingRating;
    onSubmit: (
        reservationId: string,
        businessScore: number,
        fairPlayScore: number | null
    ) => Promise<void>;
    onSkip: () => void;
}

const LABELS: Record<number, string> = { 1: 'Berbat', 2: 'Kötü', 3: 'Orta', 4: 'İyi', 5: 'Harika!' };
const FP_LABELS: Record<number, string> = { 1: 'Çok Kötü', 2: 'Kötü', 3: 'Orta', 4: 'İyi', 5: 'Mükemmel!' };

// Renk dili (uygulama geneliyle tutarlı): işletme = SARI (yıldız/rozet
// varsayılanı), fair-play = YEŞİL (FairPlayScore yeşili). Indigo kullanılmaz.
export const RatingModal: React.FC<RatingModalProps> = ({ pending, onSubmit, onSkip }) => {
    useModalBodyClass(true);
    useEffect(() => { (document.activeElement as HTMLElement)?.blur(); }, []);
    const hasBothSteps = pending.needsFairPlayRating && !!pending.opponentTeamId;

    // If business is already rated, start directly at fairplay step
    const initialStep = !pending.needsBusinessRating && hasBothSteps ? 'fairplay' : 'business';
    const [step, setStep] = useState<'business' | 'fairplay'>(initialStep);
    const [businessScore, setBusinessScore] = useState(0);
    const [fairPlayScore, setFairPlayScore] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    const start = new Date(pending.slotTime);
    const matchDate = start.toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'long', weekday: 'long',
    });
    const matchTime = start.toLocaleTimeString('tr-TR', {
        hour: '2-digit', minute: '2-digit',
    });
    // Sahalar 1 saatlik slotlarla çalışır → bitiş = başlangıç + 1 saat.
    const matchEndTime = new Date(start.getTime() + 60 * 60 * 1000).toLocaleTimeString('tr-TR', {
        hour: '2-digit', minute: '2-digit',
    });

    const activeScore = step === 'business' ? businessScore : fairPlayScore;
    const canProceed = (activeScore > 0 || (step === 'business' && pending.businessDeleted)) && !submitting;
    const isBusinessStep = step === 'business';

    const handlePrimaryAction = async () => {
        if (step === 'business' && hasBothSteps) {
            // Move to fairplay step (don't submit yet)
            setStep('fairplay');
            return;
        }
        // Final submission
        setSubmitting(true);
        try {
            const fpScore = hasBothSteps && fairPlayScore > 0 ? fairPlayScore : null;
            await onSubmit(pending.reservationId, businessScore, fpScore);
        } finally {
            setSubmitting(false);
        }
    };

    const buttonLabel = submitting
        ? 'Gönderiliyor...'
        : step === 'business' && hasBothSteps
        ? 'Devam Et →'
        : 'Gönder';

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-sm bg-slate-800 rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden animate-slide-up" data-tour-id="team-rating-modal">
                {/* Header — Geçmiş Maçlar başlık dili: gradyan overlay + tintli ikon kutusu.
                    Gradyan adım-duyarlı: işletme sarı, fair-play yeşil (yumuşak geçiş). */}
                <div className="p-5 border-b border-slate-700/50 relative overflow-hidden">
                    <div
                        className={`absolute inset-0 transition-colors duration-500 bg-gradient-to-br ${
                            isBusinessStep ? 'from-yellow-600/20' : 'from-turf-600/25'
                        } to-slate-900`}
                    />
                    <div className="flex items-center gap-3 relative z-10">
                        <div
                            className={`p-3 rounded-2xl border shadow-lg transition-colors duration-500 ${
                                isBusinessStep
                                    ? 'bg-yellow-500/20 border-yellow-500/20 shadow-yellow-500/10'
                                    : 'bg-turf-500/20 border-turf-500/20 shadow-turf-500/10'
                            }`}
                        >
                            <Star className={`w-6 h-6 transition-colors duration-500 ${isBusinessStep ? 'text-yellow-400' : 'text-turf-400'}`} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[clamp(15px,4.6vw,19px)] font-sport font-black text-white uppercase italic tracking-wide">
                                Maç Değerlendirmesi
                            </h3>
                            <p className="text-[clamp(11px,3vw,12px)] text-slate-300 font-semibold truncate">
                                {matchDate} · {matchTime} - {matchEndTime}
                            </p>
                            <p className="text-[clamp(10px,2.8vw,11px)] text-slate-400 truncate">
                                {pending.pitchName} — {pending.businessName}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Clickable Tab Indicator (only when both steps needed) */}
                {hasBothSteps && (
                    <div className="flex border-b border-slate-700">
                        <button
                            type="button"
                            onClick={() => {
                                if (pending.businessDeleted) return;
                                setStep('business');
                            }}
                            disabled={pending.businessDeleted}
                            className={`flex-1 py-2.5 text-center text-xs font-bold transition-colors ${
                                pending.businessDeleted
                                    ? 'text-slate-700 cursor-not-allowed'
                                    : step === 'business'
                                    ? 'text-yellow-400 border-b-2 border-yellow-400'
                                    : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            <Building2 className="w-3.5 h-3.5 inline mr-1 mb-0.5" />
                            İşletme{pending.businessDeleted ? ' (Kapandı)' : ''}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                // Only allow switching to fair play if business is rated (or not needed)
                                if (!pending.needsBusinessRating || businessScore > 0) {
                                    setStep('fairplay');
                                }
                            }}
                            className={`flex-1 py-2.5 text-center text-xs font-bold transition-colors ${
                                step === 'fairplay'
                                    ? 'text-turf-400 border-b-2 border-turf-400'
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
                <div className="p-6">
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
                            <div className="flex items-center gap-2.5 mb-5">
                                <div className="bg-yellow-500/10 p-2 rounded-xl border border-yellow-500/20">
                                    <Building2 className="w-5 h-5 text-yellow-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-white font-bold text-sm truncate">{pending.businessName}</p>
                                    <p className="text-slate-400 text-xs">Tesis deneyimini değerlendir</p>
                                </div>
                            </div>
                            <div className="py-1">
                                <StarRating value={businessScore} onChange={setBusinessScore} color="yellow" />
                            </div>
                            <p className={`text-center text-xs font-bold mt-2.5 h-4 transition-colors ${businessScore > 0 ? 'text-yellow-300 animate-fade-in' : 'text-slate-500'}`}>
                                {LABELS[businessScore] ?? ''}
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2.5 mb-5">
                                <div className="bg-turf-500/10 p-2 rounded-xl border border-turf-500/20">
                                    <Shield className="w-5 h-5 text-turf-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-white font-bold text-sm truncate">{pending.opponentTeamName}</p>
                                    <p className="text-slate-400 text-xs">Rakip takımın fair play'ini değerlendir</p>
                                </div>
                            </div>
                            <div className="py-1">
                                <StarRating value={fairPlayScore} onChange={setFairPlayScore} color="green" />
                            </div>
                            <p className={`text-center text-xs font-bold mt-2.5 h-4 transition-colors ${fairPlayScore > 0 ? 'text-turf-300 animate-fade-in' : 'text-slate-500'}`}>
                                {FP_LABELS[fairPlayScore] ?? ''}
                            </p>
                        </>
                    )}

                    <button
                        onClick={handlePrimaryAction}
                        disabled={!canProceed}
                        className={`mt-5 w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg ${
                            isBusinessStep && hasBothSteps
                                ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900 shadow-yellow-500/20'
                                : 'bg-turf-600 hover:bg-turf-500 text-white shadow-turf-600/20'
                        }`}
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
