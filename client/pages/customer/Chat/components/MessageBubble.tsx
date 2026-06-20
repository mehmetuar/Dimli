import React, { useRef, useEffect } from 'react';
import { Swords } from 'lucide-react';
import { SystemMessageRenderer } from '../../../../components/UI/SystemMessageRenderer';
import type { ActionMessage, MenuPosition } from '../hooks/useMessageActions';

interface MsgLike extends ActionMessage {
    timestamp: string;
    isSystem?: boolean;
    isMe?: boolean;
    metadata?: any;
    senderTeamId?: string | null;
}

interface TeamChatColors {
    homeTeamId: string;
    awayTeamId: string;
    homeColor: string;
    awayColor: string;
    homeLogo?: string | null;
    awayLogo?: string | null;
}

interface Props {
    msg: MsgLike;
    prevMsg?: MsgLike | null;
    nextMsg?: MsgLike | null;
    currentUser?: any;
    onLongPress: (msg: MsgLike, position: MenuPosition) => void;
    onAvatarClick: (msg: MsgLike) => void;
    onAcceptProposal: (reservationId: string) => void;
    onAcceptRematch: (matchAnnouncementId: string) => void;
    // Rakipli MATCH_GROUP chatlerinde takım bazlı renklendirme için — diğer kanal
    // tiplerinde (kendi aramızda, DM, TEAM_INTERNAL) null gelir, görünüm değişmez.
    teamColors?: TeamChatColors | null;
}

const LONG_PRESS_MS = 450;
const MOVE_THRESHOLD = 8;

export const MessageBubble: React.FC<Props> = ({
    msg, prevMsg, nextMsg, currentUser,
    onLongPress, onAvatarClick, onAcceptProposal, onAcceptRematch,
    teamColors,
}) => {
    const isPrevSameSender = !!prevMsg && !prevMsg.isSystem && !msg.isSystem && prevMsg.senderId === msg.senderId;
    const isNextSameSender = !!nextMsg && !nextMsg.isSystem && !msg.isSystem && nextMsg.senderId === msg.senderId;
    const isNextSameTime = nextMsg?.timestamp === msg.timestamp;

    // Gönderenin maçtaki iki takımdan hangisine ait olduğuna göre vurgu rengi/logosu —
    // takımsız (joker) ya da maçtaki iki takımdan biri olmayan göndericiler için null
    // (nötr stile düşer). Gönderenin GÜNCEL takımı kullanılır, maç anındaki tarihsel
    // takımı değil — bu kabul edilen bir sınırlamadır.
    const accent = !msg.isMe && teamColors && msg.senderTeamId
        ? msg.senderTeamId === teamColors.homeTeamId
            ? { color: teamColors.homeColor, logo: teamColors.homeLogo }
            : msg.senderTeamId === teamColors.awayTeamId
                ? { color: teamColors.awayColor, logo: teamColors.awayLogo }
                : null
        : null;

    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const startPos = useRef({ x: 0, y: 0 });
    // containerRef: native non-passive touchstart listener için (iOS metin seçimini önler)
    const containerRef = useRef<HTMLDivElement>(null);
    // bubbleWrapperRef: popup pozisyonu için DOMRect alınır
    const bubbleWrapperRef = useRef<HTMLDivElement>(null);
    // Callback ref — stale closure olmadan her zaman güncel değer
    const onLongPressRef = useRef(onLongPress);
    onLongPressRef.current = onLongPress;

    // Native (non-passive) touch listener — React synthetic onTouchStart ile
    // e.preventDefault() iOS WebKit'te çalışmaz (React 17+ passive listener kullanır).
    useEffect(() => {
        const el = containerRef.current;
        if (!el || msg.isMe || msg.isSystem) return;

        const cancel = () => clearTimeout(timerRef.current);

        const onStart = (e: TouchEvent) => {
            // Avatar butonuna dokunuluyorsa long-press'i başlatma ve click'e izin ver
            if ((e.target as HTMLElement).closest('[data-avatar]')) return;
            e.preventDefault(); // iOS metin seçimi + callout menüsünü engeller
            const t = e.touches[0];
            startPos.current = { x: t.clientX, y: t.clientY };
            timerRef.current = setTimeout(() => {
                const rect = bubbleWrapperRef.current?.getBoundingClientRect();
                if (rect) {
                    onLongPressRef.current(msg, {
                        top: rect.top,
                        bottom: rect.bottom,
                        left: rect.left,
                        right: rect.right,
                        width: rect.width,
                    });
                }
            }, LONG_PRESS_MS);
        };

        const onMove = (e: TouchEvent) => {
            const t = e.touches[0];
            if (
                Math.abs(t.clientX - startPos.current.x) > MOVE_THRESHOLD ||
                Math.abs(t.clientY - startPos.current.y) > MOVE_THRESHOLD
            ) cancel();
        };

        el.addEventListener('touchstart', onStart, { passive: false });
        el.addEventListener('touchmove', onMove, { passive: true });
        el.addEventListener('touchend', cancel, { passive: true });
        el.addEventListener('touchcancel', cancel, { passive: true });

        return () => {
            el.removeEventListener('touchstart', onStart);
            el.removeEventListener('touchmove', onMove);
            el.removeEventListener('touchend', cancel);
            el.removeEventListener('touchcancel', cancel);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Keyed component — msg ve isMe değişmez

    // Mouse handlers (desktop / simulator)
    const onMouseDown = () => {
        timerRef.current = setTimeout(() => {
            const rect = bubbleWrapperRef.current?.getBoundingClientRect();
            if (rect) {
                onLongPress(msg, {
                    top: rect.top,
                    bottom: rect.bottom,
                    left: rect.left,
                    right: rect.right,
                    width: rect.width,
                });
            }
        }, LONG_PRESS_MS);
    };
    const onMouseUp    = () => clearTimeout(timerRef.current);
    const onMouseLeave = () => clearTimeout(timerRef.current);

    const noSelect: React.CSSProperties = {
        userSelect: 'none',
        WebkitUserSelect: 'none',
        // @ts-ignore — valid CSS on iOS WebView
        WebkitTouchCallout: 'none',
        touchAction: 'manipulation',
    };

    if (msg.isSystem) {
        return (
            <div className="flex justify-center my-4 animate-fade-in px-4 w-full">
                <div className="bg-slate-800/95 border border-slate-700 text-slate-200 text-sm font-medium px-6 py-4 rounded-xl text-center w-full shadow-lg whitespace-pre-wrap">
                    <SystemMessageRenderer text={msg.text} />

                    {msg.metadata?.type === 'PROPOSAL_ACTION' && (
                        <button
                            onClick={() => onAcceptProposal(msg.metadata.reservationId)}
                            className="mt-3 bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-4 rounded-full text-xs transition-colors flex items-center gap-1 mx-auto"
                        >
                            <span>✅</span>
                            <span>Teklifi Kabul Et</span>
                        </button>
                    )}

                    {msg.metadata?.type === 'REMATCH_PROPOSAL' && msg.metadata?.matchAnnouncementId && (() => {
                        const isCaptain    = currentUser?.team?.captainId === currentUser?.id;
                        const isViceCaptain = currentUser?.team?.viceCaptainIds?.includes(currentUser?.id);
                        const isProposerTeam = msg.senderId === currentUser?.id;
                        if ((isCaptain || isViceCaptain) && !isProposerTeam) {
                            return (
                                <button
                                    onClick={() => onAcceptRematch(msg.metadata.matchAnnouncementId)}
                                    className="mt-3 bg-turf-600 hover:bg-turf-700 text-white font-bold py-2 px-5 rounded-full text-xs transition-colors flex items-center gap-2 mx-auto"
                                >
                                    <Swords className="w-4 h-4" />
                                    <span>Teklifi Onayla</span>
                                </button>
                            );
                        }
                        return null;
                    })()}
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`flex items-end gap-2 ${msg.isMe ? 'justify-end' : 'justify-start'} ${isPrevSameSender ? '!mt-0.5' : ''}`}
            onMouseDown={msg.isMe || msg.isSystem ? undefined : onMouseDown}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            style={noSelect}
        >
            {/* Avatar — tıklanabilir */}
            {!msg.isMe && (
                <div style={{ width: 28, flexShrink: 0 }}>
                    {!isNextSameSender ? (
                        <button
                            data-avatar="true"
                            className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden active:opacity-70 transition-opacity"
                            style={accent ? { backgroundColor: accent.color } : undefined}
                            onClick={() => onAvatarClick(msg)}
                            onMouseDown={e => e.stopPropagation()}
                        >
                            {accent?.logo ? (
                                <img src={accent.logo} className="w-full h-full object-cover" />
                            ) : (
                                msg.senderName.charAt(0).toUpperCase()
                            )}
                        </button>
                    ) : (
                        <div style={{ width: 28 }} />
                    )}
                </div>
            )}

            {/* Bubble */}
            <div ref={bubbleWrapperRef} className="max-w-[75%]">
                <div
                    className={`px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.isMe
                            ? `bg-turf-600 text-white ${!isNextSameSender ? 'rounded-br-sm' : ''}`
                            : `bg-slate-800 text-slate-200 border border-slate-700 ${!isNextSameSender ? 'rounded-bl-sm' : ''}`
                    }`}
                    style={accent ? { borderLeftWidth: 3, borderLeftColor: accent.color } : undefined}
                >
                    {!msg.isMe && !isPrevSameSender && (
                        <span
                            className="text-[11px] font-semibold text-turf-400 block mb-0.5 whitespace-nowrap"
                            style={accent ? { color: accent.color } : undefined}
                        >
                            {msg.senderName}
                        </span>
                    )}
                    {msg.text}
                </div>
                {!isNextSameTime && !isNextSameSender && (
                    <span className={`text-[10px] block mt-1 ${msg.isMe ? 'text-right text-slate-500' : 'text-left text-slate-500'}`}>
                        {msg.timestamp}
                    </span>
                )}
            </div>
        </div>
    );
};
