import React from 'react';
import { Calendar } from 'lucide-react';
import { BusinessNotificationBell } from '../../../../components/Business/BusinessNotificationBell';
import { CorporateGridBackground } from '../../../../components/UI/CorporateGridBackground';

interface DashboardHeaderProps {
    businessName: string;
    selectedDate: string;
    setShowDatePicker: (show: boolean) => void;
    navigate: (path: string) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    businessName,
    selectedDate,
    setShowDatePicker,
    navigate
}) => {
    return (
        <div className="bg-gradient-to-b from-[#0a1628] to-[#0f1e3a] p-4 sticky top-0 z-10 border-b border-blue-900/60 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden shrink-0">
            <CorporateGridBackground />
            <div className="relative z-10 flex justify-between items-center mb-4 gap-2">
                <div className="min-w-0 flex-1">
                    <h1 className="font-sport font-black text-[clamp(14px,4.5vw,26px)] text-orange-500 italic tracking-tighter uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] leading-tight break-words">
                        {businessName}
                    </h1>
                    <div className="text-[clamp(9px,2.5vw,11px)] text-blue-300/80 font-black uppercase tracking-[0.2em] mt-0.5 drop-shadow-sm">
                        Yönetim Paneli
                    </div>
                </div>
                <div className="shrink-0 relative">
                    <BusinessNotificationBell onClick={() => navigate('/business/notifications')} />
                </div>
            </div>

            <button
                onClick={() => setShowDatePicker(true)}
                className="relative z-10 flex items-center w-full bg-gradient-to-b from-slate-800/90 to-slate-900/80 backdrop-blur-md p-3.5 rounded-xl border border-slate-700/60 hover:border-orange-500/50 hover:from-slate-800 hover:to-slate-900 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_20px_rgba(0,0,0,0.3)] group active:scale-[0.98]"
            >
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center mr-3 shrink-0 border border-orange-500/40">
                    <Calendar className="w-4 h-4 text-orange-400 drop-shadow-md" />
                </div>
                <span className="text-white font-bold text-[clamp(13px,3.5vw,15px)] tracking-wide group-hover:text-orange-100 transition-colors drop-shadow-sm">
                    {(() => {
                        const [y, m, d] = selectedDate.split('-').map(Number);
                        const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
                        return `${d} ${months[m - 1]} ${y}`;
                    })()}
                </span>
            </button>
        </div>
    );
};
