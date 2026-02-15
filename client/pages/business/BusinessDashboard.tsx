import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Calendar, Check, X, Clock, Users, LogOut, Phone, MessageSquare } from 'lucide-react';
import { BusinessNavbar } from '../../components/BusinessNavbar';
import { ConfirmModal } from '../../components/ConfirmModal';

export const BusinessDashboard: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSlot, setSelectedSlot] = useState<any>(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [note, setNote] = useState('');
    const [actionType, setActionType] = useState<'APPROVE' | 'SEND_NOTE' | null>(null);
    const [targetReservationId, setTargetReservationId] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchDashboard();
    }, [selectedDate]);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const ownerId = localStorage.getItem('ownerId');
            if (!ownerId) return;

            const response = await api.get(`/business-owner/dashboard?date=${selectedDate}&ownerId=${ownerId}`);
            setDashboardData(response.data);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const isPastSlot = (time: string, date: string): boolean => {
        const now = new Date();
        const [hour] = time.split(':').map(Number);
        const slotDate = new Date(date);
        slotDate.setHours(hour, 0, 0, 0);
        return slotDate < now;
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('ownerId');
        navigate('/business/login');
    };

    const openActionModal = (type: 'APPROVE' | 'SEND_NOTE', reservationId: string) => {
        setActionType(type);
        setTargetReservationId(reservationId);
        setNote('');
    };

    const handleTransaction = async () => {
        if (!targetReservationId || !actionType) return;

        try {
            const ownerId = localStorage.getItem('ownerId');
            if (actionType === 'APPROVE') {
                await api.post(`/business-owner/approve-reservation/${targetReservationId}`, {
                    ownerId,
                    note
                });
                setSelectedSlot(null); // Close slot detail modal
                fetchDashboard(); // Refresh data
            } else if (actionType === 'SEND_NOTE') {
                await api.post(`/business-owner/reservation/${targetReservationId}/note`, {
                    ownerId,
                    note
                });
                alert('Mesajınız takımlara iletildi.');
            }

            // Close Action Modal
            setTargetReservationId(null);
            setActionType(null);
            setNote('');
        } catch (error: any) {
            console.error('Transaction error:', error);
            const msg = error.response?.data?.message || 'İşlem başarısız oldu.';
            alert(`HATA: ${msg}`);
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Yükleniyor...</div>;
    if (!dashboardData) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Veri bulunamadı.</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-20">
            {/* Header */}
            <div className="bg-slate-800 p-4 sticky top-0 z-10 border-b border-slate-700 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="font-sport font-bold text-xl text-orange-500">{dashboardData.businessName}</h1>
                        <div className="text-xs text-slate-400">Yönetim Paneli</div>
                    </div>
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                        title="Çıkış Yap"
                    >
                        <LogOut className="w-5 h-5 text-orange-500" />
                    </button>
                </div>

                {/* Date Picker */}
                <div className="flex items-center bg-slate-900 p-2 rounded-lg border border-slate-700">
                    <Calendar className="w-5 h-5 text-slate-400 mr-2" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-transparent text-white w-full focus:outline-none font-bold"
                    />
                </div>
            </div>

            {/* Pitches & Slots */}
            <div className="p-4 space-y-8">
                {dashboardData.pitches.map((pitch: any) => (
                    <div key={pitch.pitchId}>
                        <h2 className="text-lg font-bold mb-3 pl-2 border-l-4 border-orange-500">{pitch.pitchName}</h2>
                        <div className="grid grid-cols-4 gap-3">
                            {pitch.slots.map((slot: any) => {
                                const isPast = isPastSlot(slot.time, selectedDate);

                                return (
                                    <button
                                        key={slot.time}
                                        onClick={() => {
                                            if (slot.status !== 'EMPTY' && !isPast) {
                                                setSelectedSlot(slot);
                                            }
                                        }}
                                        disabled={isPast}
                                        className={`
                                            p-3 rounded-xl flex flex-col items-center justify-center border-2 transition-all
                                            ${isPast ? 'bg-slate-800/30 border-slate-700 text-slate-600 opacity-50 cursor-not-allowed' : ''}
                                            ${!isPast && slot.status === 'EMPTY' ? 'bg-slate-800 border-slate-700 text-slate-400' : ''}
                                            ${!isPast && slot.status === 'PENDING' ? 'bg-orange-900/20 border-orange-500 text-orange-500 animate-pulse' : ''}
                                            ${!isPast && slot.status === 'FULL' ? 'bg-red-900/20 border-red-500 text-red-500' : ''}
                                        `}
                                    >
                                        <span className="text-lg font-black">{slot.time}</span>
                                        <span className="text-[10px] font-bold uppercase mt-1">
                                            {isPast ? 'GEÇTİ' :
                                                slot.status === 'EMPTY' ? 'BOŞ' :
                                                    slot.status === 'PENDING' ? 'ONAY BEKLİYOR' : 'DOLU'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal for Slot Details */}
            {selectedSlot && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedSlot(null)}>
                    <div className="bg-slate-800 w-full max-w-md rounded-2xl p-6 border border-slate-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-white">{selectedSlot.time}</h3>
                                <p className="text-slate-400 text-sm">
                                    {selectedSlot.status === 'FULL' ? 'Kesinleşmiş Maç' : 'Rezervasyon İstekleri'}
                                </p>
                            </div>
                            <button onClick={() => setSelectedSlot(null)} className="p-2 bg-slate-700/50 rounded-full hover:bg-slate-600 text-slate-300 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {selectedSlot.reservations.length > 0 ? (
                                selectedSlot.reservations.map((res: any) => (
                                    <div key={res.id} className={`p-5 rounded-2xl border transition-all ${res.status === 'APPROVED'
                                        ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-green-500/30 ring-1 ring-green-500/20'
                                        : res.status === 'REJECTED'
                                            ? 'bg-slate-800/50 border-red-900/30 opacity-75'
                                            : 'bg-slate-800 border-slate-700'
                                        }`}>

                                        {/* TEAM 1 (Requester) */}
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="w-14 h-14 bg-slate-900 rounded-full border-2 border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                                                {res.team?.logoUrl ? (
                                                    <img src={res.team.logoUrl} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Users className="w-6 h-6 text-slate-500" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-sport font-black text-lg text-white italic truncate">{res.team?.name || 'Bilinmeyen Takım'}</div>
                                                <div className="bg-slate-900/50 rounded-lg p-2 mt-1 border border-slate-700/50">
                                                    <div className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Kaptan</div>
                                                    <div className="text-sm font-bold text-slate-200 truncate">{res.team?.captain?.full_name || 'Bilinmiyor'}</div>
                                                    <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                                        <Phone className="w-3 h-3" />
                                                        {res.team?.captain?.phone || 'Tel Yok'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* VS Badge if Opponent Exists */}
                                        {res.opponentTeam && (
                                            <div className="relative flex items-center justify-center py-2 mb-4">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t border-slate-700/50"></div>
                                                </div>
                                                <div className="relative bg-slate-800 px-3 text-slate-500 font-black italic">VS</div>
                                            </div>
                                        )}

                                        {/* TEAM 2 (Opponent) - If exists */}
                                        {res.opponentTeam && (
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="w-14 h-14 bg-slate-900 rounded-full border-2 border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                                                    {res.opponentTeam?.logoUrl ? (
                                                        <img src={res.opponentTeam.logoUrl} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Users className="w-6 h-6 text-slate-500" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-sport font-black text-lg text-white italic truncate">{res.opponentTeam?.name}</div>
                                                    <div className="bg-slate-900/50 rounded-lg p-2 mt-1 border border-slate-700/50">
                                                        <div className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Kaptan</div>
                                                        <div className="text-sm font-bold text-slate-200 truncate">{res.opponentTeam?.captain?.full_name || 'Bilinmiyor'}</div>
                                                        <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                                            <Phone className="w-3 h-3" />
                                                            {res.opponentTeam?.captain?.phone || 'Tel Yok'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* STATUS & ACTIONS */}
                                        <div className="mt-4 pt-4 border-t border-slate-700/50">
                                            {res.status === 'APPROVED' ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-center gap-2 text-green-400 font-bold bg-green-500/10 py-3 rounded-xl border border-green-500/20">
                                                        <Check className="w-5 h-5" />
                                                        <span>Kesinleşmiş Rezervasyon</span>
                                                    </div>
                                                    <button
                                                        onClick={() => openActionModal('SEND_NOTE', res.id)}
                                                        className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <MessageSquare className="w-4 h-4 text-orange-400" />
                                                        Takımlara Not Gönder
                                                    </button>
                                                </div>
                                            ) : res.status === 'REJECTED' ? (
                                                <div className="flex items-center justify-center gap-2 text-red-500 font-bold bg-red-900/10 py-3 rounded-xl border border-red-500/20">
                                                    <X className="w-5 h-5" />
                                                    <span>Reddedildi (Pasif)</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => openActionModal('APPROVE', res.id)}
                                                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 group"
                                                >
                                                    <div className="bg-white/20 p-1 rounded-full group-hover:scale-110 transition-transform">
                                                        <Check className="w-4 h-4" />
                                                    </div>
                                                    Bu İsteği Onayla
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-slate-500 py-12 flex flex-col items-center bg-slate-800/50 rounded-2xl border border-dashed border-slate-700">
                                    <Clock className="w-12 h-12 text-slate-700 mb-3" />
                                    <p>Bu saat için henüz bir istek bulunmuyor.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Logout Confirmation Modal */}
            <ConfirmModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                title="Çıkış Yap"
                message="Hesabınızdan çıkış yapmak istediğinize emin misiniz?"
                confirmText="Çıkış Yap"
                cancelText="İptal"
                isDangerous={false}
            />

            {/* General Action Modal (Approve or Note) */}
            {targetReservationId && actionType && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
                    <div className="bg-slate-800 w-full max-w-sm rounded-3xl border border-slate-700 p-6 animate-scale-in">
                        <h3 className="text-xl font-bold text-white mb-2 text-center">
                            {actionType === 'APPROVE' ? 'Rezervasyonu Onayla' : 'Takımlara Not Gönder'}
                        </h3>

                        <p className="text-slate-400 text-sm text-center mb-4">
                            {actionType === 'APPROVE'
                                ? 'Onay mesajıyla birlikte takımlara bir not iletmek ister misiniz?'
                                : 'Maç sahiplerinin göreceği bir not girin.'}
                        </p>

                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Örn: Lütfen 15 dk erken gelin (Opsiyonel)"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-orange-500 min-h-[100px] mb-4"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setTargetReservationId(null);
                                    setActionType(null);
                                    setNote('');
                                }}
                                className="flex-1 bg-slate-700 text-white font-bold py-3 rounded-xl hover:bg-slate-600 transition-colors"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleTransaction}
                                className="flex-1 bg-orange-600 text-white font-bold py-3 rounded-xl hover:bg-orange-500 transition-colors shadow-lg shadow-orange-600/20"
                            >
                                {actionType === 'APPROVE' ? 'Onayla ve Gönder' : 'Gönder'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Business Navbar */}
            <BusinessNavbar />
        </div>
    );
};
