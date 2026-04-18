import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, SlidersHorizontal } from 'lucide-react';

export const BusinessNavbar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        {
            name: 'Panel',
            path: '/business/dashboard',
            icon: BarChart3,
        },
        {
            name: 'Ayarlar',
            path: '/business/settings',
            icon: SlidersHorizontal,
        },
    ];

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700"
            style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.5)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <div className="flex justify-around items-center h-[62px] px-6">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = location.pathname === tab.path ||
                        (tab.path === '/business/settings' && location.pathname.startsWith('/business/settings'));

                    return (
                        <button
                            key={tab.path}
                            onClick={() => navigate(tab.path)}
                            className="flex flex-col items-center justify-center flex-1 h-full gap-1.5 transition-all active:scale-95"
                        >
                            <Icon
                                className={`transition-all duration-200 ${
                                    isActive ? 'text-orange-400' : 'text-slate-500'
                                }`}
                                size={28}
                                strokeWidth={isActive ? 2.5 : 1.8}
                            />
                            <span
                                className={`text-[11px] transition-all duration-200 ${
                                    isActive ? 'text-orange-400 font-bold' : 'text-slate-500 font-medium'
                                }`}
                            >
                                {tab.name}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
