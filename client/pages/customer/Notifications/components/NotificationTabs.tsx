import React from 'react';

interface NotificationTabsProps {
    activeTab: 'ALL' | 'JOIN_REQUESTS' | 'MATCH_REQUESTS';
    setActiveTab: (tab: 'ALL' | 'JOIN_REQUESTS' | 'MATCH_REQUESTS') => void;
    notificationsCount: number;
    matchRequestsCount: number;
    joinRequestsCount: number;
}

export const NotificationTabs: React.FC<NotificationTabsProps> = ({
    activeTab, setActiveTab, notificationsCount, matchRequestsCount, joinRequestsCount
}) => {
    return (
        <div className="flex p-1 bg-slate-800 rounded-xl mb-6 border border-slate-700">
            <button
                onClick={() => setActiveTab('ALL')}
                className={`flex-1 py-2.5 text-[10px] font-bold rounded-lg transition-all leading-tight ${activeTab === 'ALL'
                    ? 'bg-slate-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                    }`}
            >
                HEPSİ{`\n(${notificationsCount})`}
            </button>
            <button
                onClick={() => setActiveTab('MATCH_REQUESTS')}
                className={`flex-1 py-2.5 text-[10px] font-bold rounded-lg transition-all leading-tight ${activeTab === 'MATCH_REQUESTS'
                    ? 'bg-turf-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                    }`}
            >
                MAÇ{`\nİSTEKLERİ (${matchRequestsCount})`}
            </button>
            <button
                onClick={() => setActiveTab('JOIN_REQUESTS')}
                className={`flex-1 py-2.5 text-[10px] font-bold rounded-lg transition-all leading-tight ${activeTab === 'JOIN_REQUESTS'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                    }`}
            >
                KATILMA{`\nİSTEKLERİ (${joinRequestsCount})`}
            </button>
        </div>
    );
};
