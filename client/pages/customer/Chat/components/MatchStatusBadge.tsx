import React from 'react';
import { getMatchStatusInfo } from '../utils/chatUtils';

interface MatchStatusBadgeProps {
    reservation?: { status: string; slotTime: string };
    size?: 'sm' | 'md';
}

export const MatchStatusBadge: React.FC<MatchStatusBadgeProps> = ({ reservation, size = 'sm' }) => {
    const info = getMatchStatusInfo(reservation);
    if (!info) return null;
    const s = size === 'sm' ? 14 : 16;

    if (info.type === 'pending') {
        return (
            <span className="inline-flex items-center ml-1.5 shrink-0" title={info.label}>
                <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="11" fill={info.badgeColor} />
                    <circle cx="12" cy="12" r="8" fill="none" stroke="white" strokeWidth="1.5" />
                    <path d="M12 7.5v4.5l2.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </span>
        );
    }
    if (info.type === 'unplayed') {
        return (
            <span className="inline-flex items-center ml-1.5 shrink-0" title={info.label}>
                <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="11" fill={info.badgeColor} />
                    <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </span>
        );
    }

    return (
        <span className="inline-flex items-center ml-1.5 shrink-0" title={info.label}>
            <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11" fill={info.badgeColor} />
                <path d="M7.5 12.5l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </span>
    );
};
