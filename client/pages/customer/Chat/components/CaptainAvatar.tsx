import React from 'react';
import { userAvatarFallback } from '../utils/chatUtils';

// Kaptan dairesi: profil fotoğrafı varsa fotoğraf, yoksa sarı "C" rozeti.
// Kırık fotoğraf URL'inde baş harf görseline düşer (ChannelItem ile aynı desen).
export const CaptainAvatar: React.FC<{ avatarUrl?: string | null; name: string }> = ({ avatarUrl, name }) =>
    avatarUrl ? (
        <img
            src={avatarUrl}
            alt={name}
            className="w-8 h-8 rounded-full object-cover shrink-0 bg-slate-700"
            onError={(e) => { const el = e.currentTarget; el.onerror = null; el.src = userAvatarFallback(name); }}
        />
    ) : (
        <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center shrink-0">
            <span className="font-black text-[10px] text-yellow-900">C</span>
        </div>
    );
