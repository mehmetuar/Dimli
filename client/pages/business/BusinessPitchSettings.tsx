import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { Save, ArrowLeft, Clock, TurkishLira, ListChecks, Plus, Trash2, X } from 'lucide-react';
import { BusinessNavbar } from '../../components/BusinessNavbar';
import { DEFAULT_FACILITIES } from '../../constants';
import { BusinessTimePickerModal } from '../../components/BusinessTimePickerModal';


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

    // Time Slots State
    const [timeSlots, setTimeSlots] = useState<{ startTime: string; endTime: string }[]>([]);
    const [newSlotStart, setNewSlotStart] = useState('19:00');
    const [newSlotEnd, setNewSlotEnd] = useState('20:00');
    const [savingSlots, setSavingSlots] = useState(false);
    const [slotsSuccess, setSlotsSuccess] = useState(false);

    // Modal state
    const [isTimePickerOpen, setIsTimePickerOpen] = useState<{
        open: boolean;
        type: 'OPEN' | 'CLOSE' | 'SLOT_START' | 'SLOT_END'
    }>({ open: false, type: 'OPEN' });

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

            // Load time slots
            if (pitch.timeSlots && pitch.timeSlots.length > 0) {
                setTimeSlots(pitch.timeSlots.map((ts: any) => ({
                    startTime: ts.startTime,
                    endTime: ts.endTime
                })));
            }

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

    // ===== TIME SLOT HANDLERS =====
    const handleAddSlot = () => {
        if (newSlotStart && newSlotEnd && newSlotStart < newSlotEnd) {
            // Check for duplicates
            const exists = timeSlots.some(
                s => s.startTime === newSlotStart && s.endTime === newSlotEnd
            );
            if (!exists) {
                setTimeSlots(prev => [...prev, { startTime: newSlotStart, endTime: newSlotEnd }]
                    .sort((a, b) => a.startTime.localeCompare(b.startTime)));
            }
        }
    };

    const handleRemoveSlot = (index: number) => {
        setTimeSlots(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveSlots = async () => {
        setSavingSlots(true);
        setSlotsSuccess(false);
        try {
            await api.put(`/pitches/${pitchId}/time-slots`, { slots: timeSlots });
            setSlotsSuccess(true);
            setTimeout(() => setSlotsSuccess(false), 3000);
        } catch (error) {
            console.error('Error saving time slots:', error);
            alert('Saat slotları kaydedilirken hata oluştu.');
        } finally {
            setSavingSlots(false);
        }
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
                            <button
                                type="button"
                                onClick={() => setIsTimePickerOpen({ open: true, type: 'OPEN' })}
                                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-left hover:border-orange-500 transition-all font-mono font-bold"
                            >
                                {formData.openTime}
                            </button>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2 text-slate-300">
                                Kapanış Saati
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsTimePickerOpen({ open: true, type: 'CLOSE' })}
                                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-left hover:border-orange-500 transition-all font-mono font-bold"
                            >
                                {formData.closeTime}
                            </button>
                        </div>
                    </div>

                    <BusinessTimePickerModal
                        isOpen={isTimePickerOpen.open && (isTimePickerOpen.type === 'OPEN' || isTimePickerOpen.type === 'CLOSE')}
                        onClose={() => setIsTimePickerOpen({ ...isTimePickerOpen, open: false })}
                        title={isTimePickerOpen.type === 'OPEN' ? "AÇILIŞ SAATİ" : "KAPANIŞ SAATİ"}
                        initialTime={isTimePickerOpen.type === 'OPEN' ? formData.openTime : formData.closeTime}
                        onSelect={(time) => {
                            if (isTimePickerOpen.type === 'OPEN') handleChange('openTime', time);
                            else handleChange('closeTime', time);
                        }}
                    />
                </div>

                {/* ===== TIME SLOTS SECTION ===== */}
                <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-4">
                    <h2 className="text-lg font-bold text-orange-500 mb-2 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Saat Slotları
                    </h2>
                    <p className="text-xs text-slate-400 mb-4">
                        Bu saha için kiralık saat aralıklarını tanımlayın. Slot eklemezseniz açılış-kapanış saatleri baz alınarak otomatik saatlik slotlar oluşturulur.
                    </p>

                    {slotsSuccess && (
                        <div className="p-3 bg-green-600/20 border border-green-500 rounded-xl text-green-500 font-bold text-center text-sm">
                            ✓ Saat slotları kaydedildi!
                        </div>
                    )}

                    {/* Existing Slots */}
                    {timeSlots.length > 0 ? (
                        <div className="space-y-2">
                            {timeSlots.map((slot, index) => (
                                <div key={index} className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-orange-500/20 px-3 py-1 rounded-lg">
                                            <span className="text-orange-400 font-black text-lg">{slot.startTime}</span>
                                        </div>
                                        <span className="text-slate-500 font-bold">→</span>
                                        <div className="bg-orange-500/20 px-3 py-1 rounded-lg">
                                            <span className="text-orange-400 font-black text-lg">{slot.endTime}</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSlot(index)}
                                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
                            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                            <p className="text-slate-500 text-sm">Henüz saat slotu tanımlanmamış.</p>
                            <p className="text-slate-600 text-xs">Aşağıdan yeni slotlar ekleyin.</p>
                        </div>
                    )}

                    {/* Add New Slot */}
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            <label className="block text-xs text-slate-400 font-bold mb-1">Başlangıç</label>
                            <button
                                type="button"
                                onClick={() => setIsTimePickerOpen({ open: true, type: 'SLOT_START' })}
                                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-left hover:border-orange-500 transition-all font-mono font-bold"
                            >
                                {newSlotStart}
                            </button>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-slate-400 font-bold mb-1">Bitiş</label>
                            <button
                                type="button"
                                onClick={() => setIsTimePickerOpen({ open: true, type: 'SLOT_END' })}
                                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white text-left hover:border-orange-500 transition-all font-mono font-bold"
                            >
                                {newSlotEnd}
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={handleAddSlot}
                            className="bg-orange-600 hover:bg-orange-500 text-white p-3 rounded-lg font-bold transition-colors flex items-center gap-1 h-[46px]"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    <BusinessTimePickerModal
                        isOpen={isTimePickerOpen.open && (isTimePickerOpen.type === 'SLOT_START' || isTimePickerOpen.type === 'SLOT_END')}
                        onClose={() => setIsTimePickerOpen({ ...isTimePickerOpen, open: false })}
                        title={isTimePickerOpen.type === 'SLOT_START' ? "SLOT BAŞLANGIÇ" : "SLOT BİTİŞ"}
                        initialTime={isTimePickerOpen.type === 'SLOT_START' ? newSlotStart : newSlotEnd}
                        onSelect={(time) => {
                            if (isTimePickerOpen.type === 'SLOT_START') setNewSlotStart(time);
                            else setNewSlotEnd(time);
                        }}
                    />

                    {/* Save Slots Button */}
                    <button
                        type="button"
                        onClick={handleSaveSlots}
                        disabled={savingSlots}
                        className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 disabled:from-slate-700 disabled:to-slate-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {savingSlots ? 'Kaydediliyor...' : `Slotları Kaydet (${timeSlots.length} slot)`}
                    </button>
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

