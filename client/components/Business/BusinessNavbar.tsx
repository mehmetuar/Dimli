import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, SlidersHorizontal, TrendingUp } from 'lucide-react';

export const BusinessNavbar: React.FC<{ hidden?: boolean }> = ({ hidden }) => {
    const navigate = useNavigate();
    const location = useLocation();

    if (hidden) return null;

    const isPanelActive = location.pathname === '/business/dashboard';
    const isStatsActive = location.pathname === '/business/stats';
    const isSettingsActive = location.pathname.startsWith('/business/settings');

    return (
        <nav className="business-navbar fixed bottom-0 left-0 right-0 h-20 bg-[#1e293b] border-t border-white/10 rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] z-50 box-content pb-safe-bottom">
            <div className="flex justify-around items-center h-full px-2">

                {/* Sol: Özet */}
                <button
                    onClick={() => navigate('/business/stats')}
                    className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 relative group ${
                        isStatsActive ? 'text-orange-500 scale-110' : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <TrendingUp className={`w-6 h-6 mb-0.5 ${isStatsActive ? 'stroke-[3px]' : ''}`} />
                    <span className="text-[10px] font-bold mt-1">Özet</span>
                    {isStatsActive && (
                        <span className="absolute bottom-1 w-1 h-1 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)]"></span>
                    )}
                </button>

                {/* Orta: Panel (Premium Diamond Button) */}
                <button
                    onClick={() => navigate('/business/dashboard')}
                    className="relative flex items-center justify-center flex-col"
                    style={{ marginTop: '-24px' }}
                >
                    <div className="bg-gradient-to-tr from-orange-600 to-orange-400 w-14 h-14 rounded-xl shadow-lg shadow-orange-500/30 border-4 border-[#1e293b] rotate-45 hover:scale-110 transition-transform group flex items-center justify-center shrink-0">
                        <img src="/Pitch.svg" alt="Panel" className="w-8 h-8 -rotate-45 drop-shadow-md object-contain" />
                    </div>
                    <span className={`absolute -bottom-5 text-[10px] font-bold transition-all duration-300 ${isPanelActive ? 'text-orange-500' : 'text-slate-400'}`}>
                        Panel
                    </span>
                </button>

                {/* Sağ: Ayarlar */}
                <button
                    onClick={() => navigate('/business/settings')}
                    className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 relative group ${
                        isSettingsActive ? 'text-orange-500 scale-110' : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <SlidersHorizontal className={`w-6 h-6 mb-0.5 ${isSettingsActive ? 'stroke-[3px]' : ''}`} />
                    <span className="text-[10px] font-bold mt-1">Ayarlar</span>
                    {isSettingsActive && (
                        <span className="absolute bottom-1 w-1 h-1 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)]"></span>
                    )}
                </button>

            </div>
        </nav>
    );
};
