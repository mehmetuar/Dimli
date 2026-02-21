import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Save, Building2, ArrowLeft, MapPin, X, AlertTriangle } from 'lucide-react';
import { BusinessNavbar } from '../../components/BusinessNavbar';
import { LocationSelectionModal } from '../../components/LocationSelectionModal';

export const BusinessInfoSettings: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    // Modal states
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [locationModalStep, setLocationModalStep] = useState<'CITY' | 'DISTRICT'>('CITY');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        city: '',
        district: '',
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
                city: business.city || '',
                district: business.district || '',
            });

            setLoading(false);
        } catch (error) {
            console.error('Error fetching business data:', error);
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setShowConfirmModal(true);
    };

    const handleConfirmSave = async () => {
        setShowConfirmModal(false);
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
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                    <span className="font-sport font-bold text-xl italic animate-pulse">YÜKLENİYOR...</span>
                </div>
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
                    <h1 className="font-sport font-bold text-xl text-white">İşletme Bilgileri</h1>
                    <p className="text-xs text-slate-400">Temel bilgilerinizi güncelleyin</p>
                </div>
            </div>

            {/* Success Message */}
            {success && (
                <div className="mx-4 mt-4 p-4 bg-green-600/20 border border-green-500 rounded-xl text-green-500 font-bold text-center animate-bounce">
                    ✓ Bilgileriniz başarıyla güncellendi!
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-6">
                <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-2 text-slate-300 uppercase italic">
                            İşletme Adı
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-all font-medium"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-2 text-slate-300 uppercase italic">
                            Telefon
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                            className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-all font-medium font-mono"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-400 font-bold uppercase italic ml-1">Şehir *</label>
                            <button
                                type="button"
                                onClick={() => {
                                    setLocationModalStep('CITY');
                                    setIsLocationModalOpen(true);
                                }}
                                className="w-full bg-slate-900 border border-slate-700 text-white p-4 rounded-xl text-left hover:border-orange-500 transition-all font-medium"
                            >
                                {formData.city || "Şehir Seç..."}
                            </button>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-400 font-bold uppercase italic ml-1">İlçe *</label>
                            <button
                                type="button"
                                disabled={!formData.city}
                                onClick={() => {
                                    setLocationModalStep('DISTRICT');
                                    setIsLocationModalOpen(true);
                                }}
                                className={`w-full border p-4 rounded-xl text-left transition-all font-medium ${!formData.city
                                    ? 'bg-slate-950 border-slate-800 text-slate-700 cursor-not-allowed'
                                    : 'bg-slate-900 border-slate-700 text-white hover:border-orange-500'
                                    }`}
                            >
                                {formData.district || "İlçe Seç..."}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-2 text-slate-300 uppercase italic">
                            Adres
                        </label>
                        <textarea
                            value={formData.address}
                            onChange={(e) => handleChange('address', e.target.value)}
                            rows={3}
                            className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-all font-medium resize-none"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white py-5 rounded-2xl font-black text-lg uppercase tracking-wider transition-all shadow-xl shadow-orange-600/20 flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                    <Save className="w-6 h-6" />
                    {saving ? 'KAYDEDİLİYOR...' : 'DEĞİŞİKLİKLERİ KAYDET'}
                </button>
            </form>

            <BusinessNavbar />

            {/* Location Selection Modal */}
            <LocationSelectionModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
                onSelect={(city, dist) => {
                    setFormData(prev => ({ ...prev, city, district: dist }));
                }}
                initialCity={formData.city}
                initialDistrict={formData.district}
                initialStep={locationModalStep}
            />

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setShowConfirmModal(false)}>
                    <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-600"></div>

                        <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-orange-500" />
                        </div>

                        <h3 className="text-2xl font-black text-white mb-2 text-center italic uppercase">Emin misiniz?</h3>
                        <p className="text-slate-400 mb-8 text-center font-medium">
                            İşletme bilgileriniz güncellenecektir. Bu değişikliği onaylıyor musunuz?
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleConfirmSave}
                                className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl transition-all shadow-lg shadow-orange-600/20 uppercase tracking-wider active:scale-[0.98]"
                            >
                                EVET, KAYDET
                            </button>
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all uppercase tracking-wider"
                            >
                                İPTAL
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
