import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Save, Building2 } from 'lucide-react';
import { BusinessNavbar } from '../../components/BusinessNavbar';

export const BusinessSettings: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        openTime: '',
        closeTime: '',
    });

    useEffect(() => {
        fetchBusinessData();
    }, []);

    const fetchBusinessData = async () => {
        try {
            const ownerId = localStorage.getItem('ownerId');
            if (!ownerId) {
                navigate('/business/login');
                return;
            }

            // Get business owner to find businessId
            const ownerResponse = await api.get(`/business-owner/${ownerId}`);
            const businessId = ownerResponse.data.business?.id;

            if (!businessId) {
                alert('İşletme bulunamadı');
                return;
            }

            // Get business data
            const businessResponse = await api.get(`/businesses/${businessId}`);
            const business = businessResponse.data;

            setFormData({
                name: business.name || '',
                phone: business.phone || '',
                address: business.address || '',
                openTime: business.openTime || '',
                closeTime: business.closeTime || '',
            });

            setLoading(false);
        } catch (error) {
            console.error('Error fetching business data:', error);
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSuccess(false);

        try {
            const ownerId = localStorage.getItem('ownerId');
            const ownerResponse = await api.get(`/business-owner/${ownerId}`);
            const businessId = ownerResponse.data.business?.id;

            await api.patch(`/businesses/${businessId}`, formData);

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('Error updating business:', error);
            alert('Güncelleme başarısız oldu.');
        } finally {
            setSaving(false);
        }
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
            <div className="bg-slate-800 p-4 sticky top-0 z-10 border-b border-slate-700 shadow-lg">
                <div className="flex items-center gap-3">
                    <Building2 className="w-6 h-6 text-orange-500" />
                    <div>
                        <h1 className="font-sport font-bold text-xl text-white">İşletme Ayarları</h1>
                        <p className="text-xs text-slate-400">Bilgilerinizi güncelleyin</p>
                    </div>
                </div>
            </div>

            {/* Success Message */}
            {success && (
                <div className="mx-4 mt-4 p-4 bg-green-600/20 border border-green-500 rounded-xl text-green-500 font-bold text-center">
                    ✓ Bilgileriniz başarıyla güncellendi!
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-6">
                {/* Basic Info */}
                <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                    <h2 className="text-lg font-bold mb-4 text-orange-500">Temel Bilgiler</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold mb-2 text-slate-300">
                                İşletme Adı
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-2 text-slate-300">
                                Telefon
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-2 text-slate-300">
                                Adres
                            </label>
                            <textarea
                                value={formData.address}
                                onChange={(e) => handleChange('address', e.target.value)}
                                rows={3}
                                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Working Hours */}
                <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                    <h2 className="text-lg font-bold mb-4 text-orange-500">Çalışma Saatleri</h2>

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

                {/* Save Button */}
                <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white py-4 rounded-xl font-black text-lg uppercase tracking-wider transition-colors shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2"
                >
                    <Save className="w-5 h-5" />
                    {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
            </form>

            {/* Business Navbar */}
            <BusinessNavbar />
        </div>
    );
};
