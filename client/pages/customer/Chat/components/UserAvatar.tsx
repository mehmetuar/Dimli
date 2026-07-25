import React, { useState } from 'react';

// Tek kaynaklı kullanıcı avatarı — balon ve Mesaj Bilgisi modalı aynı bileşeni
// aynı renk kaynağıyla kullanır, görünüm her yüzeyde birebir aynı kalır.
// CSS tabanlı: baş harfler yerelde çizilir, ağ bağımlılığı yok (çevrimdışı çalışır).

// ui-avatars.com URL'leri (eski kayıt akışı kalıntısı, DB'de nadir) gerçek
// fotoğraf SAYILMAZ — rastgele renkli tutarsız görünüm engellenir.
export const realAvatarUrl = (url?: string | null): string | null =>
    url && !url.includes('ui-avatars.com') ? url : null;

const initialsOf = (name: string): string =>
    name.trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('') || '?';

interface Props {
    url?: string | null;
    name: string;
    size: number;
    // Takım bağlamı: takım renginde zemin + koyu yazı. null/undefined → nötr
    // koyu zemin + yeşil yazı (Joker DM / kendi aramızda görünümü).
    accentHex?: string | null;
    className?: string;
}

export const UserAvatar: React.FC<Props> = ({ url, name, size, accentHex, className }) => {
    const [broken, setBroken] = useState(false);
    const src = !broken ? realAvatarUrl(url) : null;
    if (src) {
        return (
            <img
                src={src}
                alt={name}
                onError={() => setBroken(true)}
                className={`rounded-full object-cover shrink-0 bg-slate-700 ${className ?? ''}`}
                style={{ width: size, height: size }}
            />
        );
    }
    return (
        <span
            className={`rounded-full flex items-center justify-center font-bold shrink-0 ${className ?? ''}`}
            style={{
                width: size,
                height: size,
                fontSize: Math.round(size * 0.36),
                // Nötr zemin sohbet arka planından (#0f172a) bir tık açık lacivert —
                // #111827 arka planla karışıp daire yokmuş gibi görünüyordu.
                backgroundColor: accentHex || '#263850',
                color: accentHex ? '#0f172a' : '#4ade80',
            }}
        >
            {initialsOf(name)}
        </span>
    );
};
