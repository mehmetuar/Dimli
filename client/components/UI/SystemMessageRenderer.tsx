import React from 'react';

// Custom SVG Icon Components — 16x16, turf-themed
const icons: Record<string, React.ReactNode> = {
    SHIELD: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M12 18v-8" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        </svg>
    ),
    CLIPBOARD: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <rect x="6" y="3" width="12" height="18" rx="2" stroke="#4ade80" strokeWidth="1.8" fill="none" />
            <path d="M9 3V2a1 1 0 011-1h4a1 1 0 011 1v1" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="9" y1="9" x2="15" y2="9" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="9" y1="12.5" x2="15" y2="12.5" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="9" y1="16" x2="13" y2="16" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    ),

    STADIUM: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <ellipse cx="12" cy="17" rx="9" ry="4" stroke="#34d399" strokeWidth="1.8" fill="none" />
            <path d="M3 17V9c0-2.2 4-4 9-4s9 1.8 9 4v8" stroke="#34d399" strokeWidth="1.8" fill="none" />
            <ellipse cx="12" cy="9" rx="9" ry="4" stroke="#34d399" strokeWidth="1.8" fill="none" />
        </svg>
    ),

    PIN: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#f87171" strokeWidth="1.8" fill="none" />
            <circle cx="12" cy="9" r="2.5" stroke="#f87171" strokeWidth="1.8" fill="none" />
        </svg>
    ),

    // Anket duyurusu (yatay oy çubukları) — {{POLL}} Anket: ...
    POLL: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <line x1="4" y1="6" x2="20" y2="6" stroke="#4ade80" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="4" y1="12" x2="13" y2="12" stroke="#4ade80" strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
            <line x1="4" y1="18" x2="17" y2="18" stroke="#4ade80" strokeWidth="2.4" strokeLinecap="round" opacity="0.6" />
        </svg>
    ),

    // Sabitlenmiş mesaj (raptiye) — {{PINNED}} ... bir mesajı sabitledi.
    // Harita iğnesi PIN'den bilinçli olarak farklı bir çizim.
    PINNED: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z" stroke="#fbbf24" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
            <line x1="12" y1="14" x2="12" y2="21" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    ),

    CALENDAR: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="#60a5fa" strokeWidth="1.8" fill="none" />
            <line x1="3" y1="10" x2="21" y2="10" stroke="#60a5fa" strokeWidth="1.8" />
            <line x1="8" y1="2" x2="8" y2="6" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="16" y1="2" x2="16" y2="6" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" />
            <rect x="7" y="13" width="3" height="3" rx="0.5" fill="#60a5fa" />
        </svg>
    ),

    CLOCK: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <circle cx="12" cy="12" r="9" stroke="#fbbf24" strokeWidth="1.8" fill="none" />
            <polyline points="12,7 12,12 16,14" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),

    FOOTBALL: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <circle cx="12" cy="12" r="10" stroke="#4ade80" strokeWidth="1.8" fill="none" />
            <path d="M12 2l2.5 6.5L21 10l-5 4.5L17 21l-5-3.5L7 21l1-6.5L3 10l6.5-1.5L12 2z" stroke="#4ade80" strokeWidth="1" fill="none" opacity="0.6" />
            <circle cx="12" cy="12" r="3" fill="#4ade80" opacity="0.3" />
        </svg>
    ),

    CHECK: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <circle cx="12" cy="12" r="10" stroke="#4ade80" strokeWidth="1.8" fill="none" />
            <path d="M7.5 12.5l3 3 6-6" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),


    COMMENT: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="#94a3b8" strokeWidth="1.8" fill="none" />
            <line x1="8" y1="9" x2="16" y2="9" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="8" y1="13" x2="13" y2="13" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    ),

    CANCEL: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <circle cx="12" cy="12" r="10" stroke="#f87171" strokeWidth="1.8" fill="none" />
            <line x1="8" y1="8" x2="16" y2="16" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
            <line x1="16" y1="8" x2="8" y2="16" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),

    HANDSHAKE: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <path d="M2 11l4-4 3 1 4-4 3 2 6-1" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M22 13l-4 4-3-1-4 4-3-2-6 1" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
    ),

    REVOKE: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0z" stroke="#fbbf24" strokeWidth="1.8" fill="none" />
            <path d="M8 12l3-3m0 0l-3-3m3 3H6" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),

    PARTY: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <path d="M5 21l2-8L3 9h6l3-8 3 8h6l-4 4 2 8-7-5-7 5z" stroke="#fbbf24" strokeWidth="1.8" fill="none" />
            <circle cx="12" cy="11" r="2" fill="#fbbf24" opacity="0.4" />
        </svg>
    ),

    SAD: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <circle cx="12" cy="12" r="10" stroke="#94a3b8" strokeWidth="1.8" fill="none" />
            <circle cx="9" cy="10" r="1.2" fill="#94a3b8" />
            <circle cx="15" cy="10" r="1.2" fill="#94a3b8" />
            <path d="M8 16c1-1.5 3-2.5 4-2.5s3 1 4 2.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
    ),

    PROPOSAL: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <circle cx="12" cy="12" r="9" stroke="#a78bfa" strokeWidth="1.8" fill="none" />
            <polyline points="12,7 12,12 16,14" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18 6l2-2m0 0l-2-2m2 2h-3" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),

    ENVELOPE: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <rect x="2" y="4" width="20" height="16" rx="2" stroke="#60a5fa" strokeWidth="1.8" fill="none" />
            <polyline points="2,4 12,13 22,4" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),

    JOKER_JOINED: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <path d="M16 21v-2a4 4 0 00-4-4H5c-1.1 0-2 .9-2 2v2M8.5 3a4 4 0 100 8 4 4 0 000-8zM20 8v6M23 11h-6" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    JOKER_ADDED: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <path d="M16 21v-2a4 4 0 00-4-4H5c-1.1 0-2 .9-2 2v2M8.5 3a4 4 0 100 8 4 4 0 000-8zM20 8v6M23 11h-6" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    JOKER_SUCCESS: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <path d="M16 21v-2a4 4 0 00-4-4H5c-1.1 0-2 .9-2 2v2M8.5 3a4 4 0 100 8 4 4 0 000-8zM20 8v6M23 11h-6" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    JOKER_LEFT: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <path d="M16 21v-2a4 4 0 00-4-4H5c-1.1 0-2 .9-2 2v2M8.5 3a4 4 0 100 8 4 4 0 000-8zM18 8l4 4-4 4M22 12H12" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    JOKER_KICKED: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mr-1">
            <path d="M16 21v-2a4 4 0 00-4-4H5c-1.1 0-2 .9-2 2v2M8.5 3a4 4 0 100 8 4 4 0 000-8zM18 8l4 4-4 4M22 12H12" stroke="#f87171" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),

};

// Parse text and replace {{ICON}} or [ICON:name] markers with SVG components
const parseSystemMessage = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /(\{\{(\w+)\}\}|\[ICON:(\w+)\])/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        // Add the icon
        const iconName = (match[2] || match[3]).toUpperCase();
        if (icons[iconName]) {
            parts.push(
                <span key={`icon-${match.index}`} className="inline-flex items-center">
                    {icons[iconName]}
                </span>
            );
        } else {
            // Unknown marker, keep as-is
            parts.push(match[0]);
        }

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return parts;
};

// Utility to get plain text without markers for previews
export const stripSystemMessageMarkers = (text: string): string => {
    if (!text) return '';
    return text.replace(/(\{\{\w+\}\}|\[ICON:\w+\])/g, '').replace(/\s+/g, ' ').trim();
};

interface SystemMessageRendererProps {
    text: string;
}

export const SystemMessageRenderer: React.FC<SystemMessageRendererProps> = ({ text }) => {
    return <>{parseSystemMessage(text)}</>;
};
