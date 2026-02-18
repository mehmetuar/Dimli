import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { Save, ArrowLeft, Clock, TurkishLira, ListChecks, Plus, Trash2, X } from 'lucide-react';
import { BusinessNavbar } from '../../components/BusinessNavbar';
import { DEFAULT_FACILITIES } from '../../constants';


export const BusinessPitchSettings: React.FC = () => {
    const { pitchId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [newFacility, setNewFacility] = useState('');
    const [showFacilityInput, setShowFacilityInput] = useState(false);

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

    const handleDeletePitch = async () => {
        setDeleting(true);
        try {
            await api.delete(`/pitches/${pitchId}`);
            navigate('/business/settings/pitches');
        } catch (error) {
            console.error('Error deleting pitch:', error);
            alert('Saha silinirken bir hata oluştu.');
            setDeleting(false);
            setShowDeleteModal(false);
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

    const handleAddFacility = () => {
        if (newFacility.trim()) {
            const formatted = newFacility.trim();
            if (!formData.facilities.includes(formatted)) {
                setFormData(prev => ({
                    ...prev,
                    facilities: [...prev.facilities, formatted]
                }));
            }
            setNewFacility('');
            setShowFacilityInput(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Combine default facilities with any custom ones present in formData
    const allFacilities = Array.from(new Set([...DEFAULT_FACILITIES, ...formData.facilities]));

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
                Yükleniyor...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-24 relative">
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
                            <TurkishLira className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
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
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-orange-500 flex items-center gap-2">
                            <ListChecks className="w-5 h-5" />
                            Saha İmkanları
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        {allFacilities.map((facility) => {
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

                    {showFacilityInput ? (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newFacility}
                                onChange={(e) => setNewFacility(e.target.value)}
                                placeholder="Özellik adı..."
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 text-white focus:outline-none focus:border-orange-500"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={handleAddFacility}
                                className="bg-green-600 hover:bg-green-500 text-white px-3 rounded-lg flex items-center gap-1 font-bold text-sm"
                            >
                                Ekle
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowFacilityInput(false)}
                                className="bg-slate-700 hover:bg-slate-600 text-white px-3 rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowFacilityInput(true)}
                            className="w-full py-3 bg-slate-900 border border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white hover:border-slate-400 transition-colors flex items-center justify-center gap-2 font-bold text-sm"
                        >
                            <Plus className="w-4 h-4" /> Yeni İmkan Ekle
                        </button>
                    )}
                </div>

                <div className="pt-4 flex flex-col gap-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white py-4 rounded-xl font-black text-lg uppercase tracking-wider transition-colors shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2"
                    >
                        <Save className="w-5 h-5" />
                        {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full bg-slate-800 hover:bg-red-500/10 border border-slate-700 hover:border-red-500 text-slate-400 hover:text-red-500 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                        <Trash2 className="w-5 h-5" />
                        Sahayı Sil
                    </button>
                </div>
            </form>

            <BusinessNavbar />

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-2">Emin misiniz?</h3>
                        <p className="text-slate-400 mb-6">
                            Bu sahayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve sahaya ait tüm veriler silinecektir.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleDeletePitch}
                                disabled={deleting}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {deleting ? 'Siliniyor...' : 'Evet, Sil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

