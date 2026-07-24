import React, { useRef, useEffect } from 'react';
import { Swords, Check, CheckCheck } from 'lucide-react';
import { SystemMessageRenderer } from '../../../../components/UI/SystemMessageRenderer';
import { teamInitialsAvatar } from '../../../../utils/teamColors';
import type { TeamAccent } from '../../../../utils/colorUtils';
import type { ActionMessage, MenuPosition } from '../hooks/useMessageActions';

interface MsgLike extends ActionMessage {
    timestamp: string;
    isSystem?: boolean;
    isMe?: boolean;
    metadata?: any;
    senderTeamId?: string | null;
    senderAvatarUrl?: string | null;
    pending?: boolean;
    rawCreatedAt?: string;
}

// Renk alanları colorUtils'teki TeamAccent'ten gelir — palet mantığı tek kaynakta kalır.
interface TeamChatColors {
    homeTeamId: string;
    awayTeamId: string;
    homeAccent: TeamAccent;
    awayAccent: TeamAccent;
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
    // Okundu bilgisi (yalnız kendi mesajlarında): 'sending' tek gri, 'delivered'
    // çift gri, 'read' çift mavi; null/undefined = tik çizilmez (eski sunucu).
    tickState?: 'sending' | 'delivered' | 'read' | null;
    // Kendi mesajını sola kaydırma → okundu bilgisi modalı
    onInfo?: (msg: MsgLike) => void;
}

const LONG_PRESS_MS = 450;
const MOVE_THRESHOLD = 8;

export const MessageBubble: React.FC<Props> = ({
    msg, prevMsg, nextMsg, currentUser,
    onLongPress, onAvatarClick, onAcceptProposal, onAcceptRematch,
    teamColors, tickState, onInfo,
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
            ? { colors: teamColors.homeAccent, logo: teamColors.homeLogo }
            : msg.senderTeamId === teamColors.awayTeamId
                ? { colors: teamColors.awayAccent, logo: teamColors.awayLogo }
                : null
        : null;

    // Avatar içeriği önceliği: gönderenin profil fotoğrafı → takım logosu → baş harf.
    // Takım kimliği fotoğraf gösterilirken de forma halkası + isim rengiyle korunur.
    const avatarSrc = msg.senderAvatarUrl || accent?.logo || null;

    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const startPos = useRef({ x: 0, y: 0 });
    // containerRef: native non-passive touchstart listener için (iOS metin seçimini önler)
    const containerRef = useRef<HTMLDivElement>(null);
    // bubbleWrapperRef: popup pozisyonu için DOMRect alınır
    const bubbleWrapperRef = useRef<HTMLDivElement>(null);
    // Callback ref — stale closure olmadan her zaman güncel değer
    const onLongPressRef = useRef(onLongPress);
    onLongPressRef.current = onLongPress;
    const onInfoRef = useRef(onInfo);
    onInfoRef.current = onInfo;

    // Native (non-passive) touch listener — React synthetic onTouchStart ile
    // e.preventDefault() iOS WebKit'te çalışmaz (React 17+ passive listener kullanır).
    // Kendi mesajında: long-press (Bilgi menüsü) + sola kaydırma (okundu modalı).
    useEffect(() => {
        const el = containerRef.current;
        if (!el || msg.isSystem) return;

        const isMine = !!msg.isMe;
        const cancel = () => clearTimeout(timerRef.current);

        // Sola kaydırma durumu (yalnız kendi balonunda)
        let swiping = false;
        const SWIPE_LOCK = 12;    // yatay kilit eşiği (px)
        const SWIPE_TRIGGER = 40; // modal tetikleme eşiği (px)
        const SWIPE_MAX = 64;     // maksimum görsel kaydırma (px)

        const onStart = (e: TouchEvent) => {
            if (!isMine) {
                // Avatar butonuna dokunuluyorsa long-press'i başlatma ve click'e izin ver
                if ((e.target as HTMLElement).closest('[data-avatar]')) return;
                e.preventDefault(); // iOS metin seçimi + callout menüsünü engeller
            }
            // KENDİ balonunda preventDefault YOK — touchstart iptali iOS'ta scroll'u
            // da öldürür; seçim/callout zaten noSelect CSS'iyle bastırılıyor.
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
            const dx = t.clientX - startPos.current.x;
            const dy = t.clientY - startPos.current.y;
            if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) cancel();
            if (!isMine) return;
            // Yatay-baskın sola hareket → kaydırma kilidi; dikey hareket kilidi
            // hiç açmaz, scroll normal akar.
            if (!swiping && dx < -SWIPE_LOCK && Math.abs(dx) > Math.abs(dy)) swiping = true;
            if (swiping) {
                e.preventDefault(); // kilit sonrası dikey scroll bastırılır (passive:false gerekli)
                const x = Math.max(Math.min(dx, 0), -SWIPE_MAX);
                const w = bubbleWrapperRef.current;
                if (w) {
                    w.style.transition = 'none';
                    w.style.transform = `translateX(${x}px)`;
                }
            }
        };

        const onEnd = (e: TouchEvent) => {
            cancel();
            if (!swiping) return;
            swiping = false;
            const dx = (e.changedTouches[0]?.clientX ?? startPos.current.x) - startPos.current.x;
            const w = bubbleWrapperRef.current;
            if (w) {
                w.style.transition = 'transform 180ms ease-out';
                w.style.transform = 'translateX(0)';
            }
            // Pending (henüz gönderilmemiş) balonda modal açılmaz
            if (dx <= -SWIPE_TRIGGER && !msg.pending) onInfoRef.current?.(msg);
        };

        el.addEventListener('touchstart', onStart, { passive: false });
        // passive:false — yalnız yatay kilit aktifken preventDefault çağrılır,
        // dikey scroll etkilenmez.
        el.addEventListener('touchmove', onMove, { passive: false });
        el.addEventListener('touchend', onEnd, { passive: true });
        el.addEventListener('touchcancel', onEnd, { passive: true });

        return () => {
            el.removeEventListener('touchstart', onStart);
            el.removeEventListener('touchmove', onMove);
            el.removeEventListener('touchend', onEnd);
            el.removeEventListener('touchcancel', onEnd);
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
            onMouseDown={msg.isSystem ? undefined : onMouseDown}
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
                            // Forma halkası: koyu ince boşluk + takım renginde dış halka.
                            // Logosuz fallback'te zemin okunur (açık) takım rengi olduğundan baş harf koyu yazılır.
                            style={accent ? {
                                boxShadow: `0 0 0 1.5px #0f172a, 0 0 0 3px ${accent.colors.base}`,
                                ...(avatarSrc ? {} : { backgroundColor: accent.colors.base, color: '#0f172a' }),
                            } : undefined}
                            onClick={() => onAvatarClick(msg)}
                            onMouseDown={e => e.stopPropagation()}
                        >
                            {avatarSrc ? (
                                <img
                                    src={avatarSrc}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        const el = e.currentTarget;
                                        // Kırık profil fotoğrafı → takım logosu → baş harf görseli
                                        if (msg.senderAvatarUrl && el.src === msg.senderAvatarUrl && accent?.logo) {
                                            el.src = accent.logo;
                                            return;
                                        }
                                        el.onerror = null;
                                        el.src = teamInitialsAvatar(msg.senderName);
                                    }}
                                />
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
                    // Forma degradesi: birincil→ikincil takım renginden düşük alfa çapraz degrade,
                    // bg-slate-800 zeminin üzerine biner; kenarlık rengi de takım renginin yumuşak tonu.
                    style={accent ? {
                        backgroundImage: `linear-gradient(135deg, ${accent.colors.soft}, ${accent.colors.secondarySoft})`,
                        borderColor: accent.colors.border,
                    } : undefined}
                >
                    {!msg.isMe && !isPrevSameSender && (
                        <span
                            className="text-[11px] font-semibold text-turf-400 block mb-0.5 whitespace-nowrap"
                            style={accent ? { color: accent.colors.base } : undefined}
                        >
                            {msg.senderName}
                        </span>
                    )}
                    {msg.text}
                </div>
                {!isNextSameTime && !isNextSameSender && (
                    <span className={`text-[10px] mt-1 flex items-center gap-1 text-slate-500 ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                        {msg.timestamp}
                        {msg.isMe && tickState && (
                            tickState === 'sending'
                                ? <Check className="w-3.5 h-3.5 text-slate-500" />
                                : <CheckCheck className={`w-3.5 h-3.5 ${tickState === 'read' ? 'text-blue-400' : 'text-slate-500'}`} />
                        )}
                    </span>
                )}
            </div>
        </div>
    );
};
