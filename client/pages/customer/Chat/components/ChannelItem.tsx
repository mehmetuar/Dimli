import React, { useState, useEffect, useRef } from 'react';
import { Users, Star } from 'lucide-react';
import { getMatchStatusInfo, formatMessageDate, teamAvatarFallback, userAvatarFallback } from '../utils/chatUtils';
import { MatchStatusBadge } from './MatchStatusBadge';
import { stripSystemMessageMarkers } from '../../../../components/UI/SystemMessageRenderer';

interface ChannelItemProps {
    channel: any;
    onClick: () => void;
    onLongPress: () => void;
    blockedUserIds?: string[];
}

export const ChannelItem: React.FC<ChannelItemProps> = ({ channel, onClick, onLongPress, blockedUserIds }) => {
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

    const handleMouseDown = () => {
        setStartLongPress(true);
        setIsLongPressTriggered(false);
    };

    const handleMouseUp = () => {
        setStartLongPress(false);
    };

    const handleMouseLeave = () => {
        setStartLongPress(false);
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isLongPressTriggered) {
            e.stopPropagation();
            return;
        }
        onClick();
    };

    const statusInfo = getMatchStatusInfo(channel.reservation);
    let bgClass = statusInfo ? statusInfo.bgTint : '';
    if (channel.type === 'JOKER_NEGOTIATION') {
        bgClass = 'bg-yellow-500/5';
    }

    return (
        <div
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            onClick={handleClick}
            className={`bg-slate-800 ${bgClass} p-4 rounded-2xl border border-slate-700/50 flex gap-4 items-center hover:bg-slate-750 active:scale-95 transition-all cursor-pointer select-none`}
        >
            {(() => {
                const ad = channel.avatarData;

                // ── MATCH_GROUP: VS (iki takım) ───────────────────────────────
                if (
                    channel.type === 'MATCH_GROUP' &&
                    ad?.matchType !== 'kendi_aramizda' &&
                    ad?.awayTeamLogo !== undefined &&
                    ad?.awayTeamLogo !== null
                ) {
                    return (
                        <div className="relative w-14 h-14 bg-slate-900 rounded-2xl border border-slate-700 flex-shrink-0 overflow-visible">
                            {/* Sol üst: Home team */}
                            <img
                                src={ad.homeTeamLogo || teamAvatarFallback(ad.homeTeamName || '')}
                                alt={ad.homeTeamName}
                                className="w-[30px] h-[30px] rounded-lg object-cover absolute top-1 left-1 z-10"
                            />
                            {/* Merkez: VS */}
                            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                                <span className="text-[7px] font-black text-orange-500 bg-slate-950/90 px-1 py-px rounded leading-none tracking-wider">VS</span>
                            </div>
                            {/* Sağ alt: Away team */}
                            <img
                                src={ad.awayTeamLogo || teamAvatarFallback(ad.awayTeamName || '')}
                                alt={ad.awayTeamName}
                                className="w-[30px] h-[30px] rounded-lg object-cover absolute bottom-1 right-1 z-10 border-2 border-slate-900"
                            />
                            {/* Users badge */}
                            <div className="absolute -bottom-1 -right-1 bg-turf-600 p-1 rounded-lg border border-slate-800 z-30">
                                <Users className="w-3 h-3 text-white" />
                            </div>
                        </div>
                    );
                }

                // ── MATCH_GROUP: kendi aramizda veya rakip yoksa tek logo ─────
                if (channel.type === 'MATCH_GROUP') {
                    return (
                        <div className="relative flex-shrink-0">
                            <img
                                src={ad?.homeTeamLogo || teamAvatarFallback(ad?.homeTeamName || channel.name)}
                                alt={channel.name}
                                className="w-14 h-14 rounded-2xl object-cover"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-turf-600 p-1 rounded-lg border border-slate-800">
                                <Users className="w-3 h-3 text-white" />
                            </div>
                        </div>
                    );
                }

                // ── JOKER_NEGOTIATION: karşı tarafın fotoğrafı ───────────────
                if (channel.type === 'JOKER_NEGOTIATION') {
                    return (
                        <div className="relative flex-shrink-0">
                            <img
                                src={ad?.otherUserAvatar || userAvatarFallback(ad?.otherUserName || channel.name)}
                                alt={ad?.otherUserName || channel.name}
                                className="w-14 h-14 rounded-full object-cover"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-yellow-500 p-1 rounded-lg border border-slate-800 shadow-lg shadow-yellow-500/20">
                                <Star className="w-3 h-3 text-slate-900 fill-slate-900" />
                            </div>
                        </div>
                    );
                }

                // ── Fallback (DM / diğer) ─────────────────────────────────────
                return (
                    <div className="relative flex-shrink-0">
                        <img
                            src={channel.avatarUrl || 'https://picsum.photos/200'}
                            alt={channel.name}
                            className="w-14 h-14 rounded-full object-cover"
                        />
                    </div>
                );
            })()}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <h4 className="text-white font-bold truncate pr-2 flex items-center">
                        {channel.type === 'JOKER_NEGOTIATION' && <span className="text-yellow-500 text-xs font-black uppercase tracking-wider mr-2 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">Joker DM</span>}
                        {channel.name}
                        <MatchStatusBadge reservation={channel.reservation} />
                    </h4>
                    <div className="flex flex-col items-end gap-1">
                        <span className={`text-[10px] whitespace-nowrap ${channel.unreadCount > 0 ? 'text-blue-500 font-bold' : 'text-slate-500'}`}>
                            {formatMessageDate(channel.lastActivityAt)}
                        </span>
                        {channel.unreadCount > 0 && (
                            <div className="bg-blue-500 text-white text-[10px] font-bold min-w-[1.25rem] h-5 px-1.5 rounded-full flex items-center justify-center">
                                {channel.unreadCount}
                            </div>
                        )}
                    </div>
                </div>
                <p className="text-sm truncate mt-0.5 text-slate-400">
                    {channel.type === 'MATCH_GROUP' && <span className="text-turf-500 font-bold mr-1">Takım:</span>}
                    {startLongPress ? 'Seçenekler...' : (() => {
                        const lm = channel.lastMessage;
                        const senderBlocked = lm && !lm.isSystemMessage && lm.senderId
                            && blockedUserIds?.includes(lm.senderId);
                        if (senderBlocked) return <span className="italic">Mesaj gizlendi</span>;
                        return lm?.content ? stripSystemMessageMarkers(lm.content) : 'Sohbete girmek için tıkla';
                    })()}
                </p>
                {statusInfo && (
                    <span className={`text-[10px] font-semibold mt-1 inline-block ${statusInfo.textColor}`}>
                        {statusInfo.label}
                    </span>
                )}
            </div>
        </div>
    );
};
