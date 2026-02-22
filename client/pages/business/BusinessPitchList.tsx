import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, ChevronRight, Goal, Plus, X, Clock, ListChecks } from 'lucide-react';
import { BusinessNavbar } from '../../components/BusinessNavbar';
import { DEFAULT_FACILITIES } from '../../constants';
import { BusinessTimePickerModal } from '../../components/BusinessTimePickerModal';
import { BusinessLoadingSpinner } from '../../components/BusinessLoadingSpinner';

export const BusinessPitchList: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [pitches, setPitches] = useState<any[]>([]);
    const [businessId, setBusinessId] = useState<string | null>(null);

    // Add Pitch State
    const [showAddModal, setShowAddModal] = useState(false);
    const [adding, setAdding] = useState(false);
    const [newPitchData, setNewPitchData] = useState({
        name: '',
        type: 'INDOOR',
        pricePerHour: '',
        openTime: '09:00',
        closeTime: '23:00',
        facilities: [] as string[],
        timeSlots: [] as Array<{ startTime: string; endTime: string }>
    });

    // Modal state
    const [isTimePickerOpen, setIsTimePickerOpen] = useState<{
        open: boolean;
        type: 'OPEN' | 'CLOSE' | 'SLOT_START' | 'SLOT_END'
    }>({ open: false, type: 'OPEN' });

    const [tempSlot, setTempSlot] = useState({ startTime: '09:00', endTime: '10:00' });

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
            const busId = ownerResponse.data.business?.id;

            if (!busId) {
                alert('İşletme bulunamadı');
                return;
            }

            setBusinessId(busId);
            const pitchesResponse = await api.get(`/pitches/business/${busId}`);
            setPitches(pitchesResponse.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching pitches:', error);
            setLoading(false);
        }
    };

    const toggleFacility = (facility: string) => {
        setNewPitchData(prev => {
            const exists = prev.facilities.includes(facility);
            if (exists) {
                return { ...prev, facilities: prev.facilities.filter(f => f !== facility) };
            } else {
                return { ...prev, facilities: [...prev.facilities, facility] };
            }
        });
    };

    const addTimeSlot = (startTime: string, endTime: string) => {
        if (!startTime || !endTime || startTime >= endTime) return;
        setNewPitchData(prev => ({
            ...prev,
            timeSlots: [...prev.timeSlots, { startTime, endTime }].sort((a, b) => a.startTime.localeCompare(b.startTime))
        }));
    };

    const removeTimeSlot = (index: number) => {
        setNewPitchData(prev => ({
            ...prev,
            timeSlots: prev.timeSlots.filter((_, i) => i !== index)
        }));
    };

    const handleAddPitch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!businessId) return;

        setAdding(true);
        try {
            const payload = {
                name: newPitchData.name,
                type: newPitchData.type,
                pricePerHour: parseFloat(newPitchData.pricePerHour),
                businessId: businessId,
                openTime: newPitchData.openTime,
                closeTime: newPitchData.closeTime,
                facilities: newPitchData.facilities,
                timeSlots: newPitchData.timeSlots
            };

            await api.post('/pitches', payload);

            // Refresh list
            const pitchesResponse = await api.get(`/pitches/business/${businessId}`);
            setPitches(pitchesResponse.data);

            setShowAddModal(false);
            setNewPitchData({ name: '', type: 'INDOOR', pricePerHour: '' });
        } catch (error) {
            console.error('Error adding pitch:', error);
            alert('Saha eklenirken bir hata oluştu.');
        } finally {
            setAdding(false);
        }
    };

    if (loading) {
        return <BusinessLoadingSpinner fullScreen />;
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-24 relative">
            {/* Header */}
            <div className="bg-slate-800 p-4 sticky top-0 z-10 border-b border-slate-700 shadow-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/business/settings')} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <div>
                        <h1 className="font-sport font-bold text-xl text-white">Saha Ayarları</h1>
                        <p className="text-xs text-slate-400">Düzenlemek istediğiniz sahayı seçin</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-1 shadow-lg shadow-orange-600/20"
                >
                    <Plus className="w-4 h-4" /> Ekle
                </button>
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

                {pitches.length === 0 && (
                    <div className="text-center py-10 text-slate-500">
                        <Goal className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Henüz saha eklenmemiş.</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="mt-3 text-orange-500 font-bold hover:underline"
                        >
                            İlk sahanı ekle
                        </button>
                    </div>
                )}
            </div>

            <BusinessNavbar />

            {/* Add Pitch Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Yeni Saha Ekle</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-hide">

                            <form onSubmit={handleAddPitch} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold mb-2 text-slate-300">Saha Adı</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Örn: 1 No'lu Saha"
                                        value={newPitchData.name}
                                        onChange={e => setNewPitchData({ ...newPitchData, name: e.target.value })}
                                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold mb-2 text-slate-300">Saha Tipi</label>
                                    <select
                                        value={newPitchData.type}
                                        onChange={e => setNewPitchData({ ...newPitchData, type: e.target.value })}
                                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                                    >
                                        <option value="INDOOR">Kapalı Saha</option>
                                        <option value="OUTDOOR">Açık Saha</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold mb-2 text-slate-300">Saatlik Ücret (TL)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₺</span>
                                        <input
                                            type="number"
                                            required
                                            placeholder="0.00"
                                            value={newPitchData.pricePerHour}
                                            onChange={e => setNewPitchData({ ...newPitchData, pricePerHour: e.target.value })}
                                            className="w-full pl-8 p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pb-4 border-b border-slate-800">
                                    <div>
                                        <label className="block text-sm font-bold mb-2 text-slate-300 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> Açılış
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setIsTimePickerOpen({ open: true, type: 'OPEN' })}
                                            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-left hover:border-orange-500 transition-all font-mono font-bold"
                                        >
                                            {newPitchData.openTime}
                                        </button>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-2 text-slate-300 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> Kapanış
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setIsTimePickerOpen({ open: true, type: 'CLOSE' })}
                                            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-left hover:border-orange-500 transition-all font-mono font-bold"
                                        >
                                            {newPitchData.closeTime}
                                        </button>
                                    </div>
                                </div>

                                <BusinessTimePickerModal
                                    isOpen={isTimePickerOpen.open && (isTimePickerOpen.type === 'OPEN' || isTimePickerOpen.type === 'CLOSE')}
                                    onClose={() => setIsTimePickerOpen({ ...isTimePickerOpen, open: false })}
                                    title={isTimePickerOpen.type === 'OPEN' ? "AÇILIŞ SAATİ" : "KAPANIŞ SAATİ"}
                                    initialTime={isTimePickerOpen.type === 'OPEN' ? newPitchData.openTime : newPitchData.closeTime}
                                    onSelect={(time) => {
                                        if (isTimePickerOpen.type === 'OPEN') setNewPitchData({ ...newPitchData, openTime: time });
                                        else setNewPitchData({ ...newPitchData, closeTime: time });
                                    }}
                                />

                                <div className="space-y-4 py-4">
                                    <label className="block text-sm font-bold text-slate-300">Özel Saatler (Opsiyonel)</label>
                                    <p className="text-[10px] text-slate-500">Kendi kiralama saatlerinizi belirleyin. Belirtmezseniz saatlik otomatik oluşturulur.</p>

                                    <div className="space-y-2">
                                        {newPitchData.timeSlots.map((slot, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-slate-800 p-2 rounded-lg border border-slate-700">
                                                <span className="text-sm font-bold text-orange-400">{slot.startTime} - {slot.endTime}</span>
                                                <button type="button" onClick={() => removeTimeSlot(idx)} className="text-red-500 hover:text-red-400">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-2 items-center">
                                        <div className="flex-1 space-y-1">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">Başlangıç</p>
                                            <button
                                                type="button"
                                                onClick={() => setIsTimePickerOpen({ open: true, type: 'SLOT_START' })}
                                                className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-xl text-sm font-mono font-bold hover:border-orange-500"
                                            >
                                                {tempSlot.startTime || "00:00"}
                                            </button>
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">Bitiş</p>
                                            <button
                                                type="button"
                                                onClick={() => setIsTimePickerOpen({ open: true, type: 'SLOT_END' })}
                                                className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-xl text-sm font-mono font-bold hover:border-orange-500"
                                            >
                                                {tempSlot.endTime || "00:00"}
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                addTimeSlot(tempSlot.startTime, tempSlot.endTime);
                                            }}
                                            className="bg-orange-600 hover:bg-orange-500 text-white p-3 rounded-xl shadow-lg shadow-orange-600/20 self-end transition-all"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>

                                    <BusinessTimePickerModal
                                        isOpen={isTimePickerOpen.open && (isTimePickerOpen.type === 'SLOT_START' || isTimePickerOpen.type === 'SLOT_END')}
                                        onClose={() => setIsTimePickerOpen({ ...isTimePickerOpen, open: false })}
                                        title={isTimePickerOpen.type === 'SLOT_START' ? "SLOT BAŞLANGIÇ" : "SLOT BİTİŞ"}
                                        initialTime={isTimePickerOpen.type === 'SLOT_START' ? tempSlot.startTime : tempSlot.endTime}
                                        onSelect={(time) => {
                                            if (isTimePickerOpen.type === 'SLOT_START') setTempSlot({ ...tempSlot, startTime: time });
                                            else setTempSlot({ ...tempSlot, endTime: time });
                                        }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold mb-2 text-slate-300 flex items-center gap-1">
                                        <ListChecks className="w-3 h-3" /> İmkanlar
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 scrollbar-hide">
                                        {DEFAULT_FACILITIES.map(facility => (
                                            <button
                                                key={facility}
                                                type="button"
                                                onClick={() => toggleFacility(facility)}
                                                className={`p-2 rounded-lg text-xs font-bold transition-all border ${newPitchData.facilities.includes(facility)
                                                    ? 'bg-orange-500/20 border-orange-500 text-orange-500'
                                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                                                    }`}
                                            >
                                                {facility}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={adding}
                                    className="w-full bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-600/20 disabled:opacity-50 mt-2"
                                >
                                    {adding ? 'Ekleniyor...' : 'Saha Oluştur'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

