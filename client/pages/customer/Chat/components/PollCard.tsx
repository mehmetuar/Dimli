import React from 'react';
import { BarChart3, CheckCircle, Circle, CheckSquare, Square, Lock, Pin } from 'lucide-react';

interface PollVoter {
    id: string;
    name: string | null;
    avatarUrl: string | null;
}

interface PollOptionView {
    id: string;
    text: string;
    sortOrder: number;
    voteCount: number;
    voters: PollVoter[];
}

export interface PollView {
    id: string;
    channelId: string;
    title: string;
    allowMultiple: boolean;
    isClosed: boolean;
    createdById: string | null;
    createdAt: string;
    closedAt: string | null;
    totalVoters: number;
    options: PollOptionView[];
}

interface Props {
    poll: PollView;
    currentUserId?: string;
    // Oy dokunmaları aktif mi (kapalı anket / biten maç → false)
    canVote: boolean;
    // "Anketi Sonlandır" görünür mü (kaptan/yardımcı + açık anket)
    canClose: boolean;
    onVote: (pollId: string, optionIds: string[]) => void;
    onClose: (pollId: string) => void;
    onShowVoters: (pollId: string) => void;
    // Anket duyurusu sabitleme (§97): takımımın sabiti bu anket mi?
    isPinned?: boolean;
    // undefined = sabitleme yetkisi yok → raptiye butonu hiç çizilmez
    onTogglePin?: () => void;
}

// WhatsApp tarzı anket kartı — sistem mesajı akışında ortalanmış tam genişlik
// kart olarak çizilir. Veri PollView'dur (useChat polls haritasından canlı gelir).
export const PollCard: React.FC<Props> = ({
    poll, currentUserId, canVote, canClose, onVote, onClose, onShowVoters,
    isPinned, onTogglePin,
}) => {
    const myOptionIds = poll.options
        .filter(o => o.voters.some(v => v.id === currentUserId))
        .map(o => o.id);

    const handleOptionTap = (optionId: string) => {
        if (!canVote) return;
        const isMine = myOptionIds.includes(optionId);
        if (poll.allowMultiple) {
            // Çoklu: toggle — güncel kümeyi gönder
            const next = isMine
                ? myOptionIds.filter(id => id !== optionId)
                : [...myOptionIds, optionId];
            onVote(poll.id, next);
        } else {
            // Tekli: benimkine dokun = geri çek, başkasına = değiştir
            onVote(poll.id, isMine ? [] : [optionId]);
        }
    };

    return (
        <div className="bg-slate-800/95 border border-slate-700 rounded-xl w-full shadow-lg p-4 text-left">
            {/* Başlık */}
            <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-full bg-turf-600/15 border border-turf-600/30 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-[18px] h-[18px] text-turf-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white leading-snug break-words">{poll.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        {poll.isClosed
                            ? 'Anket sonlandırıldı'
                            : poll.allowMultiple ? 'Birden fazla yanıt seçilebilir' : 'Bir yanıt seçin'}
                    </p>
                </div>
                {poll.isClosed && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5 shrink-0">
                        <Lock className="w-3 h-3" /> Kapalı
                    </span>
                )}
                {onTogglePin && (
                    <button
                        onClick={onTogglePin}
                        aria-label={isPinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'}
                        className={`p-1.5 rounded-full shrink-0 transition-colors ${
                            isPinned
                                ? 'text-turf-400 bg-turf-600/15 border border-turf-500/40'
                                : 'text-slate-500 active:text-slate-300'
                        }`}
                    >
                        <Pin className="w-4 h-4" fill={isPinned ? 'currentColor' : 'none'} />
                    </button>
                )}
            </div>

            {/* Seçenekler */}
            <div className="mt-3 flex flex-col gap-2">
                {poll.options.map(option => {
                    const isMine = myOptionIds.includes(option.id);
                    const pct = Math.round((option.voteCount / Math.max(poll.totalVoters, 1)) * 100);
                    const Glyph = poll.allowMultiple
                        ? (isMine ? CheckSquare : Square)
                        : (isMine ? CheckCircle : Circle);
                    return (
                        <button
                            key={option.id}
                            onClick={() => handleOptionTap(option.id)}
                            disabled={!canVote}
                            className={`w-full text-left rounded-xl px-3 py-2 border transition-colors ${
                                isMine
                                    ? 'bg-turf-600/15 border-turf-500/50'
                                    : 'bg-slate-900/50 border-slate-700'
                            } ${canVote ? 'active:bg-slate-700/60' : ''}`}
                        >
                            <div className="flex items-center gap-2.5">
                                <Glyph className={`w-[18px] h-[18px] shrink-0 ${isMine ? 'text-turf-400' : 'text-slate-500'}`} />
                                <span className="flex-1 text-sm text-slate-200 break-words min-w-0">{option.text}</span>
                                <span className="text-xs font-semibold text-slate-400 shrink-0">{option.voteCount}</span>
                            </div>
                            {/* Yüzde barı */}
                            <div className="mt-1.5 ml-[28px] h-1 rounded-full bg-slate-700/70 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-300 ${isMine ? 'bg-turf-500' : 'bg-slate-500'}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Alt satır */}
            <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                    {poll.totalVoters > 0 ? `${poll.totalVoters} kişi oy verdi` : 'Henüz oy yok'}
                </span>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => onShowVoters(poll.id)}
                        className="text-[11px] font-semibold text-turf-400 active:text-turf-300"
                    >
                        Oyları Görüntüle
                    </button>
                    {canClose && (
                        <button
                            onClick={() => onClose(poll.id)}
                            className="text-[11px] font-semibold text-red-400 active:text-red-300"
                        >
                            Anketi Sonlandır
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
