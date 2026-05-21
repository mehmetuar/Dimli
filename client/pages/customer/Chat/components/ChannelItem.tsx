import React, { useState, useEffect, useRef } from 'react';
import { Users, Star } from 'lucide-react';
import { getMatchStatusInfo, formatMessageDate, teamAvatarFallback, userAvatarFallback } from '../utils/chatUtils';
import { MatchStatusBadge } from './MatchStatusBadge';
import { stripSystemMessageMarkers } from '../../../../components/UI/SystemMessageRenderer';

interface ChannelItemProps {
    channel: any;
    onClick: () => void;
    onLongPress: () => void;
    currentUserId?: string;
    blockedUserIds?: string[];
}

// iOS native image context menu'yü engeller
const noCalloutStyle: React.CSSProperties = {
    WebkitTouchCallout: 'none' as any,
    userSelect: 'none',
    pointerEvents: 'none',
};

export const ChannelItem: React.FC<ChannelItemProps> = ({
    channel, onClick, onLongPress, currentUserId, blockedUserIds,
}) => {
    const [startLongPress, setStartLongPress] = useState(false);
    const [isLongPressTriggered, setIsLongPressTriggered] = useState(false);
    const timerRef = useRef<any>();

    useEffect(() => {
        if (startLongPress) {
            timerRef.current = setTimeout(() => {
                onLongPress();
                setIsLongPressTriggered(true);
            }, 500);
        } else {
            clearTimeout(timerRef.current);
        }
        return () => clearTimeout(timerRef.current);
    }, [startLongPress, onLongPress]);

    const handleMouseDown = () => { setStartLongPress(true); setIsLongPressTriggered(false); };
    const handleMouseUp = () => { setStartLongPress(false); };
    const handleMouseLeave = () => { setStartLongPress(false); };
    const handleClick = (e: React.MouseEvent) => {
        if (isLongPressTriggered) { e.stopPropagation(); return; }
        onClick();
    };

    const statusInfo = getMatchStatusInfo(channel.reservation);
    const isJoker = channel.type === 'JOKER_NEGOTIATION';
    const isGroup = channel.type === 'MATCH_GROUP';
    const bgClass = isJoker ? 'bg-yellow-500/5' : (statusInfo?.bgTint ?? '');

    // Son mesaj satırı: gönderen + içerik
    const renderLastMessage = () => {
        if (startLongPress) return <span className="text-slate-500 italic">Seçenekler...</span>;

        const lm = channel.lastMessage;
        if (!lm) return <span className="text-slate-600">Sohbete girmek için tıkla</span>;

        const senderBlocked = !lm.isSystemMessage && lm.senderId && blockedUserIds?.includes(lm.senderId);
        if (senderBlocked) return <span className="italic text-slate-500">Mesaj gizlendi</span>;

        const content = lm.content ? stripSystemMessageMarkers(lm.content) : '';

        // Sistem mesajı
        if (lm.isSystemMessage || !lm.senderId) {
            return <span className="text-slate-500">{content}</span>;
        }

        // Gönderen adı
        let senderLabel: string;
        if (lm.senderId === currentUserId) {
            senderLabel = 'Sen';
        } else {
            senderLabel = lm.sender?.full_name || lm.sender?.username || '';
        }

        return (
            <>
                {senderLabel && (
                    <span className="text-slate-300 font-medium">{senderLabel}: </span>
                )}
                <span>{content}</span>
            </>
        );
    };

    const renderAvatar = () => {
        const ad = channel.avatarData;

        // VS maçı: iki takım logosu
        if (
            isGroup &&
            ad?.matchType !== 'kendi_aramizda' &&
            ad?.awayTeamLogo != null
        ) {
            return (
                <div className="relative w-12 h-12 flex-shrink-0">
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl border border-slate-700/80 overflow-hidden relative">
                        <img
                            src={ad.homeTeamLogo || teamAvatarFallback(ad.homeTeamName || '')}
                            alt="" draggable={false} style={noCalloutStyle}
                            className="w-[26px] h-[26px] rounded-lg object-cover absolute top-1 left-1"
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[6px] font-black text-orange-500 leading-none z-10">VS</span>
                        <img
                            src={ad.awayTeamLogo || teamAvatarFallback(ad.awayTeamName || '')}
                            alt="" draggable={false} style={noCalloutStyle}
                            className="w-[26px] h-[26px] rounded-lg object-cover absolute bottom-1 right-1 border-2 border-slate-900"
                        />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 bg-turf-600 p-0.5 rounded-md border border-slate-800 z-20">
                        <Users className="w-2.5 h-2.5 text-white" />
                    </div>
                </div>
            );
        }

        // Kendi aramızda / tek logo
        if (isGroup) {
            return (
                <div className="relative flex-shrink-0">
                    <img
                        src={ad?.homeTeamLogo || teamAvatarFallback(ad?.homeTeamName || channel.name)}
                        alt="" draggable={false} style={noCalloutStyle}
                        className="w-12 h-12 rounded-2xl object-cover"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 bg-turf-600 p-0.5 rounded-md border border-slate-800">
                        <Users className="w-2.5 h-2.5 text-white" />
                    </div>
                </div>
            );
        }

        // Joker müzakeresi
        if (isJoker) {
            return (
                <div className="relative flex-shrink-0">
                    <img
                        src={ad?.otherUserAvatar || userAvatarFallback(ad?.otherUserName || channel.name)}
                        alt="" draggable={false} style={noCalloutStyle}
                        className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 bg-yellow-500 p-0.5 rounded-md border border-slate-800">
                        <Star className="w-2.5 h-2.5 text-slate-900 fill-slate-900" />
                    </div>
                </div>
            );
        }

        // DM / fallback
        return (
            <div className="relative flex-shrink-0">
                <img
                    src={channel.avatarUrl || 'https://picsum.photos/200'}
                    alt="" draggable={false} style={noCalloutStyle}
                    className="w-12 h-12 rounded-full object-cover"
                />
            </div>
        );
    };

    return (
        <div
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            onClick={handleClick}
            className={`bg-slate-800/60 ${bgClass} px-4 py-3 rounded-2xl border border-slate-700/40 flex gap-3 items-center active:scale-[0.98] active:bg-slate-700/60 transition-all cursor-pointer select-none`}
        >
            {/* Avatar */}
            {renderAvatar()}

            {/* İçerik */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">

                {/* Satır 1: Kanal adı + status ikonu */}
                <div className="flex items-center gap-1 min-w-0">
                    {isJoker && (
                        <span
                            className="text-yellow-500 font-black uppercase tracking-wider bg-yellow-500/10 px-1.5 py-0.5 rounded-full border border-yellow-500/20 flex-shrink-0"
                            style={{ fontSize: 'clamp(9px, 2.4vw, 11px)' }}
                        >
                            Joker
                        </span>
                    )}
                    <span
                        className="text-white font-bold truncate"
                        style={{ fontSize: 'clamp(14px, 3.8vw, 16px)' }}
                    >
                        {channel.name}
                    </span>
                    <MatchStatusBadge reservation={channel.reservation} />
                </div>

                {/* Satır 2: Gönderen adı + son mesaj içeriği */}
                <p
                    className="truncate text-slate-400"
                    style={{ fontSize: 'clamp(12px, 3.2vw, 14px)' }}
                >
                    {renderLastMessage()}
                </p>

                {/* Satır 3: Maç durumu etiketi (opsiyonel) */}
                {statusInfo && (
                    <span
                        className={`${statusInfo.textColor} font-semibold`}
                        style={{ fontSize: 'clamp(10px, 2.6vw, 12px)' }}
                    >
                        {statusInfo.label}
                    </span>
                )}
            </div>

            {/* Sağ sütun: zaman + okunmamış badge */}
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0 self-start pt-0.5">
                <span
                    className={`whitespace-nowrap ${channel.unreadCount > 0 ? 'text-blue-400 font-bold' : 'text-slate-500'}`}
                    style={{ fontSize: 'clamp(10px, 2.6vw, 12px)' }}
                >
                    {formatMessageDate(channel.lastActivityAt)}
                </span>
                {channel.unreadCount > 0 && (
                    <div
                        className="bg-blue-500 text-white font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center"
                        style={{ fontSize: 'clamp(10px, 2.6vw, 12px)' }}
                    >
                        {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
                    </div>
                )}
            </div>
        </div>
    );
};
