import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, ChevronRight, Goal } from 'lucide-react';
import { BusinessNavbar } from '../../components/BusinessNavbar';

export const BusinessPitchList: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [pitches, setPitches] = useState<any[]>([]);

    useEffect(() => {
        fetchPitches();
    }, []);

    const fetchPitches = async () => {
        try {
            const ownerId = localStorage.getItem('ownerId');
            if (!ownerId) {
                navigate('/business/login');
                return;
            }

            const ownerResponse = await api.get(`/business-owner/${ownerId}`);
            const businessId = ownerResponse.data.business?.id;

            if (!businessId) {
                alert('İşletme bulunamadı');
                return;
            }

            const pitchesResponse = await api.get(`/pitches/business/${businessId}`);
            setPitches(pitchesResponse.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching pitches:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
                Yükleniyor...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-24">
            {/* Header */}
            <div className="bg-slate-800 p-4 sticky top-0 z-10 border-b border-slate-700 shadow-lg flex items-center gap-3">
                <button onClick={() => navigate('/business/settings')} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                    <h1 className="font-sport font-bold text-xl text-white">Saha Ayarları</h1>
                    <p className="text-xs text-slate-400">Düzenlemek istediğiniz sahayı seçin</p>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {pitches.map((pitch) => (
                    <button
                        key={pitch.id}
                        onClick={() => navigate(`/business/settings/pitches/${pitch.id}`)}
                        className="w-full bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center justify-between hover:bg-slate-700 transition-colors group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                                <Goal className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-bold text-white group-hover:text-orange-500 transition-colors">{pitch.name}</h3>
                                <div className="text-sm text-slate-400">
                                    {pitch.type === 'INDOOR' ? 'Kapalı Saha' : 'Açık Saha'} • {pitch.pricePerHour} TL/Saat
                                </div>
                            </div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-slate-500 group-hover:text-white transition-colors" />
                    </button>
                ))}
            </div>

            <BusinessNavbar />
        </div>
    );
};
