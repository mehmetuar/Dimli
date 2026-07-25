import React, { useRef, useEffect } from 'react';
import { Swords, Check, CheckCheck } from 'lucide-react';
import { SystemMessageRenderer } from '../../../../components/UI/SystemMessageRenderer';
import { UserAvatar } from './UserAvatar';
import { JokerBadge } from './JokerBadge';
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
    // Joker gönderen: maç için katıldığı takımın id'si (JOKER_JOINED metadata'sından,
    // read-states üzerinden gelir). Doluysa balon o takımın rengini alır + J rozeti.
    jokerTeamId?: string | null;
}

const LONG_PRESS_MS = 450;
const MOVE_THRESHOLD = 8;

export const MessageBubble: React.FC<Props> = ({
    msg, prevMsg, nextMsg, currentUser,
    onLongPress, onAvatarClick, onAcceptProposal, onAcceptRematch,
    teamColors, tickState, onInfo, jokerTeamId,
}) => {
    const isPrevSameSender = !!prevMsg && !prevMsg.isSystem && !msg.isSystem && prevMsg.senderId === msg.senderId;
    const isNextSameSender = !!nextMsg && !nextMsg.isSystem && !msg.isSystem && nextMsg.senderId === msg.senderId;
    const isNextSameTime = nextMsg?.timestamp === msg.timestamp;

    // Gönderenin maçtaki iki takımdan hangisine ait olduğuna göre vurgu rengi/logosu.
    // Joker: kendi teamId'si iki takımdan biri değildir (veya yok) — bu durumda
    // JOKER_JOINED metadata'sından gelen jokerTeamId ile katıldığı takımın rengini
    // alır. Gönderenin GÜNCEL takımı kullanılır, maç anındaki tarihsel takımı değil —
    // bu kabul edilen bir sınırlamadır.
    const effectiveTeamId = teamColors
        ? (msg.senderTeamId === teamColors.homeTeamId || msg.senderTeamId === teamColors.awayTeamId)
            ? msg.senderTeamId
            : jokerTeamId ?? null
        : null;
    const accent = !msg.isMe && teamColors && effectiveTeamId
        ? effectiveTeamId === teamColors.homeTeamId
            ? { colors: teamColors.homeAccent, logo: teamColors.homeLogo }
            : effectiveTeamId === teamColors.awayTeamId
                ? { colors: teamColors.awayAccent, logo: teamColors.awayLogo }
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

        // Dokunuş başına TEK SEFERLİK eksen kararı: ilk eşik aşımında hangi eksen
        // baskınsa o kazanır. Dikey karar → bu dokunuşta sola-kaydırma ASLA devreye
        // girmez, scroll hiçbir koşulda engellenmez. (Eski davranışta hafif çapraz
        // yukarı kaydırma yatay sanılıp scroll'u çalıyordu.)
        let decidedAxis: 'h' | 'v' | null = null;
        let swiping = false;
        const SWIPE_LOCK = 12;    // yatay kilit eşiği (px)
        const SWIPE_TRIGGER = 40; // modal tetikleme eşiği (px)
        const SWIPE_MAX = 64;     // maksimum görsel kaydırma (px)

        const onStart = (e: TouchEvent) => {
            // Avatar butonuna dokunuluyorsa long-press'i başlatma ve click'e izin ver
            if (!isMine && (e.target as HTMLElement).closest('[data-avatar]')) return;
            // preventDefault YOK (eskiden başkasının balonunda vardı): touchstart
            // iptali iOS'ta o dokunuştan scroll başlamasını da engelliyordu →
            // "ekranın bazı kısımları kaymıyor" hatasının kökü. Metin seçimi/callout
            // görevi noSelect CSS'inde (userSelect/touchCallout none).
            const t = e.touches[0];
            startPos.current = { x: t.clientX, y: t.clientY };
            decidedAxis = null;
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
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
            if (absDx > MOVE_THRESHOLD || absDy > MOVE_THRESHOLD) cancel();
            // Eksen kararı bir kez verilir: dikey/kararsız baskınlık → 'v' (scroll),
            // belirgin yatay-sol (1.5× baskın) → 'h' (yalnız kendi balonunda swipe).
            if (decidedAxis === null && (absDx > MOVE_THRESHOLD || absDy > MOVE_THRESHOLD)) {
                decidedAxis = isMine && dx < -SWIPE_LOCK && absDx > absDy * 1.5 ? 'h' : 'v';
            }
            if (decidedAxis !== 'h' || !isMine) return;
            swiping = true;
            e.preventDefault(); // yatay kilit sonrası dikey scroll bastırılır (passive:false gerekli)
            const x = Math.max(Math.min(dx, 0), -SWIPE_MAX);
            const w = bubbleWrapperRef.current;
            if (w) {
                w.style.transition = 'none';
                w.style.transform = `translateX(${x}px)`;
            }
        };

        const onEnd = (e: TouchEvent) => {
            cancel();
            decidedAxis = null;
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

        // touchstart passive — artık preventDefault çağrılmıyor, scroll serbest.
        el.addEventListener('touchstart', onStart, { passive: true });
        // touchmove passive:false — yalnız yatay eksen kararı + kendi balonunda
        // preventDefault çağrılır, dikey scroll hiçbir koşulda etkilenmez.
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
                            className="w-7 h-7 rounded-full overflow-hidden active:opacity-70 transition-opacity"
                            // Forma halkası: koyu ince boşluk + takım renginde dış halka.
                            // Avatar içeriği (fotoğraf/baş harf) tek kaynaklı UserAvatar'dan —
                            // Mesaj Bilgisi modalıyla birebir aynı görünüm.
                            style={accent ? {
                                boxShadow: `0 0 0 1.5px #0f172a, 0 0 0 3px ${accent.colors.base}`,
                            } : undefined}
                            onClick={() => onAvatarClick(msg)}
                            onMouseDown={e => e.stopPropagation()}
                        >
                            <UserAvatar
                                url={msg.senderAvatarUrl}
                                name={msg.senderName}
                                size={28}
                                accentHex={accent?.colors.base ?? null}
                                className="w-full h-full"
                            />
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
                    // Takım çizgisi: zemin standart lacivert (bg-slate-800) kalır, takım
                    // kimliği yalnız dış çizgi + isim rengiyle verilir (dolgu degradesi
                    // premium durmuyordu — kaldırıldı).
                    style={accent ? { borderColor: accent.colors.base } : undefined}
                >
                    {!msg.isMe && !isPrevSameSender && (
                        <span
                            className="text-[11px] font-semibold text-turf-400 mb-0.5 whitespace-nowrap flex items-center gap-1"
                            style={accent ? { color: accent.colors.base } : undefined}
                        >
                            {msg.senderName}
                            {jokerTeamId && <JokerBadge size={14} />}
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
