import React from 'react';
import { createPortal } from 'react-dom';
import { X, BarChart3 } from 'lucide-react';
import { useModalBodyClass } from '../../../../utils/useModalBodyClass';
import { UserAvatar } from './UserAvatar';
import type { PollView } from './PollCard';

interface PollVotersModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Canlı PollView (useChat polls haritasından) — modal açıkken oy gelirse de güncellenir
    poll: PollView | null;
}

// "Oyları Görüntüle" bottom-sheet'i: seçenek bazında kimin oy verdiği
// (WhatsApp anket detayı). Kabuk: KendiAramizdaMatchModal (createPortal, z-[80]).
export const PollVotersModal: React.FC<PollVotersModalProps> = ({ isOpen, onClose, poll }) => {
    useModalBodyClass(isOpen && !!poll);
    if (!isOpen || !poll) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-gradient-to-b from-slate-800 to-slate-900 w-full max-w-lg rounded-t-3xl border-t border-slate-700 relative overflow-x-hidden animate-slide-up max-h-[90vh] overflow-y-auto"
                style={{ paddingBottom: 'max(16px, var(--safe-bottom))' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-5 py-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <BarChart3 className="w-5 h-5 text-turf-400 shrink-0" />
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-white truncate">{poll.title}</h3>
                            <p className="text-[11px] text-slate-400">
                                {poll.totalVoters > 0 ? `${poll.totalVoters} kişi oy verdi` : 'Henüz oy yok'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-700/60 rounded-full text-slate-400 hover:text-white transition-colors shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Seçenek bazında oy verenler */}
                <div className="p-5 flex flex-col gap-5">
                    {poll.options.map(option => (
                        <div key={option.id}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-slate-200 break-words min-w-0">{option.text}</span>
                                <span className="text-xs font-bold text-turf-400 shrink-0 ml-2">{option.voteCount} oy</span>
                            </div>
                            {option.voters.length === 0 ? (
                                <p className="text-xs text-slate-500">Henüz oy yok</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {option.voters.map(voter => (
                                        <div key={voter.id} className="flex items-center gap-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2">
                                            <UserAvatar
                                                url={voter.avatarUrl}
                                                name={voter.name ?? '?'}
                                                size={32}
                                                className="w-8 h-8 rounded-full overflow-hidden shrink-0"
                                            />
                                            <span className="text-sm text-slate-200 truncate">{voter.name ?? 'Bilinmeyen'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body,
    );
};
