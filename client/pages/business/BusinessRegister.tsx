import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import {
    Briefcase, MapPin, CheckCircle, ChevronRight, ChevronLeft,
    User, Store, Plus, Trash2, Clock, TurkishLira, X
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icon in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Types for form data
interface RegisterBusinessData {
    owner: {
        email: string;
        password: string;
        fullName: string;
        phone: string;
    };
    business: {
        name: string;
        city: string;
        district: string;
        address: string;
        latitude: number;
        longitude: number;
        phone: string;
        openTime: string;
        closeTime: string;
    };
    pitches: Array<{
        name: string;
        type: string;
        pricePerHour: number;
        openTime: string;
        closeTime: string;
        facilities: string[];
        timeSlots: Array<{ startTime: string; endTime: string }>;
    }>;
}

const steps = [
    { id: 1, title: 'Yetkili', icon: User },
    { id: 2, title: 'Konum', icon: MapPin },
    { id: 3, title: 'İşletme', icon: Store },
    { id: 4, title: 'Sahalar', icon: Briefcase },
    { id: 5, title: 'Onay', icon: CheckCircle },
];

import { DEFAULT_FACILITIES } from '../../constants';
import { LocationSelectionModal } from '../../components/LocationSelectionModal';
import { BusinessTimePickerModal } from '../../components/BusinessTimePickerModal';
import { locationService } from '../../services/locationService';
export const BusinessRegister: React.FC = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);

    // Modal states
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [locationModalStep, setLocationModalStep] = useState<'CITY' | 'DISTRICT'>('CITY');
    const [isTimePickerOpen, setIsTimePickerOpen] = useState<{
        open: boolean;
        type: 'OPEN' | 'CLOSE' | 'PITCH_OPEN' | 'PITCH_CLOSE' | 'SLOT_START' | 'SLOT_END';
        pitchIdx?: number;
    }>({ open: false, type: 'OPEN' });

    const [tempSlot, setTempSlot] = useState({ startTime: '19:00', endTime: '20:00' });

    // Initial State
    const [formData, setFormData] = useState<RegisterBusinessData>({
        owner: { email: '', password: '', fullName: '', phone: '' },
        business: {
            name: '', city: '', district: '', address: '',
            latitude: 41.0082, longitude: 28.9784, // Default: Istanbul
            phone: '', openTime: '09:00', closeTime: '23:00'
        },
        pitches: [
            {
                name: '1 No\'lu Saha', type: 'Kapalı Saha', pricePerHour: 0,
                openTime: '', closeTime: '', facilities: [], timeSlots: []
            }
        ]
    });

    // Handlers
    const updateOwner = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, owner: { ...prev.owner, [field]: value } }));
    };

    const updateBusiness = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, business: { ...prev.business, [field]: value } }));
    };

    const updatePitch = (index: number, field: string, value: any) => {
        const newPitches = [...formData.pitches];
        newPitches[index] = { ...newPitches[index], [field]: value };
        setFormData(prev => ({ ...prev, pitches: newPitches }));
    };

    const addPitch = () => {
        setFormData(prev => ({
            ...prev,
            pitches: [
                ...prev.pitches,
                {
                    name: `${prev.pitches.length + 1} No'lu Saha`,
                    type: 'Kapalı Saha',
                    pricePerHour: 0,
                    openTime: '',
                    closeTime: '',
                    facilities: [],
                    timeSlots: []
                }
            ]
        }));
    };

    const removePitch = (index: number) => {
        if (formData.pitches.length > 1) {
            setFormData(prev => ({
                ...prev,
                pitches: prev.pitches.filter((_, i) => i !== index)
            }));
        }
    };

    const toggleFacility = (pitchIndex: number, facility: string) => {
        const currentFacilities = formData.pitches[pitchIndex].facilities;
        let newFacilities;
        if (currentFacilities.includes(facility)) {
            newFacilities = currentFacilities.filter(f => f !== facility);
        } else {
            newFacilities = [...currentFacilities, facility];
        }
        updatePitch(pitchIndex, 'facilities', newFacilities);
    };

    const addTimeSlot = (pitchIndex: number, startTime: string, endTime: string) => {
        const slots = [...(formData.pitches[pitchIndex].timeSlots || [])];
        if (startTime && endTime && startTime < endTime) {
            slots.push({ startTime, endTime });
            slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
            updatePitch(pitchIndex, 'timeSlots', slots);
        }
    };

    const removeTimeSlot = (pitchIndex: number, slotIndex: number) => {
        const slots = [...(formData.pitches[pitchIndex].timeSlots || [])];
        const newSlots = slots.filter((_, i) => i !== slotIndex);
        updatePitch(pitchIndex, 'timeSlots', newSlots);
    };

    const LocationMarker = () => {
        useMapEvents({
            async click(e) {
                updateBusiness('latitude', e.latlng.lat);
                updateBusiness('longitude', e.latlng.lng);

                // Fetch city/district info automatically
                try {
                    setIsGeocoding(true);
                    const locationInfo = await locationService.reverseGeocode(e.latlng.lat, e.latlng.lng);
                    if (locationInfo) {
                        updateBusiness('city', locationInfo.city);
                        updateBusiness('district', locationInfo.district);
                    }
                } catch (error) {
                    console.error('Reverse geocoding error:', error);
                } finally {
                    setIsGeocoding(false);
                }
            },
        });
        return formData.business.latitude ? (
            <Marker position={[formData.business.latitude, formData.business.longitude]} />
        ) : null;
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');
        try {
            await api.post('/auth/business/register', formData);
            navigate('/business/login', { state: { message: 'Kayıt başarılı! Giriş yapabilirsiniz.' } });
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.response?.data?.message || 'Kayıt sırasında bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    };

    const nextStep = () => {
        if (currentStep < 5) setCurrentStep(c => c + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(c => c - 1);
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4 animate-fade-in">
                        <h2 className="text-xl font-bold text-white mb-4">Yetkili Bilgileri</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Ad Soyad" value={formData.owner.fullName} onChange={(e: any) => updateOwner('fullName', e.target.value)} required />
                            <Input label="Telefon" value={formData.owner.phone} onChange={(e: any) => updateOwner('phone', e.target.value)} required />
                            <Input label="E-Posta" type="email" value={formData.owner.email} onChange={(e: any) => updateOwner('email', e.target.value)} required />
                            <Input label="Şifre" type="password" value={formData.owner.password} onChange={(e: any) => updateOwner('password', e.target.value)} required />
                        </div>
                    </div>
                );
            case 2:
                // New Step 2: Location Map
                return (
                    <div className="space-y-4 animate-fade-in h-full flex flex-col">
                        <h2 className="text-xl font-bold text-white mb-2">Konum Seçimi</h2>
                        <p className="text-sm text-slate-400 mb-4">Harita üzerinde işletmenizin konumunu işaretleyin. İl ve ilçe bilgileriniz otomatik doldurulacaktır.</p>
                        <div className="flex-1 min-h-[400px] rounded-xl overflow-hidden border-2 border-slate-700 relative z-[1]">
                            <MapContainer
                                center={[formData.business.latitude, formData.business.longitude]}
                                zoom={13}
                                style={{ height: '400px', width: '100%', borderRadius: '12px' }}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />
                                <LocationMarker />
                            </MapContainer>
                        </div>
                        <div className="flex flex-col items-center gap-2 mt-2">
                            {isGeocoding ? (
                                <div className="flex items-center gap-2 text-orange-500 animate-pulse text-sm font-bold">
                                    <div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                    KONUMDAN BİLGİ ALINIYOR...
                                </div>
                            ) : (
                                (formData.business.city || formData.business.district) && (
                                    <div className="text-sm font-bold text-green-500 bg-green-500/10 px-4 py-1.5 rounded-full border border-green-500/20">
                                        {formData.business.city} {formData.business.district ? `/ ${formData.business.district}` : ''}
                                    </div>
                                )
                            )}
                            <div className="text-center text-slate-500 text-[10px] font-mono">
                                {formData.business.latitude.toFixed(6)}, {formData.business.longitude.toFixed(6)}
                            </div>
                        </div>
                    </div>
                );
            case 3:
                // New Step 3: Business Details (Previously Step 2)
                return (
                    <div className="space-y-4 animate-fade-in">
                        <h2 className="text-xl font-bold text-white mb-4">İşletme Detayları</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="İşletme Adı" value={formData.business.name} onChange={(e: any) => updateBusiness('name', e.target.value)} required />
                            <Input label="İşletme Telefonu" value={formData.business.phone} onChange={(e: any) => updateBusiness('phone', e.target.value)} required />

                            <div className="grid grid-cols-2 gap-4 md:col-span-2">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-slate-400 font-bold uppercase ml-1">Şehir *</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLocationModalStep('CITY');
                                            setIsLocationModalOpen(true);
                                        }}
                                        className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl text-left hover:border-orange-500 transition-all font-medium"
                                    >
                                        {formData.business.city || "Şehir Seç..."}
                                    </button>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-slate-400 font-bold uppercase ml-1">İlçe *</label>
                                    <button
                                        type="button"
                                        disabled={!formData.business.city}
                                        onClick={() => {
                                            setLocationModalStep('DISTRICT');
                                            setIsLocationModalOpen(true);
                                        }}
                                        className={`w-full border p-3 rounded-xl text-left transition-all font-medium ${!formData.business.city
                                            ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                                            : 'bg-slate-800 border-slate-700 text-white hover:border-orange-500'
                                            }`}
                                    >
                                        {formData.business.district || "İlçe Seç..."}
                                    </button>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <Input label="Açık Adres" value={formData.business.address} onChange={(e: any) => updateBusiness('address', e.target.value)} required textarea />
                            </div>

                            <div className="grid grid-cols-2 gap-2 md:col-span-2">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-slate-400 font-bold uppercase ml-1">Açılış Saati</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsTimePickerOpen({ open: true, type: 'OPEN' })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl text-left hover:border-orange-500 transition-all font-mono font-bold"
                                    >
                                        {formData.business.openTime}
                                    </button>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-slate-400 font-bold uppercase ml-1">Kapanış Saati</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsTimePickerOpen({ open: true, type: 'CLOSE' })}
                                        className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl text-left hover:border-orange-500 transition-all font-mono font-bold"
                                    >
                                        {formData.business.closeTime}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">Sahalar</h2>
                            <button onClick={addPitch} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors">
                                <Plus size={16} /> Saha Ekle
                            </button>
                        </div>

                        <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide pb-10">
                            {formData.pitches.map((pitch, index) => (
                                <div key={index} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 relative">
                                    {formData.pitches.length > 1 && (
                                        <button onClick={() => removePitch(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-400">
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                    <h3 className="font-bold text-orange-400 mb-3">{index + 1}. Saha</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                        <Input label="Saha Adı" value={pitch.name} onChange={(e: any) => updatePitch(index, 'name', e.target.value)} />
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-slate-400 font-bold uppercase">Saha Tipi</label>
                                            <select
                                                className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-orange-500"
                                                value={pitch.type}
                                                onChange={e => updatePitch(index, 'type', e.target.value)}
                                            >
                                                <option value="Kapalı Saha">Kapalı Saha</option>
                                                <option value="Açık Saha">Açık Saha</option>
                                            </select>
                                        </div>
                                        <Input label="Saatlik Ücret (TL)" type="number" value={pitch.pricePerHour} onChange={(e: any) => updatePitch(index, 'pricePerHour', parseFloat(e.target.value))} icon={<TurkishLira size={14} />} />
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs text-slate-400 font-bold uppercase ml-1">Açılış (Opsiyonel)</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsTimePickerOpen({ open: true, type: 'PITCH_OPEN', pitchIdx: index })}
                                                    className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl text-left hover:border-orange-500 transition-all font-mono font-bold text-sm"
                                                >
                                                    {pitch.openTime || "Seç..."}
                                                </button>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-xs text-slate-400 font-bold uppercase ml-1">Kapanış (Opsiyonel)</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsTimePickerOpen({ open: true, type: 'PITCH_CLOSE', pitchIdx: index })}
                                                    className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl text-left hover:border-orange-500 transition-all font-mono font-bold text-sm"
                                                >
                                                    {pitch.closeTime || "Seç..."}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 border-t border-slate-800 pt-4">
                                        <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">Saat Slotları (Opsiyonel)</label>
                                        <p className="text-[10px] text-slate-500 mb-3">Bu sahaya özel kiralama saatlerini belirleyin. Örneğin: 19:30 - 20:30</p>
                                        <div className="space-y-2 mb-3">
                                            {pitch.timeSlots?.map((slot, slotIdx) => (
                                                <div key={slotIdx} className="flex items-center justify-between bg-slate-800 p-2 rounded-lg border border-slate-700">
                                                    <span className="text-sm font-bold text-orange-400">{slot.startTime} - {slot.endTime}</span>
                                                    <button onClick={() => removeTimeSlot(index, slotIdx)} className="text-red-500 hover:text-red-400 p-1">
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
                                                    onClick={() => setIsTimePickerOpen({ open: true, type: 'SLOT_START', pitchIdx: index })}
                                                    className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-xl text-sm font-mono font-bold hover:border-orange-500"
                                                >
                                                    {tempSlot.startTime || "00:00"}
                                                </button>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">Bitiş</p>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsTimePickerOpen({ open: true, type: 'SLOT_END', pitchIdx: index })}
                                                    className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-xl text-sm font-mono font-bold hover:border-orange-500"
                                                >
                                                    {tempSlot.endTime || "00:00"}
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => addTimeSlot(index, tempSlot.startTime, tempSlot.endTime)}
                                                className="bg-orange-600 hover:bg-orange-500 text-white p-3 rounded-xl shadow-lg shadow-orange-600/20 self-end transition-all"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-4 border-t border-slate-800 pt-4">
                                        <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">İmkanlar</label>
                                        <div className="flex flex-wrap gap-2">
                                            {DEFAULT_FACILITIES.map(facility => (
                                                <button
                                                    key={facility}
                                                    type="button"
                                                    onClick={() => toggleFacility(index, facility)}
                                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${pitch.facilities.includes(facility)
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                                        }`}
                                                >
                                                    {facility}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 5:
                return (
                    <div className="space-y-4 animate-fade-in">
                        <h2 className="text-xl font-bold text-white mb-4">Özet ve Onay</h2>
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 space-y-3 text-sm">
                            <SummaryItem label="Yetkili" value={`${formData.owner.fullName} (${formData.owner.email})`} />
                            <SummaryItem label="İşletme" value={`${formData.business.name}`} />
                            <SummaryItem label="Adres" value={`${formData.business.city} / ${formData.business.district}`} />
                            <SummaryItem label="Telefon" value={formData.business.phone} />
                            <SummaryItem label="Saha Sayısı" value={`${formData.pitches.length} Adet`} />
                            <div className="border-t border-slate-800 pt-2 mt-2">
                                <p className="text-slate-400 text-xs mb-1">Sahalar:</p>
                                {formData.pitches.map((p, i) => (
                                    <div key={i} className="flex justify-between text-xs text-slate-300">
                                        <span>{p.name} ({p.type})</span>
                                        <span className="font-bold text-orange-400">{p.pricePerHour} TL</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 text-center mt-4">
                            "Kaydı Tamamla" butonuna tıklayarak hizmet şartlarını kabul etmiş olursunuz.
                        </p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">

                <div className="bg-slate-800/50 w-full md:w-1/4 p-6 border-b md:border-b-0 md:border-r border-slate-700 flex flex-row md:flex-col justify-between md:justify-start gap-4 overflow-x-auto">
                    <div className="mb-0 md:mb-8 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                            <Store className="text-white w-5 h-5" />
                        </div>
                        <h1 className="font-black text-white italic hidden md:block">SAHAPRO</h1>
                    </div>

                    <div className="flex flex-row md:flex-col gap-2">
                        {steps.map((step) => {
                            const Icon = step.icon;
                            const isActive = currentStep === step.id;
                            const isCompleted = currentStep > step.id;
                            return (
                                <div
                                    key={step.id}
                                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isActive ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/50' :
                                        isCompleted ? 'text-green-500' : 'text-slate-500'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${isActive ? 'border-white bg-white/20' :
                                        isCompleted ? 'border-green-500 bg-green-500/10' : 'border-slate-600 bg-slate-800'
                                        }`}>
                                        {isCompleted ? <CheckCircle size={16} /> : <Icon size={16} />}
                                    </div>
                                    <span className={`font-bold text-sm hidden md:block ${isActive ? 'text-white' : ''}`}>
                                        {step.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 flex flex-col p-6 md:p-10 relative">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black text-white italic uppercase tracking-wider">
                            {steps.find(s => s.id === currentStep)?.title}
                        </h2>
                        <span className="text-slate-500 text-sm font-bold">Adım {currentStep} / 5</span>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-sm font-bold flex items-center gap-2">
                            <User className="w-4 h-4" /> {error}
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide pb-24">
                        {renderStepContent()}
                    </div>

                    <div className="absolute bottom-6 left-6 right-6 flex justify-between pt-4 border-t border-slate-800 bg-slate-900 z-10">
                        <button
                            onClick={prevStep}
                            disabled={currentStep === 1}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-colors ${currentStep === 1 ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            <ChevronLeft size={20} /> Geri
                        </button>

                        {currentStep < 5 ? (
                            <button
                                onClick={nextStep}
                                className="bg-white text-slate-900 px-8 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-slate-200 transition-colors shadow-lg shadow-white/10"
                            >
                                İleri <ChevronRight size={20} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-8 py-3 rounded-xl font-black flex items-center gap-2 hover:from-orange-500 hover:to-red-500 transition-all shadow-lg shadow-orange-900/30 disabled:opacity-50"
                            >
                                {isLoading ? 'Kaydediliyor...' : 'Kaydı Tamamla'} <CheckCircle size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <LocationSelectionModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
                onSelect={(city, dist) => {
                    // If city changed, we update both. Modal logic should handle the flow.
                    updateBusiness('city', city);
                    updateBusiness('district', dist);
                }}
                initialCity={formData.business.city}
                initialDistrict={formData.business.district}
                initialStep={locationModalStep}
            />

            <BusinessTimePickerModal
                isOpen={isTimePickerOpen.open}
                onClose={() => setIsTimePickerOpen({ ...isTimePickerOpen, open: false })}
                title={
                    isTimePickerOpen.type === 'OPEN' ? "İŞLETME AÇILIŞ" :
                        isTimePickerOpen.type === 'CLOSE' ? "İŞLETME KAPANIŞ" :
                            isTimePickerOpen.type === 'PITCH_OPEN' ? "SAHA AÇILIŞ" :
                                isTimePickerOpen.type === 'PITCH_CLOSE' ? "SAHA KAPANIŞ" :
                                    isTimePickerOpen.type === 'SLOT_START' ? "SLOT BAŞLANGIÇ" : "SLOT BİTİŞ"
                }
                initialTime={
                    isTimePickerOpen.type === 'OPEN' ? formData.business.openTime :
                        isTimePickerOpen.type === 'CLOSE' ? formData.business.closeTime :
                            isTimePickerOpen.pitchIdx !== undefined ? (
                                isTimePickerOpen.type === 'PITCH_OPEN' ? formData.pitches[isTimePickerOpen.pitchIdx].openTime :
                                    isTimePickerOpen.type === 'PITCH_CLOSE' ? formData.pitches[isTimePickerOpen.pitchIdx].closeTime :
                                        isTimePickerOpen.type === 'SLOT_START' ? tempSlot.startTime : tempSlot.endTime
                            ) : '19:00'
                }
                onSelect={(time) => {
                    if (isTimePickerOpen.type === 'OPEN') updateBusiness('openTime', time);
                    else if (isTimePickerOpen.type === 'CLOSE') updateBusiness('closeTime', time);
                    else if (isTimePickerOpen.pitchIdx !== undefined) {
                        if (isTimePickerOpen.type === 'PITCH_OPEN') updatePitch(isTimePickerOpen.pitchIdx, 'openTime', time);
                        else if (isTimePickerOpen.type === 'PITCH_CLOSE') updatePitch(isTimePickerOpen.pitchIdx, 'closeTime', time);
                        else if (isTimePickerOpen.type === 'SLOT_START') setTempSlot({ ...tempSlot, startTime: time });
                        else if (isTimePickerOpen.type === 'SLOT_END') setTempSlot({ ...tempSlot, endTime: time });
                    }
                }}
            />

            <div className="mt-6 text-center">
                <p className="text-slate-500 text-sm">
                    Zaten hesabın var mı?{' '}
                    <Link to="/business/login" className="text-orange-500 font-bold hover:underline">
                        Giriş Yap
                    </Link>
                </p>
            </div>
        </div>
    );
};

const Input = ({ label, type = "text", value, onChange, required, textarea, icon }: any) => (
    <div className="flex flex-col gap-1 w-full">
        <label className="text-xs text-slate-400 font-bold uppercase ml-1 block">{label} {required && <span className="text-red-500">*</span>}</label>
        <div className="relative">
            {icon && <div className="absolute left-3 top-3.5 text-slate-500">{icon}</div>}
            {textarea ? (
                <textarea
                    className={`w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all font-medium min-h-[100px] resize-none ${icon ? 'pl-10' : ''}`}
                    value={value}
                    onChange={onChange}
                    required={required}
                />
            ) : (
                <input
                    type={type}
                    className={`w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:border-orange-500 transition-all font-medium ${icon ? 'pl-10' : ''}`}
                    value={value}
                    onChange={onChange}
                    required={required}
                />
            )}
        </div>
    </div>
);

const SummaryItem = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
        <span className="text-slate-400 font-bold">{label}</span>
        <span className="text-white truncate max-w-[200px]">{value}</span>
    </div>
);
