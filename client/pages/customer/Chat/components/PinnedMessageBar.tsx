import React from 'react';
import { Pin, X, BarChart3 } from 'lucide-react';
import { stripSystemMessageMarkers } from '../../../../components/UI/SystemMessageRenderer';

interface PinView {
    id: string;
    channelId: string;
    teamId: string;
    messageId: string;
    pinnedById: string | null;
    pinnedAt: string;
    message: {
        id: string;
        senderId: string | null;
        senderName: string | null;
        content: string;
        isSystemMessage: boolean;
        metadata?: { type?: string; pollId?: string } | null;
    };
}

interface TeamColorsLike {
    homeTeamId: string;
    awayTeamId: string;
    homeAccent: { base: string };
    awayAccent: { base: string };
}

interface Props {
    pins: PinView[];
    myTeamId?: string | null;
    // Sabit yönetme yetkisi (kaptan/yardımcı + bağlam takımı + maç bitmemiş) —
    // yalnız KENDİ takımının satırında X gösterilir
    canManage: boolean;
    // Rakipli kanallarda dolu — sol şerit sabitin sahibi takımın rengini alır
    teamChatColors?: TeamColorsLike | null;
    blockedUserIds?: string[];
    onTapPin: (messageId: string) => void;
    onUnpin: () => void;
}

// Sohbet tepesindeki sabitlenmiş mesaj barı (WhatsApp tarzı). Header ile mesaj
// scroll container'ı ARASINDA flex kardeş olarak durur — scroll matematiğini
// etkilemez. Rakiplide takım başına bir satır (maks 2), takım renkli şerit.
export const PinnedMessageBar: React.FC<Props> = ({
    pins, myTeamId, canManage, teamChatColors, blockedUserIds, onTapPin, onUnpin,
}) => {
    if (pins.length === 0) return null;

    const stripeColor = (teamId: string): string => {
        if (teamChatColors) {
            if (teamId === teamChatColors.homeTeamId) return teamChatColors.homeAccent.base;
            if (teamId === teamChatColors.awayTeamId) return teamChatColors.awayAccent.base;
        }
        return '#16a34a'; // tek takımlı kanallar — turf yeşili
    };

    return (
        <div className="flex-shrink-0 bg-slate-900 border-b border-slate-800">
            {pins.map(pin => {
                const isBlocked = !!pin.message.senderId
                    && !!blockedUserIds?.includes(pin.message.senderId);
                // Anket sabiti: gönderen yok (sistem duyurusu) — "Anket" etiketi +
                // anket ikonu; metindeki {{POLL}} token'ı strip edilir.
                const isPoll = pin.message.metadata?.type === 'POLL';
                return (
                    <button
                        key={pin.id}
                        onClick={() => onTapPin(pin.messageId)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 active:bg-slate-800 transition-colors text-left"
                    >
                        <span
                            className="self-stretch w-[3px] rounded-full shrink-0"
                            style={{ backgroundColor: stripeColor(pin.teamId) }}
                        />
                        {isPoll
                            ? <BarChart3 className="w-4 h-4 text-turf-400 shrink-0" />
                            : <Pin className="w-4 h-4 text-turf-400 shrink-0" />}
                        <span className="flex-1 min-w-0 flex items-baseline gap-1.5">
                            {!isPoll && (
                                <span className="text-xs font-semibold text-slate-300 shrink-0">
                                    {isBlocked ? 'Engellenen kullanıcı' : (pin.message.senderName ?? 'Bilinmeyen')}
                                </span>
                            )}
                            <span className="text-xs text-slate-400 truncate">
                                {isBlocked && !isPoll ? 'Mesaj' : stripSystemMessageMarkers(pin.message.content)}
                            </span>
                        </span>
                        {canManage && pin.teamId === myTeamId && (
                            <span
                                role="button"
                                onClick={e => { e.stopPropagation(); onUnpin(); }}
                                className="p-1.5 text-slate-500 hover:text-white shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};
