import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import {
    Briefcase, MapPin, CheckCircle, ChevronRight, ChevronLeft,
    User, Store, Plus, Trash2, Clock, DollarSign
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
    }>;
}

const steps = [
    { id: 1, title: 'Yetkili', icon: User },
    { id: 2, title: 'İşletme', icon: Store },
    { id: 3, title: 'Konum', icon: MapPin },
    { id: 4, title: 'Sahalar', icon: Briefcase },
    { id: 5, title: 'Onay', icon: CheckCircle },
];

import { DEFAULT_FACILITIES } from '../../constants';

export const BusinessRegister: React.FC = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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
                openTime: '', closeTime: '', facilities: []
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
                    facilities: []
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

    const LocationMarker = () => {
        useMapEvents({
            click(e) {
                updateBusiness('latitude', e.latlng.lat);
                updateBusiness('longitude', e.latlng.lng);
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
            // Success - Redirect or Auto Login
            // Ideally call login here or redirect to login page with success message
            navigate('/business/login', { state: { message: 'Kayıt başarılı! Giriş yapabilirsiniz.' } });
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.response?.data?.message || 'Kayıt sırasında bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    };

    const nextStep = () => {
        // Basic validation per step could go here
        if (currentStep < 5) setCurrentStep(c => c + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(c => c - 1);
    };

    // Render Steps
    const renderStepContent = () => {
        switch (currentStep) {
            case 1: // Owner Info
                return (
                    <div className="space-y-4 animate-fadeIn">
                        <h2 className="text-xl font-bold text-white mb-4">Yetkili Bilgileri</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Ad Soyad" value={formData.owner.fullName} onChange={e => updateOwner('fullName', e.target.value)} required />
                            <Input label="Telefon" value={formData.owner.phone} onChange={e => updateOwner('phone', e.target.value)} required />
                            <Input label="E-Posta" type="email" value={formData.owner.email} onChange={e => updateOwner('email', e.target.value)} required />
                            <Input label="Şifre" type="password" value={formData.owner.password} onChange={e => updateOwner('password', e.target.value)} required />
                        </div>
                    </div>
                );
            case 2: // Business Info
                return (
                    <div className="space-y-4 animate-fadeIn">
                        <h2 className="text-xl font-bold text-white mb-4">İşletme Detayları</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="İşletme Adı" value={formData.business.name} onChange={e => updateBusiness('name', e.target.value)} required />
                            <Input label="İşletme Telefonu" value={formData.business.phone} onChange={e => updateBusiness('phone', e.target.value)} required />
                            <Input label="Şehir" value={formData.business.city} onChange={e => updateBusiness('city', e.target.value)} required />
                            <Input label="İlçe" value={formData.business.district} onChange={e => updateBusiness('district', e.target.value)} required />
                            <div className="md:col-span-2">
                                <Input label="Açık Adres" value={formData.business.address} onChange={e => updateBusiness('address', e.target.value)} required textarea />
                            </div>
                            <div className="grid grid-cols-2 gap-2 md:col-span-2">
                                <Input label="Açılış Saati" type="time" value={formData.business.openTime} onChange={e => updateBusiness('openTime', e.target.value)} />
                                <Input label="Kapanış Saati" type="time" value={formData.business.closeTime} onChange={e => updateBusiness('closeTime', e.target.value)} />
                            </div>
                        </div>
                    </div>
                );
            case 3: // Location Map
                return (
                    <div className="space-y-4 animate-fadeIn h-full flex flex-col">
                        <h2 className="text-xl font-bold text-white mb-2">Konum Seçimi</h2>
                        <p className="text-sm text-slate-400 mb-4">Harita üzerinde işletmenizin konumunu işaretleyin.</p>
                        <div className="flex-1 min-h-[400px] rounded-xl overflow-hidden border-2 border-slate-700 relative z-0">
                            <MapContainer
                                center={[formData.business.latitude, formData.business.longitude]}
                                zoom={13}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />
                                <LocationMarker />
                            </MapContainer>
                        </div>
                        <div className="text-center text-orange-400 text-sm font-mono mt-2">
                            {formData.business.latitude.toFixed(6)}, {formData.business.longitude.toFixed(6)}
                        </div>
                    </div>
                );
            case 4: // Pitches
                return (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">Sahalar</h2>
                            <button onClick={addPitch} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors">
                                <Plus size={16} /> Saha Ekle
                            </button>
                        </div>

                        <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
                            {formData.pitches.map((pitch, index) => (
                                <div key={index} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 relative">
                                    {formData.pitches.length > 1 && (
                                        <button onClick={() => removePitch(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-400">
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                    <h3 className="font-bold text-orange-400 mb-3">{index + 1}. Saha</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                        <Input label="Saha Adı" value={pitch.name} onChange={e => updatePitch(index, 'name', e.target.value)} />
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
                                        <Input label="Saatlik Ücret (TL)" type="number" value={pitch.pricePerHour} onChange={e => updatePitch(index, 'pricePerHour', parseFloat(e.target.value))} icon={<DollarSign size={14} />} />
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input label="Açılış (Opsiyonel)" type="time" value={pitch.openTime || ''} onChange={e => updatePitch(index, 'openTime', e.target.value)} />
                                            <Input label="Kapanış (Opsiyonel)" type="time" value={pitch.closeTime || ''} onChange={e => updatePitch(index, 'closeTime', e.target.value)} />
                                        </div>
                                    </div>
                                    <div>
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
            case 5: // Summary
                return (
                    <div className="space-y-4 animate-fadeIn">
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

                {/* Sidebar / Stepper */}
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

                {/* Main Content */}
                <div className="flex-1 flex flex-col p-6 md:p-10 relative">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black text-white italic uppercase tracking-wider">
                            {steps.find(s => s.id === currentStep)?.title}
                        </h2>
                        <span className="text-slate-500 text-sm font-bold">Adım {currentStep} / 5</span>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-sm font-bold flex items-center gap-2">
                            <User className="w-4 h-4" /> {error}
                        </div>
                    )}

                    {/* Step Content */}
                    <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide pb-20">
                        {renderStepContent()}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="absolute bottom-6 left-6 right-6 flex justify-between pt-4 border-t border-slate-800 bg-slate-900">
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

// Helper Components
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
