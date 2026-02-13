import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings } from 'lucide-react';

export const BusinessNavbar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        {
            name: 'Dashboard',
            path: '/business/dashboard',
            icon: LayoutDashboard,
        },
        {
            name: 'Ayarlar',
            path: '/business/settings',
            icon: Settings,
        },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 shadow-2xl z-50">
            <div className="flex justify-around items-center h-20 px-4">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = location.pathname === tab.path;

                    return (
                        <button
                            key={tab.path}
                            onClick={() => navigate(tab.path)}
                            className={`
                                flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all
                                ${isActive ? 'text-orange-500' : 'text-slate-400 hover:text-slate-300'}
                            `}
                        >
                            <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
                            <span className={`text-xs font-bold uppercase ${isActive ? 'text-orange-500' : ''}`}>
                                {tab.name}
                            </span>
                            {isActive && (
                                <div className="absolute bottom-0 w-16 h-1 bg-orange-500 rounded-t-full" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
