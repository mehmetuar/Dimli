import React from 'react';
import { Bell } from 'lucide-react';
import { Notification } from '../hooks/useNotifications';
import { NotificationItem } from './NotificationItem';

interface AllNotificationsTabProps {
    notifications: Notification[];
    handleAcceptRematchFromNotif: (n: Notification) => void;
    setActiveTab: (tab: 'ALL' | 'JOIN_REQUESTS' | 'MATCH_REQUESTS') => void;
}

export const AllNotificationsTab: React.FC<AllNotificationsTabProps> = ({
    notifications, handleAcceptRematchFromNotif, setActiveTab
}) => {
    if (notifications.length === 0) {
        return (
            <div className="text-center py-12 opacity-50">
                <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Şu an yeni bildirim yok.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {notifications.map(notif => (
                <NotificationItem
                    key={notif.id}
                    notif={notif}
                    handleAcceptRematchFromNotif={handleAcceptRematchFromNotif}
                    onTabNavigate={setActiveTab}
                />
            ))}
        </div>
    );
};
