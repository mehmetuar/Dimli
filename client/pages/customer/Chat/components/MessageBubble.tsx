import React, { useRef } from 'react';
import { Swords } from 'lucide-react';
import { SystemMessageRenderer } from '../../../../components/UI/SystemMessageRenderer';
import type { ActionMessage, MenuPosition } from '../hooks/useMessageActions';

interface MsgLike extends ActionMessage {
    timestamp: string;
    isSystem?: boolean;
    isMe?: boolean;
    metadata?: any;
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
}

const LONG_PRESS_MS = 450;
const MOVE_THRESHOLD = 8;

export const MessageBubble: React.FC<Props> = ({
    msg, prevMsg, nextMsg, currentUser,
    onLongPress, onAvatarClick, onAcceptProposal, onAcceptRematch,
}) => {
    const isPrevSameSender = !!prevMsg && !prevMsg.isSystem && !msg.isSystem && prevMsg.senderId === msg.senderId;
    const isNextSameSender = !!nextMsg && !nextMsg.isSystem && !msg.isSystem && nextMsg.senderId === msg.senderId;
    const isNextSameTime = nextMsg?.timestamp === msg.timestamp;

    const timerRef = useRef<ReturnType<typeof setTimeout>>();
    const startPos = useRef({ x: 0, y: 0 });

    const startPress = (x: number, y: number) => {
        if (msg.isMe || msg.isSystem) return;
        startPos.current = { x, y };
        timerRef.current = setTimeout(() => {
            onLongPress(msg, { x, y });
        }, LONG_PRESS_MS);
    };

    const cancelPress = () => clearTimeout(timerRef.current);

    const checkMove = (x: number, y: number) => {
        if (
            Math.abs(x - startPos.current.x) > MOVE_THRESHOLD ||
            Math.abs(y - startPos.current.y) > MOVE_THRESHOLD
        ) {
            cancelPress();
        }
    };

    // ── Touch handlers (mobile primary) ──────────────────────────────────────
    const onTouchStart = (e: React.TouchEvent) => startPress(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchMove  = (e: React.TouchEvent) => checkMove(e.touches[0].clientX, e.touches[0].clientY);
    const onTouchEnd   = cancelPress;

    // ── Mouse handlers (desktop / simulator) ─────────────────────────────────
    const onMouseDown  = (e: React.MouseEvent) => startPress(e.clientX, e.clientY);
    const onMouseUp    = cancelPress;
    const onMouseLeave = cancelPress;

    // ── Shared prevent-select style ───────────────────────────────────────────
    const noSelect: React.CSSProperties = {
        userSelect: 'none',
        WebkitUserSelect: 'none',
        // @ts-ignore — valid CSS on iOS WebView
        WebkitTouchCallout: 'none',
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
            className={`flex items-end gap-2 ${msg.isMe ? 'justify-end' : 'justify-start'} ${isPrevSameSender ? '!mt-0.5' : ''}`}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
            style={noSelect}
        >
            {/* Avatar — tıklanabilir */}
            {!msg.isMe && (
                <div style={{ width: 28, flexShrink: 0 }}>
                    {!isNextSameSender ? (
                        <button
                            className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden active:opacity-70 transition-opacity"
                            onClick={() => onAvatarClick(msg)}
                            onMouseDown={e => e.stopPropagation()}
                        >
                            {msg.senderName.charAt(0).toUpperCase()}
                        </button>
                    ) : (
                        <div style={{ width: 28 }} />
                    )}
                </div>
            )}

            {/* Bubble */}
            <div className="max-w-[75%]">
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.isMe
                        ? `bg-turf-600 text-white ${!isNextSameSender ? 'rounded-br-sm' : ''}`
                        : `bg-slate-800 text-slate-200 border border-slate-700 ${!isNextSameSender ? 'rounded-bl-sm' : ''}`
                }`}>
                    {!msg.isMe && !isPrevSameSender && (
                        <span className="text-[11px] font-semibold text-turf-400 block mb-0.5">{msg.senderName}</span>
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
