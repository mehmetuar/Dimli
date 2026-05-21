import React, { useState, useEffect } from 'react';
import { Star, Building2, Shield } from 'lucide-react';
import { PendingRating } from '../../types';
import { useModalBodyClass } from '../../utils/useModalBodyClass';

interface RatingModalProps {
    pending: PendingRating;
    onSubmit: (
        reservationId: string,
        businessScore: number,
        fairPlayScore: number | null
    ) => Promise<void>;
    onSkip: () => void;
}

function StarRating({ value, onChange, green }: { value: number; onChange: (v: number) => void; green?: boolean }) {
    return (
        <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => onChange(star)}
                    className="transition-transform active:scale-110 touch-manipulation"
                >
                    <Star
                        className={`w-9 h-9 transition-colors ${
                            star <= value
                                ? green ? 'text-green-500 fill-green-500' : 'text-yellow-400 fill-yellow-400'
                                : 'text-slate-600'
                        }`}
                    />
                </button>
            ))}
        </div>
    );
}

const LABELS: Record<number, string> = { 1: 'Berbat', 2: 'Kötü', 3: 'Orta', 4: 'İyi', 5: 'Harika!' };
const FP_LABELS: Record<number, string> = { 1: 'Çok Kötü', 2: 'Kötü', 3: 'Orta', 4: 'İyi', 5: 'Mükemmel!' };

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

    const matchDate = new Date(pending.slotTime).toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'long', weekday: 'long',
    });
    const matchTime = new Date(pending.slotTime).toLocaleTimeString('tr-TR', {
        hour: '2-digit', minute: '2-digit',
    });

    const activeScore = step === 'business' ? businessScore : fairPlayScore;
    const canProceed = activeScore > 0 && !submitting;

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
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-sm bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-turf-700 to-turf-600 px-5 py-4">
                    <p className="text-turf-200 text-xs font-semibold uppercase tracking-widest mb-0.5">
                        Maç Değerlendirmesi
                    </p>
                    <p className="text-white font-bold text-sm">{matchDate} · {matchTime}</p>
                    <p className="text-turf-200 text-xs mt-0.5">{pending.pitchName} — {pending.businessName}</p>
                </div>

                {/* Clickable Tab Indicator (only when both steps needed) */}
                {hasBothSteps && (
                    <div className="flex border-b border-slate-700">
                        <button
                            type="button"
                            onClick={() => setStep('business')}
                            className={`flex-1 py-2.5 text-center text-xs font-bold transition-colors ${
                                step === 'business'
                                    ? 'text-turf-400 border-b-2 border-turf-400'
                                    : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            <Building2 className="w-3.5 h-3.5 inline mr-1 mb-0.5" />
                            İşletme
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
                                    ? 'text-indigo-400 border-b-2 border-indigo-400'
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
                    {step === 'business' ? (
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
                            <StarRating value={businessScore} onChange={setBusinessScore} />
                            <p className="text-center text-slate-400 text-xs mt-2 h-4">
                                {LABELS[businessScore] ?? ''}
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 mb-5">
                                <div className="bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
                                    <Shield className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">{pending.opponentTeamName}</p>
                                    <p className="text-slate-400 text-xs">Rakip takımın fair play'ini değerlendir</p>
                                </div>
                            </div>
                            <StarRating value={fairPlayScore} onChange={setFairPlayScore} green />
                            <p className="text-center text-slate-400 text-xs mt-2 h-4">
                                {FP_LABELS[fairPlayScore] ?? ''}
                            </p>
                        </>
                    )}

                    <button
                        onClick={handlePrimaryAction}
                        disabled={!canProceed}
                        className={`mt-5 w-full py-3 rounded-2xl font-bold text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 ${
                            step === 'fairplay' ? 'bg-indigo-600' : 'bg-turf-600'
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
