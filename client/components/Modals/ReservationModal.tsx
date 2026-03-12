import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, DollarSign, Users } from 'lucide-react';
import api from '../../services/api';

interface ReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    pitch: any;
    business: any;
    selectedDate: string;
    selectedStartTime: string;
    teamId: string;
    onSuccess: () => void;
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
    isOpen,
    onClose,
    pitch,
    business,
    selectedDate,
    selectedStartTime,
    teamId,
    onSuccess
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleReserve = async () => {
        setLoading(true);
        setError('');

        try {
            // Create slot time
            const [h, m] = (selectedStartTime || '00:00').split(':').map(Number);
            const slotTime = new Date(selectedDate);
            slotTime.setHours(h, m || 0, 0, 0);

            await api.post('/reservations', {
                pitchId: pitch.id,
                teamId: teamId,
                slotTime: slotTime.toISOString(),
                type: 'DIRECT'
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Reservation error:', err);
            setError(err.response?.data?.message || 'Rezervasyon oluşturulamadı.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatTime = (time: string) => {
        return time;
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-800 w-full max-w-md rounded-2xl p-6 border border-slate-700" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-2xl font-black text-white">Rezervasyon Oluştur</h3>
                        <p className="text-slate-400 text-sm mt-1">Onay bekleyecek</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-4 text-sm font-bold">
                        {error}
                    </div>
                )}

                {/* Details */}
                <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl">
                        <MapPin className="w-5 h-5 text-orange-500" />
                        <div>
                            <p className="text-xs text-slate-400">İşletme & Saha</p>
                            <p className="font-bold text-white">{business.name}</p>
                            <p className="text-sm text-slate-300">{pitch.name}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl">
                        <Calendar className="w-5 h-5 text-orange-500" />
                        <div>
                            <p className="text-xs text-slate-400">Tarih</p>
                            <p className="font-bold text-white">{formatDate(selectedDate)}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl">
                        <Clock className="w-5 h-5 text-orange-500" />
                        <div>
                            <p className="text-xs text-slate-400">Saat</p>
                            <p className="font-bold text-white">{formatTime(selectedStartTime)}</p>
                        </div>
                    </div>

                    {pitch.pricePerHour && (
                        <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl">
                            <DollarSign className="w-5 h-5 text-orange-500" />
                            <div>
                                <p className="text-xs text-slate-400">Saatlik Ücret</p>
                                <p className="font-bold text-white">{pitch.pricePerHour} ₺</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Box */}
                <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-xl mb-6">
                    <p className="text-blue-400 text-sm">
                        <strong>Bilgi:</strong> Rezervasyonunuz işletme onayı bekleyecek.
                        Onaylandığında bildirim alacaksınız.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold transition-colors"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleReserve}
                        disabled={loading}
                        className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white py-3 rounded-xl font-bold transition-colors"
                    >
                        {loading ? 'Gönderiliyor...' : 'Rezervasyon Yap'}
                    </button>
                </div>
            </div>
        </div>
    );
};
