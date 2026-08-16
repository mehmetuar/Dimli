import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCheck } from 'lucide-react';
import { useModalBodyClass } from '../../../../utils/useModalBodyClass';
import { formatMessageDate } from '../utils/chatUtils';
import { UserAvatar } from './UserAvatar';
import { JokerBadge } from './JokerBadge';
import type { TeamAccent } from '../../../../utils/colorUtils';

// Okundu bilgisi modalı — watermark modeliyle çalışır:
// "P okudu ⇔ P.lastReadAt ≥ mesajın createdAt'ı". Watermark mesaj-başına okuma
// SAATİ veremez; DM'de karşı tarafın lastReadAt'ı yaklaşık saat olarak gösterilir,
// gruplarda saat gösterilmez (dürüst UI).

interface ReadStateEntry {
    userId: string;
    name?: string;
    avatarUrl?: string | null;
    teamId?: string | null;
    // Joker: maç için katıldığı takım (JOKER_JOINED metadata'sı) — gruplama + J rozeti
    jokerTeamId?: string | null;
    lastReadAt?: string | null;
}

interface TeamColorsLike {
    homeTeamId: string;
    awayTeamId: string;
    homeAccent: TeamAccent;
    awayAccent: TeamAccent;
    homeName?: string | null;
    awayName?: string | null;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    message: { id: string; text: string; timestamp: string; rawCreatedAt?: string } | null;
    channelType?: string;
    channelId: string | null;
    currentUserId?: string;
    readStates: Record<string, ReadStateEntry> | null;
    refreshReadStates: (channelId: string) => Promise<void>;
    teamColors?: TeamColorsLike | null;
}

// Jokerin efektif takımı: kendi takımı maçtaki iki takımdan biri değilse (veya
// takımsızsa) JOKER_JOINED'dan gelen katıldığı takım kullanılır.
const effectiveTeamId = (p: ReadStateEntry, teamColors: TeamColorsLike): string | null => {
    if (p.teamId === teamColors.homeTeamId || p.teamId === teamColors.awayTeamId) return p.teamId!;
    return p.jokerTeamId ?? null;
};

const isJokerEntry = (p: ReadStateEntry, teamColors?: TeamColorsLike | null): boolean =>
    !!p.jokerTeamId && (!teamColors || (p.teamId !== teamColors.homeTeamId && p.teamId !== teamColors.awayTeamId));

// accentHex: satırın efektif takımının rengi — balondaki avatarla BİREBİR aynı
// görünüm (tek kaynak: UserAvatar).
const ReaderRow: React.FC<{ p: ReadStateEntry; showJokerBadge?: boolean; accentHex?: string | null }> = ({ p, showJokerBadge, accentHex }) => (
    <div className="flex items-center gap-2.5 py-1.5">
        <UserAvatar url={p.avatarUrl} name={p.name || '?'} size={32} accentHex={accentHex ?? null} />
        <span className="text-sm text-slate-200 truncate">{p.name || 'Kullanıcı'}</span>
        {showJokerBadge && <JokerBadge size={16} />}
    </div>
);

// Rakipli sohbetlerde bölüm içi takım alt-başlıkları (renk noktalı lejant deseni).
// Jokerler katıldıkları takımın altında J rozetiyle; takımı bilinmeyenler (eski
// veri) "Jokerler" bölümünde kalır.
const TeamGroupedList: React.FC<{ people: ReadStateEntry[]; teamColors: TeamColorsLike }> = ({ people, teamColors }) => {
    const groups: { key: string; title: string; dot?: TeamAccent; members: ReadStateEntry[] }[] = [
        { key: 'home', title: teamColors.homeName || 'Ev Sahibi', dot: teamColors.homeAccent, members: people.filter(p => effectiveTeamId(p, teamColors) === teamColors.homeTeamId) },
        { key: 'away', title: teamColors.awayName || 'Deplasman', dot: teamColors.awayAccent, members: people.filter(p => effectiveTeamId(p, teamColors) === teamColors.awayTeamId) },
        { key: 'joker', title: 'Jokerler', members: people.filter(p => effectiveTeamId(p, teamColors) === null) },
    ];
    return (
        <>
            {groups.filter(g => g.members.length > 0).map(g => (
                <div key={g.key} className="mb-2">
                    <div className="flex items-center gap-1.5 mb-1">
                        {g.dot && (
                            <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundImage: `linear-gradient(135deg, ${g.dot.base} 50%, ${g.dot.secondaryBase} 50%)` }}
                            />
                        )}
                        <span className="text-[11px] text-slate-400 font-semibold truncate">{g.title}</span>
                    </div>
                    {g.members.map(p => (
                        <ReaderRow
                            key={p.userId}
                            p={p}
                            showJokerBadge={isJokerEntry(p, teamColors)}
                            accentHex={g.dot?.base ?? null}
                        />
                    ))}
                </div>
            ))}
        </>
    );
};

export const ReadInfoModal: React.FC<Props> = ({
    isOpen, onClose, message, channelType, channelId, currentUserId, readStates, refreshReadStates, teamColors,
}) => {
    useModalBodyClass(isOpen);

    // Açılışta tazele: isim/avatar güncellenir + sonradan katılanlar gelir
    // (messagesRead yalnız watermark taşır, kimlik bilgisi taşımaz).
    useEffect(() => {
        if (isOpen && channelId) refreshReadStates(channelId);
    }, [isOpen, channelId, refreshReadStates]);

    if (!isOpen || !message) return null;

    const msgTime = message.rawCreatedAt ? new Date(message.rawCreatedAt).getTime() : 0;
    const others = Object.values(readStates ?? {}).filter(p => p.userId !== currentUserId);
    const readers = others.filter(p => p.lastReadAt && new Date(p.lastReadAt).getTime() >= msgTime);
    const unreaders = others.filter(p => !readers.includes(p));
    const isDm = channelType === 'DM' || channelType === 'JOKER_NEGOTIATION';

    return createPortal(
        <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-gradient-to-b from-slate-800 to-slate-900 w-full max-w-lg rounded-t-3xl border-t border-slate-700 relative overflow-x-hidden animate-slide-up max-h-[85vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
                style={{ paddingBottom: 'max(16px, var(--safe-bottom))' }}
            >
                {/* Grab handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-slate-600" />
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="px-5 pb-4">
                    <h3 className="text-sm font-black text-white mb-3">Mesaj Bilgisi</h3>

                    {/* Kendi balon stilinde mesaj önizleme */}
                    <div className="flex justify-end mb-4">
                        <div className="max-w-[85%]">
                            <div className="bg-turf-600 text-white px-3 py-2 rounded-2xl rounded-br-sm text-sm leading-relaxed whitespace-pre-wrap break-words line-clamp-3">
                                {message.text}
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-1 text-right">{message.timestamp}</span>
                        </div>
                    </div>

                    {others.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-4">Sohbette başka aktif katılımcı yok.</p>
                    ) : isDm ? (
                        /* DM / Joker müzakeresi: tek karşı taraf — Okundu (yaklaşık saat) / İletildi */
                        <div className="space-y-3">
                            {readers.length > 0 ? (
                                <div className="flex items-center gap-2.5">
                                    <CheckCheck className="w-5 h-5 text-blue-400 shrink-0" />
                                    <div>
                                        <div className="text-sm font-semibold text-white">Okundu</div>
                                        {readers[0]?.lastReadAt && (
                                            <div className="text-[11px] text-slate-400">{formatMessageDate(readers[0].lastReadAt)}</div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2.5">
                                    <CheckCheck className="w-5 h-5 text-slate-500 shrink-0" />
                                    <div className="text-sm font-semibold text-slate-300">İletildi</div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Grup sohbetleri: Okuyanlar / Henüz okumayanlar (kişi-başına saat yok) */
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCheck className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Okuyanlar ({readers.length})</span>
                                </div>
                                {readers.length === 0 ? (
                                    <p className="text-xs text-slate-500">Henüz okuyan yok.</p>
                                ) : teamColors ? (
                                    <TeamGroupedList people={readers} teamColors={teamColors} />
                                ) : (
                                    readers.map(p => <ReaderRow key={p.userId} p={p} showJokerBadge={isJokerEntry(p)} />)
                                )}
                            </div>
                            <div className="h-px bg-slate-700/50" />
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCheck className="w-4 h-4 text-slate-500" />
                                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Henüz okumayanlar ({unreaders.length})</span>
                                </div>
                                {unreaders.length === 0 ? (
                                    <p className="text-xs text-slate-500">Herkes okudu.</p>
                                ) : teamColors ? (
                                    <TeamGroupedList people={unreaders} teamColors={teamColors} />
                                ) : (
                                    unreaders.map(p => <ReaderRow key={p.userId} p={p} showJokerBadge={isJokerEntry(p)} />)
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
};
