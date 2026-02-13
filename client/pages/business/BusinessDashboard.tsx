import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Calendar, Check, X, Clock, Users, LogOut } from 'lucide-react';
import { BusinessNavbar } from '../../components/BusinessNavbar';

export const BusinessDashboard: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSlot, setSelectedSlot] = useState<any>(null); // For modal
    const navigate = useNavigate();

    useEffect(() => {
        fetchDashboard();
    }, [selectedDate]);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const ownerId = localStorage.getItem('ownerId');
            if (!ownerId) return; // Should redirect to login

            const response = await api.get(`/business-owner/dashboard?date=${selectedDate}&ownerId=${ownerId}`);
            setDashboardData(response.data);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    // 🆕 Helper: Check if a slot is in the past
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

    const handleApprove = async (reservationId: string) => {
        try {
            const ownerId = localStorage.getItem('ownerId');
            await api.post(`/business-owner/approve-reservation/${reservationId}`, { ownerId });
            setSelectedSlot(null); // Close modal
            fetchDashboard(); // Refresh data
        } catch (error) {
            console.error('Error approving:', error);
            alert('Onaylama başarısız oldu.');
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
                        onClick={handleLogout}
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
                                // 🆕 Check if this slot is in the past
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
                    <div className="bg-slate-800 w-full max-w-md rounded-2xl p-6 border border-slate-700" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-white">{selectedSlot.time}</h3>
                                <p className="text-slate-400 text-sm">Rezervasyon İstekleri</p>
                            </div>
                            <button onClick={() => setSelectedSlot(null)} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {selectedSlot.reservations.map((res: any) => (
                                <div key={res.id} className={`p-4 rounded-xl border ${res.status === 'APPROVED' ? 'bg-green-900/20 border-green-500' : 'bg-slate-700/50 border-slate-600'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center">
                                            <Users className="w-4 h-4 text-slate-400 mr-2" />
                                            <span className="font-bold">{res.team?.name || 'Bilinmeyen Takım'}</span>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded font-bold ${res.status === 'APPROVED' ? 'bg-green-500 text-white' :
                                            res.status === 'PENDING' ? 'bg-orange-500 text-white' : 'bg-slate-500 text-white'
                                            }`}>
                                            {res.status}
                                        </span>
                                    </div>

                                    {/* Action Buttons for Pending */}
                                    {res.status === 'PENDING' && (
                                        <button
                                            onClick={() => handleApprove(res.id)}
                                            className="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-bold text-sm transition-colors flex items-center justify-center"
                                        >
                                            <Check className="w-4 h-4 mr-2" />
                                            Bu İsteği Onayla
                                        </button>
                                    )}
                                </div>
                            ))}

                            {selectedSlot.reservations.length === 0 && (
                                <div className="text-center text-slate-500 py-8">
                                    Bu saat için istek bulunmuyor.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Business Navbar */}
            <BusinessNavbar />
        </div>
    );
};
