import React, { useState, useEffect } from 'react';
import { X, Bell, Calendar, Clock, ChevronRight, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { ConfirmModal } from './ConfirmModal';

interface BusinessNotificationsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onNotificationClick: (date: string, reservationId: string) => void;
}

export const BusinessNotificationsPanel: React.FC<BusinessNotificationsPanelProps> = ({ isOpen, onClose, onNotificationClick }) => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDangerous?: boolean;
        confirmText?: string;
        cancelText?: string;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

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

    const markAsRead = async (id: string) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div
                className="bg-slate-900 w-full max-h-[85vh] rounded-t-[2.5rem] border-t border-slate-700 flex flex-col shadow-2xl animate-slide-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Drag Handle */}
                <div className="flex justify-center py-3">
                    <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-6 pb-4 flex items-center justify-between border-b border-slate-800">
                    <div>
                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                            <Bell className="w-6 h-6 text-orange-500" />
                            Bildirimler
                        </h3>
                        <p className="text-sm text-slate-500 mt-0.5 font-bold uppercase tracking-wider">İşletme Hareketleri</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center space-y-4">
                            <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                            <span className="text-slate-500 font-bold italic">Bildirimler yükleniyor...</span>
                        </div>
                    ) : notifications.length > 0 ? (
                        notifications.map((notif) => (
                            <button
                                key={notif.id}
                                onClick={() => {
                                    if (!notif.read) markAsRead(notif.id);
                                    if (notif.metadata?.reservationId) {
                                        // Handle navigation to the specific slot
                                        // For now, it will just jump to that date if possible or we'll implement it
                                        // onNotificationClick(notif.metadata.date, notif.metadata.reservationId);
                                    }
                                }}
                                className={`
                                    w-full p-4 rounded-3xl border text-left transition-all relative group flex gap-4
                                    ${notif.read ? 'bg-slate-900 border-slate-800 opacity-70' : 'bg-slate-800/40 border-orange-500/20 shadow-lg shadow-orange-500/5 ring-1 ring-orange-500/10'}
                                    hover:border-orange-500/40 active:scale-[0.98]
                                `}
                            >
                                <div className={`
                                    w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border
                                    ${notif.read ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-orange-500/10 border-orange-500/20 text-orange-500 shadow-inner'}
                                `}>
                                    {notif.type === 'RESERVATION_REQUEST' ? <Calendar className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`text-[15px] font-black leading-tight ${notif.read ? 'text-slate-300' : 'text-white'}`}>
                                            {notif.title}
                                        </h4>
                                        <span className="text-[10px] text-slate-600 font-bold whitespace-nowrap ml-2">
                                            {new Date(notif.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className={`text-sm leading-relaxed ${notif.read ? 'text-slate-500' : 'text-slate-400'}`}>
                                        {notif.message}
                                    </p>

                                    {!notif.read && (
                                        <div className="mt-3 flex items-center gap-2">
                                            <div className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                                                YENİ
                                            </div>
                                        </div>
                                    )}

                                </div>

                                <ChevronRight className={`w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 ${notif.read ? 'text-slate-700' : 'text-orange-500/50 group-hover:text-orange-500'} transition-all group-hover:translate-x-1`} />
                            </button>
                        ))
                    ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-center px-10">
                            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-slate-700">
                                <Bell className="w-10 h-10 text-slate-700" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-400">Henüz bildirim yok</h4>
                            <p className="text-sm text-slate-600 mt-2">Maç istekleri ve önemli güncellemeler burada görünecek.</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-950/50 border-t border-slate-800">
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl text-sm uppercase tracking-widest"
                    >
                        KAPAT
                    </button>
                </div>
            </div>

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDangerous={confirmModal.isDangerous}
                confirmText={confirmModal.confirmText}
                cancelText={confirmModal.cancelText || "Vazgeç"}
            />
        </div>
    );
};
