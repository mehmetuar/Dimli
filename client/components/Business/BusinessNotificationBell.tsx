import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import api from '../../services/api';
import { getOwnerId } from '../../services/authStorage';
import { useSocket } from '../../contexts/SocketContext';

interface BusinessNotificationBellProps {
    onClick: () => void;
}

export const BusinessNotificationBell: React.FC<BusinessNotificationBellProps> = ({ onClick }) => {
    const [unreadCount, setUnreadCount] = useState(0);

    const socket = useSocket();

    useEffect(() => {
        fetchUnreadCount();

        if (!socket) return;
        const onNotification = () => fetchUnreadCount();
        socket.on('businessNotification', onNotification);
        socket.on('notification', onNotification);
        return () => {
            socket.off('businessNotification', onNotification);
            socket.off('notification', onNotification);
        };
    }, [socket]);

    const fetchUnreadCount = async () => {
        try {
            const ownerId = getOwnerId();
            if (!ownerId) return;

            const response = await api.get(`/business-owner/notifications/unread-count?ownerId=${ownerId}`);
            setUnreadCount(response.data.count || 0);
        } catch (error) {
            console.error('Failed to fetch business unread count:', error);
        }
    };

    const handleClick = async () => {
        try {
            const ownerId = getOwnerId();
            if (ownerId && unreadCount > 0) {
                await api.post('/business-owner/notifications/mark-all-read', { ownerId });
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
        onClick();
    };

    return (
        <button
            className="relative p-2.5 bg-slate-800 hover:bg-orange-500/10 rounded-xl transition-all border border-slate-700 group ring-1 ring-white/5 active:scale-95"
            onClick={handleClick}
        >
            <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-orange-500 animate-[wiggle_1s_ease-in-out_infinite]' : 'text-slate-400 group-hover:text-orange-400'} transition-colors`} />

            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-lg shadow-orange-600/40 ring-2 ring-slate-900">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    );
};
