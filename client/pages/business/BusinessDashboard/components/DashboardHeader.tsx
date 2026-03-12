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
        <div className="bg-slate-900/80 backdrop-blur-md p-4 sticky top-0 z-10 border-b border-slate-800 shadow-xl">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="font-sport font-black text-2xl text-orange-500 italic tracking-tighter uppercase">{businessName}</h1>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Yönetim Paneli</div>
                </div>
                <BusinessNotificationBell onClick={() => navigate('/business/notifications')} />
            </div>

            <button
                onClick={() => setShowDatePicker(true)}
                className="flex items-center w-full bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-orange-500 transition-all group"
            >
                <Calendar className="w-5 h-5 text-slate-500 mr-3 group-hover:text-orange-500 transition-colors shrink-0" />
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
