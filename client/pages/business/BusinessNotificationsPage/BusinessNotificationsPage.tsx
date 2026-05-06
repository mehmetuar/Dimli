import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Calendar, Clock, ChevronRight } from 'lucide-react';
import api from '../../../services/api';
import { BusinessNavbar } from '../../../components/Business/BusinessNavbar';
import { BusinessLoadingSpinner } from '../../../components/Business/BusinessLoadingSpinner';

export const BusinessNotificationsPage: React.FC = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const ownerId = localStorage.getItem('ownerId');
            if (!ownerId) return;

            const response = await api.get(`/business-owner/notifications?ownerId=${ownerId}`);
            setNotifications(response.data);
        } catch (error) {
            console.error('Failed to fetch business notifications:', error);
        } finally {
            setLoading(false);
        }
    };


    const handleNotificationClick = (notif: any) => {
        if (notif.metadata?.date) {
            // For now, let's navigate to dashboard with that date
            // The dashboard would need to handle the date from URL or state
            navigate('/business/dashboard', { state: { selectedDate: notif.metadata.date } });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white pb-32">
            {/* Header */}
            <div className="bg-slate-800 p-4 sticky top-0 z-20 border-b border-slate-700 shadow-lg flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-slate-700 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="font-sport font-bold text-xl text-white">Bildirimler</h1>
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-black">İşletme Hareketleri</p>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {loading ? (
                    <div className="py-40 flex justify-center w-full">
                        <BusinessLoadingSpinner />
                    </div>
                ) : notifications.length > 0 ? (
                    notifications.map((notif) => (
                        <button
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className="w-full p-5 rounded-[2rem] border bg-slate-800/40 border-slate-700/50 text-left transition-all relative group flex gap-4 hover:border-orange-500/40 active:scale-[0.98]"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center shrink-0 shadow-inner">
                                {notif.type === 'RESERVATION_REQUEST' ? <Calendar className="w-7 h-7" /> : <Bell className="w-7 h-7" />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="text-base font-black text-white leading-tight">
                                        {notif.title}
                                    </h4>
                                    <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap ml-2">
                                        {new Date(notif.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">
                                    {notif.message}
                                </p>

                            </div>

                            <ChevronRight className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 transition-all group-hover:text-orange-500 group-hover:translate-x-1" />
                        </button>
                    ))
                ) : (
                    <div className="py-40 flex flex-col items-center justify-center text-center px-10">
                        <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-slate-700">
                            <Bell className="w-12 h-12 text-slate-700" />
                        </div>
                        <h4 className="text-xl font-bold text-slate-400">Henüz bildirim yok</h4>
                        <p className="text-sm text-slate-600 mt-2">Maç istekleri ve önemli güncellemeler burada görünecek.</p>
                    </div>
                )}
            </div>

            <BusinessNavbar />
        </div>
    );
};
