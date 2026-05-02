import React from 'react';
import { Calendar } from 'lucide-react';
import { BusinessNotificationBell } from '../../../../components/Business/BusinessNotificationBell';

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
        <div className="bg-gradient-to-b from-[#0a1628] to-[#0f1e3a] backdrop-blur-md p-4 sticky top-0 z-10 border-b border-blue-900/60 shadow-2xl">
            <div className="flex justify-between items-center mb-4 gap-2">
                <div className="min-w-0 flex-1">
                    <h1 className="font-sport font-black text-[clamp(13px,4.2vw,24px)] text-orange-500 italic tracking-tighter uppercase drop-shadow-sm leading-tight break-words">
                        {businessName}
                    </h1>
                    <div className="text-[clamp(8px,2.2vw,10px)] text-blue-300/60 font-bold uppercase tracking-widest mt-0.5">
                        Yönetim Paneli
                    </div>
                </div>
                <div className="shrink-0">
                    <BusinessNotificationBell onClick={() => navigate('/business/notifications')} />
                </div>
            </div>

            <button
                onClick={() => setShowDatePicker(true)}
                className="flex items-center w-full bg-[#060e1c] p-3 rounded-xl border border-blue-900/80 hover:border-orange-500 transition-all group"
            >
                <Calendar className="w-5 h-5 text-orange-500 mr-3 shrink-0" />
                <span className="text-white font-black text-sm uppercase tracking-wide">
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
