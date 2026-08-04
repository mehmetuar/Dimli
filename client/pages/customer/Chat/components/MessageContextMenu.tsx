import React from 'react';
import { Copy, Flag, Info, Reply, Pin } from 'lucide-react';
import type { ActionMessage, MenuPosition } from '../hooks/useMessageActions';

const MENU_WIDTH = 192;
const MENU_ROW_HEIGHT = 48; // buton başına yaklaşık yükseklik

interface Props {
    visible: boolean;
    msg: ActionMessage | null;
    position: MenuPosition;
    onCopy: () => void;
    onReport: () => void;
    // Kendi mesajında Bildir yerine gösterilen okundu detayı aksiyonu.
    // undefined ise (eski sunucu — read-states yok) satır hiç çizilmez.
    onInfo?: () => void;
    // Cevapla — undefined ise (kapalı sohbet) satır hiç çizilmez.
    onReply?: () => void;
    // Sabitle — undefined ise (yetkisiz/izinsiz kanal) satır hiç çizilmez.
    // Etiket duruma göre "Sabitle" veya "Sabitlemeyi Kaldır" (pinLabel).
    onPin?: () => void;
    pinLabel?: string;
    onClose: () => void;
}

export const MessageContextMenu: React.FC<Props> = ({
    visible, msg, position, onCopy, onReport, onInfo, onReply, onPin, pinLabel, onClose,
}) => {
    if (!visible || !msg) return null;

    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const GAP = 10;

    // Yerleşim hesabı görünen satır sayısına göre — Cevapla/Sabitle opsiyonel
    const menuHeight = ((onReply ? 3 : 2) + (onPin ? 1 : 0)) * MENU_ROW_HEIGHT;

    // Menüyü bubble'ın altında göster; yeterli alan yoksa üstte
    const showBelow = position.bottom + GAP + menuHeight < vh - 24;
    const menuTop = showBelow
        ? position.bottom + GAP
        : position.top - menuHeight - GAP;

    // Sol kenar bubble ile hizalı, ekran dışına taşmasın
    const menuLeft = Math.min(Math.max(position.left, 8), vw - MENU_WIDTH - 8);

    return (
        <>
            {/* Karanlık overlay — tıklamak menüyü kapatır */}
            <div
                className="fixed inset-0 z-[98] bg-black/65"
                style={{ backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }}
                onTouchStart={onClose}
                onClick={onClose}
            />

            {/* Mesaj klonu — overlay üzerinde, orijinal konumda */}
            <div
                className="fixed z-[99] pointer-events-none"
                style={{
                    top: position.top,
                    left: position.left,
                    width: position.width,
                    animation: 'msgLift 160ms cubic-bezier(0.34,1.56,0.64,1) both',
                }}
            >
                <div className="bg-slate-800 text-slate-200 border border-slate-700 px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-2xl">
                    {msg.text}
                </div>
            </div>

            {/* Aksiyon popup */}
            <div
                className="fixed z-[99] rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 shadow-2xl"
                style={{
                    top: menuTop,
                    left: menuLeft,
                    width: MENU_WIDTH,
                    animation: 'menuPop 160ms cubic-bezier(0.34,1.56,0.64,1) both',
                }}
                onClick={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
            >
                {onReply && (
                    <>
                        <button
                            className="flex flex-row items-center gap-3 px-4 py-3 w-full active:bg-slate-700 transition-colors"
                            onClick={e => { e.stopPropagation(); onReply(); }}
                        >
                            <Reply className="w-5 h-5 text-slate-200 flex-shrink-0" />
                            <span className="text-sm font-medium text-white">Cevapla</span>
                        </button>
                        <div className="h-px bg-slate-700 mx-3" />
                    </>
                )}
                <button
                    className="flex flex-row items-center gap-3 px-4 py-3 w-full active:bg-slate-700 transition-colors"
                    onClick={e => { e.stopPropagation(); onCopy(); }}
                >
                    <Copy className="w-5 h-5 text-slate-200 flex-shrink-0" />
                    <span className="text-sm font-medium text-white">Kopyala</span>
                </button>

                {onPin && (
                    <>
                        <div className="h-px bg-slate-700 mx-3" />
                        <button
                            className="flex flex-row items-center gap-3 px-4 py-3 w-full active:bg-slate-700 transition-colors"
                            onClick={e => { e.stopPropagation(); onPin(); }}
                        >
                            <Pin className="w-5 h-5 text-turf-400 flex-shrink-0" />
                            <span className="text-sm font-medium text-turf-400">{pinLabel ?? 'Sabitle'}</span>
                        </button>
                    </>
                )}

                {msg.isMe ? (
                    onInfo && (
                        <>
                            <div className="h-px bg-slate-700 mx-3" />
                            <button
                                className="flex flex-row items-center gap-3 px-4 py-3 w-full active:bg-slate-700 transition-colors"
                                onClick={e => { e.stopPropagation(); onInfo(); }}
                            >
                                <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
                                <span className="text-sm font-medium text-blue-400">Bilgi</span>
                            </button>
                        </>
                    )
                ) : (
                    <>
                        <div className="h-px bg-slate-700 mx-3" />
                        <button
                            className="flex flex-row items-center gap-3 px-4 py-3 w-full active:bg-slate-700 transition-colors"
                            onClick={e => { e.stopPropagation(); onReport(); }}
                        >
                            <Flag className="w-5 h-5 text-orange-400 flex-shrink-0" />
                            <span className="text-sm font-medium text-orange-400">Bildir</span>
                        </button>
                    </>
                )}
            </div>

            <style>{`
                @keyframes msgLift {
                    from { opacity: 0.6; transform: scale(0.96); }
                    to   { opacity: 1;   transform: scale(1); }
                }
                @keyframes menuPop {
                    from { opacity: 0; transform: scale(0.88) translateY(4px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </>
    );
};
