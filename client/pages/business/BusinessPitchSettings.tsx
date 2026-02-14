import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { Save, ArrowLeft, Clock, DollarSign, ListChecks } from 'lucide-react';
import { BusinessNavbar } from '../../components/BusinessNavbar';

const FACILITIES_LIST = [
    'Aydınlatma',
    'Duş',
    'Soyunma Odası',
    'Otopark',
    'Kafeterya',
    'WiFi',
    'Tribün',
    'Yelek',
    'Eldiven',
    'Krampon Kiralama',
    'Su Satışı',
    'Servis'
];

export const BusinessPitchSettings: React.FC = () => {
    const { pitchId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        pricePerHour: '',
        openTime: '',
        closeTime: '',
        facilities: [] as string[]
    });

    useEffect(() => {
        fetchPitchData();
    }, [pitchId]);

    const fetchPitchData = async () => {
        try {
            const response = await api.get(`/pitches/${pitchId}`);
            const pitch = response.data;

            setFormData({
                name: pitch.name || '',
                pricePerHour: pitch.pricePerHour?.toString() || '',
                openTime: pitch.openTime || '',
                closeTime: pitch.closeTime || '',
                facilities: pitch.facilities || []
            });

            setLoading(false);
        } catch (error) {
            console.error('Error fetching pitch data:', error);
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSuccess(false);

        try {
            await api.patch(`/pitches/${pitchId}`, {
                ...formData,
                pricePerHour: parseFloat(formData.pricePerHour)
            });

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('Error updating pitch:', error);
            alert('Güncelleme başarısız oldu.');
        } finally {
            setSaving(false);
        }
    };

    const handleFacilityToggle = (facility: string) => {
        setFormData(prev => {
            const exists = prev.facilities.includes(facility);
            if (exists) {
                return { ...prev, facilities: prev.facilities.filter(f => f !== facility) };
            } else {
                return { ...prev, facilities: [...prev.facilities, facility] };
            }
        });
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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
                <button onClick={() => navigate('/business/settings/pitches')} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                    <h1 className="font-sport font-bold text-xl text-white">{formData.name}</h1>
                    <p className="text-xs text-slate-400">Saha ayarlarını düzenle</p>
                </div>
            </div>

            {/* Success Message */}
            {success && (
                <div className="mx-4 mt-4 p-4 bg-green-600/20 border border-green-500 rounded-xl text-green-500 font-bold text-center">
                    ✓ Ayarlar başarıyla güncellendi!
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-4 space-y-6">
                {/* Price & Hours */}
                <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-4">
                    <h2 className="text-lg font-bold text-orange-500 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Genel Ayarlar
                    </h2>

                    <div>
                        <label className="block text-sm font-bold mb-2 text-slate-300">
                            Saatlik Ücret (TL)
                        </label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                            <input
                                type="number"
                                value={formData.pricePerHour}
                                onChange={(e) => handleChange('pricePerHour', e.target.value)}
                                className="w-full pl-10 p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-2 text-slate-300">
                                Açılış Saati
                            </label>
                            <input
                                type="time"
                                value={formData.openTime}
                                onChange={(e) => handleChange('openTime', e.target.value)}
                                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2 text-slate-300">
                                Kapanış Saati
                            </label>
                            <input
                                type="time"
                                value={formData.closeTime}
                                onChange={(e) => handleChange('closeTime', e.target.value)}
                                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Facilities */}
                <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                    <h2 className="text-lg font-bold text-orange-500 mb-4 flex items-center gap-2">
                        <ListChecks className="w-5 h-5" />
                        Saha İmkanları
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        {FACILITIES_LIST.map((facility) => {
                            const isSelected = formData.facilities.includes(facility);
                            return (
                                <button
                                    key={facility}
                                    type="button"
                                    onClick={() => handleFacilityToggle(facility)}
                                    className={`p-3 rounded-xl border text-sm font-bold transition-all ${isSelected
                                        ? 'bg-orange-500/20 border-orange-500 text-orange-500'
                                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                                        }`}
                                >
                                    {facility}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white py-4 rounded-xl font-black text-lg uppercase tracking-wider transition-colors shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2"
                >
                    <Save className="w-5 h-5" />
                    {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
            </form>

            <BusinessNavbar />
        </div>
    );
};
