import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, SlidersHorizontal, TrendingUp } from 'lucide-react';

export const BusinessNavbar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const isPanelActive = location.pathname === '/business/dashboard';
    const isStatsActive = location.pathname === '/business/stats';
    const isSettingsActive = location.pathname.startsWith('/business/settings');

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a1628] border-t border-blue-900/50"
            style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.6)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <div className="flex justify-around items-end h-[68px] px-4">

                {/* Sol: Özet */}
                <button
                    onClick={() => navigate('/business/stats')}
                    className="flex flex-col items-center justify-center flex-1 h-full gap-1 pb-2 transition-all active:scale-95"
                >
                    <TrendingUp
                        className="transition-all duration-200 text-orange-500"
                        size={24}
                        strokeWidth={isStatsActive ? 3 : 2}
                    />
                    <span className={`text-[clamp(8px,2.2vw,10px)] transition-all duration-200 text-orange-500 ${isStatsActive ? 'font-black' : 'font-bold'}`}>
                        Özet
                    </span>
                </button>

                {/* Orta: Panel (büyük, yukarı taşınmış) */}
                <button
                    onClick={() => navigate('/business/dashboard')}
                    className="flex flex-col items-center justify-end flex-1 h-full gap-1 pb-2 transition-all active:scale-95"
                >
                    <div className={`
                        -translate-y-3 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200
                        ${isPanelActive
                            ? 'bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.5)]'
                            : 'bg-orange-600/20 border border-orange-500/30'
                        }
                    `}>
                        <BarChart3
                            className="transition-all duration-200 text-white"
                            size={30}
                            strokeWidth={isPanelActive ? 2.5 : 2}
                        />
                    </div>
                    <span className={`text-[clamp(8px,2.2vw,10px)] -mt-1 transition-all duration-200 text-orange-500 ${isPanelActive ? 'font-black' : 'font-bold'}`}>
                        Panel
                    </span>
                </button>

                {/* Sağ: Ayarlar */}
                <button
                    onClick={() => navigate('/business/settings')}
                    className="flex flex-col items-center justify-center flex-1 h-full gap-1 pb-2 transition-all active:scale-95"
                >
                    <SlidersHorizontal
                        className="transition-all duration-200 text-orange-500"
                        size={24}
                        strokeWidth={isSettingsActive ? 3 : 2}
                    />
                    <span className={`text-[clamp(8px,2.2vw,10px)] transition-all duration-200 text-orange-500 ${isSettingsActive ? 'font-black' : 'font-bold'}`}>
                        Ayarlar
                    </span>
                </button>

            </div>
        </div>
    );
};
