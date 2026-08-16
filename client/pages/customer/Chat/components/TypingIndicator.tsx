import React from 'react';
import { UserAvatar } from './UserAvatar';

// WhatsApp tarzı "yazıyor..." balonu — mesaj listesinin SONUNDA, endRef'ten
// hemen önce render edilir (Chat.tsx). Salt sunum bileşeni: engelli-kullanıcı
// filtresi ve takım accent çözümlemesi Chat.tsx'te yapılır.
// Grup: 28px avatar(lar) + nokta balonu (KİMİN yazdığı belli olsun);
// 1:1 (DM / JOKER_NEGOTIATION): yalnız nokta balonu.

export interface TypingTyper {
    userId: string;
    name: string;
    avatarUrl: string | null;
    accentHex: string | null;
}

interface Props {
    typers: TypingTyper[];
    isOneToOne: boolean;
}

export const TypingIndicator: React.FC<Props> = ({ typers, isOneToOne }) => {
    if (typers.length === 0) return null;
    // En fazla 3 bindirmeli avatar; fazlası tek balonda toplanır
    const shown = typers.slice(0, 3);
    return (
        <div className="flex items-end gap-2 mt-1 mb-0.5 animate-fade-in">
            {!isOneToOne && (
                <div className="flex shrink-0 items-end">
                    {shown.map((t, i) => (
                        <span
                            key={t.userId}
                            className="rounded-full"
                            style={{
                                marginLeft: i === 0 ? 0 : -10, // WhatsApp tarzı bindirme
                                zIndex: shown.length - i,
                                // Takım halkası — MessageBubble avatar ring'i ile aynı desen
                                boxShadow: t.accentHex ? `0 0 0 2px ${t.accentHex}` : undefined,
                            }}
                        >
                            <UserAvatar url={t.avatarUrl} name={t.name} size={28} accentHex={t.accentHex} />
                        </span>
                    ))}
                </div>
            )}
            {/* Balon — MessageBubble !isMe zemini (bg-slate-800) ile aynı aile */}
            <div className="bg-slate-800 border border-slate-700/60 rounded-2xl rounded-bl-md px-3.5 py-3 flex items-center gap-1">
                {[0, 160, 320].map((delay) => (
                    <span
                        key={delay}
                        className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-typing-dot"
                        style={{ animationDelay: `${delay}ms` }}
                    />
                ))}
            </div>
        </div>
    );
};
