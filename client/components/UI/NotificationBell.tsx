import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../contexts/SocketContext';

export const NotificationBell: React.FC = () => {
    const [unreadCount, setUnreadCount] = useState(0);
    const socket = useSocket();

    useEffect(() => {
        fetchUnreadCount();

        const onCleared = () => setUnreadCount(0);
        window.addEventListener('notificationsCleared', onCleared);

        if (!socket) return () => window.removeEventListener('notificationsCleared', onCleared);
        const onNotification = () => fetchUnreadCount();
        socket.on('notification', onNotification);
        return () => {
            socket.off('notification', onNotification);
            window.removeEventListener('notificationsCleared', onCleared);
        };
    }, [socket]);

    const fetchUnreadCount = async () => {
        try {
            const response = await api.get('/notifications/unread-count');
            setUnreadCount(response.data.count || 0);
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    };

    return (
        <button
            className="relative p-2 rounded-full hover:bg-slate-700 transition-colors group"
            onClick={() => {
                // Navigate to notifications page (we'll create this later)
                window.location.href = '#/notifications';
            }}
        >
            <Bell className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />

            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse shadow-lg shadow-red-500/50">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    );
};
