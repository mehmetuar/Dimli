import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { Save, ArrowLeft, MapPin, AlertTriangle, Loader2, Navigation, X } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Geolocation } from '@capacitor/geolocation';
import { BusinessNavbar } from '../../../components/Business/BusinessNavbar';
import { LocationSelectionModal } from '../../../components/Modals/LocationSelectionModal';
import { locationService } from '../../../services/locationService';

// Sub-component: flies map to new coords
const MapEffect: React.FC<{ lat: number; lng: number; trigger: number }> = ({ lat, lng, trigger }) => {
    const map = useMap();
    useEffect(() => {
        if (map && trigger > 0 && lat && lng) {
            map.panTo({ lat, lng });
            map.setZoom(15);
        }
    }, [trigger, lat, lng, map]);
    return null;
};

export const BusinessInfoSettings: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [businessId, setBusinessId] = useState<string | null>(null);

    // Modal states
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [locationModalStep, setLocationModalStep] = useState<'CITY' | 'DISTRICT'>('CITY');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);

    // Map state (used inside the map modal)
    const [mapCoords, setMapCoords] = useState({ lat: 41.0082, lng: 28.9784 });
    const [mapFlyTrigger, setMapFlyTrigger] = useState(0);
    const [isLocating, setIsLocating] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [mapLocationLabel, setMapLocationLabel] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        city: '',
        district: '',
        latitude: 0,
        longitude: 0,
    });

    useEffect(() => {
        fetchBusinessData();
    }, []);

    const fetchBusinessData = async () => {
        try {
            const ownerId = localStorage.getItem('ownerId');
            if (!ownerId) { navigate('/business/login'); return; }

            const ownerResponse = await api.get(`/business-owner/${ownerId}`);
            const bId = ownerResponse.data.business?.id;
            if (!bId) { alert('İşletme bulunamadı'); return; }
            setBusinessId(bId);

            const businessResponse = await api.get(`/businesses/${bId}`);
            const b = businessResponse.data;
            setFormData({
                name: b.name || '',
                phone: b.phone || '',
                address: b.address || '',
                city: b.city || '',
                district: b.district || '',
                latitude: b.latitude || 41.0082,
                longitude: b.longitude || 28.9784,
            });
            if (b.latitude && b.longitude) {
                setMapCoords({ lat: b.latitude, lng: b.longitude });
                if (b.city || b.district) setMapLocationLabel(`${b.city || ''} / ${b.district || ''}`);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching business data:', error);
            setLoading(false);
        }
    };

    // ── Map Modal Helpers ────────────────────────────────────────────────────
    const openMapModal = () => {
        setMapCoords({ lat: formData.latitude || 41.0082, lng: formData.longitude || 28.9784 });
        setMapLocationLabel(formData.city ? `${formData.city} / ${formData.district}` : '');
        setShowMapModal(true);
    };

    const applyMapSelection = () => {
        setFormData(prev => ({
            ...prev,
            latitude: mapCoords.lat,
            longitude: mapCoords.lng,
            city: mapLocationLabel.split(' / ')[0] || prev.city,
            district: mapLocationLabel.split(' / ')[1] || prev.district,
        }));
        setShowMapModal(false);
    };

    const handleMapLocateMe = async () => {
        setIsLocating(true);
        try {
            const permission = await Geolocation.requestPermissions();
            if (permission.location === 'denied') return;
            const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setMapCoords({ lat, lng });
            setMapFlyTrigger(t => t + 1);
            await doReverseGeocode(lat, lng);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLocating(false);
        }
    };

    const doReverseGeocode = async (lat: number, lng: number) => {
        setIsGeocoding(true);
        try {
            const info = await locationService.reverseGeocode(lat, lng);
            if (info) setMapLocationLabel(`${info.city} / ${info.district}`);
        } catch { /* silent */ } finally {
            setIsGeocoding(false);
        }
    };

    const handleMapClick = async (e: any) => {
        if (!e.detail.latLng) return;
        const lat = e.detail.latLng.lat;
        const lng = e.detail.latLng.lng;
        setMapCoords({ lat, lng });
        await doReverseGeocode(lat, lng);
    };

    // ── Form Submission ──────────────────────────────────────────────────────
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setShowConfirmModal(true); };

    const handleConfirmSave = async () => {
        setShowConfirmModal(false);
        setSaving(true);
        setSuccess(false);
        try {
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

    const handleChange = (field: string, value: string | number) => {
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

            {success && (
                <div className="mx-4 mt-4 p-4 bg-green-600/20 border border-green-500 rounded-xl text-green-500 font-bold text-center">
                    ✓ Bilgileriniz başarıyla güncellendi!
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-4 space-y-6">
                <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-bold mb-2 text-slate-300 uppercase italic">İşletme Adı</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-all font-medium"
                            required
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-bold mb-2 text-slate-300 uppercase italic">Telefon</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                            className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-all font-medium font-mono"
                        />
                    </div>

                    {/* City / District */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-400 font-bold uppercase italic ml-1">Şehir *</label>
                            <button
                                type="button"
                                onClick={() => { setLocationModalStep('CITY'); setIsLocationModalOpen(true); }}
                                className="w-full bg-slate-900 border border-slate-700 text-white p-4 rounded-xl text-left hover:border-orange-500 transition-all font-medium"
                            >
                                {formData.city || 'Şehir Seç...'}
                            </button>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-slate-400 font-bold uppercase italic ml-1">İlçe *</label>
                            <button
                                type="button"
                                disabled={!formData.city}
                                onClick={() => { setLocationModalStep('DISTRICT'); setIsLocationModalOpen(true); }}
                                className={`w-full border p-4 rounded-xl text-left transition-all font-medium ${!formData.city ? 'bg-slate-950 border-slate-800 text-slate-700 cursor-not-allowed' : 'bg-slate-900 border-slate-700 text-white hover:border-orange-500'}`}
                            >
                                {formData.district || 'İlçe Seç...'}
                            </button>
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-sm font-bold mb-2 text-slate-300 uppercase italic">Adres</label>
                        <textarea
                            value={formData.address}
                            onChange={(e) => handleChange('address', e.target.value)}
                            rows={3}
                            className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-all font-medium resize-none"
                        />
                    </div>

                    {/* Map Location Editor */}
                    <div>
                        <label className="block text-sm font-bold mb-2 text-slate-300 uppercase italic">Harita Konumu</label>
                        <button
                            type="button"
                            onClick={openMapModal}
                            className="w-full bg-slate-900 border border-slate-700 hover:border-orange-500 text-white p-4 rounded-xl flex items-center gap-3 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-lg bg-orange-600/20 border border-orange-500/30 flex items-center justify-center group-hover:bg-orange-600/30 transition-colors">
                                <MapPin className="w-5 h-5 text-orange-400" />
                            </div>
                            <div className="text-left flex-1">
                                <div className="font-bold text-sm">
                                    {formData.latitude ? 'Konumu Güncelle' : 'Haritadan Konum Seç'}
                                </div>
                                <div className="text-xs text-slate-500 font-mono mt-0.5">
                                    {formData.latitude
                                        ? `${Number(formData.latitude).toFixed(5)}, ${Number(formData.longitude).toFixed(5)}`
                                        : 'Henüz konum seçilmemiş'}
                                </div>
                            </div>
                            <span className="text-orange-400 text-xs font-bold">DÜZENLE →</span>
                        </button>
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

            {/* ── Location Selection Modal (City/District) ─────────────────── */}
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

            {/* ── Map Location Edit Modal ──────────────────────────────────── */}
            {showMapModal && (
                <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 animate-fade-in">
                    {/* Header */}
                    <div className="flex items-center gap-3 p-4 bg-slate-900 border-b border-slate-700">
                        <button
                            onClick={() => setShowMapModal(false)}
                            className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                        <div className="flex-1">
                            <h2 className="font-bold text-white text-base">Haritadan Konum Seç</h2>
                            <p className="text-xs text-slate-400">Haritaya tıklayın veya konumunuzu kullanın</p>
                        </div>
                        <button
                            onClick={handleMapLocateMe}
                            disabled={isLocating}
                            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all"
                        >
                            {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                            {isLocating ? 'Bulunuyor' : 'Konumumu Bul'}
                        </button>
                    </div>

                    {/* Map */}
                    <div className="flex-1 relative z-[1]">
                        <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                            <Map
                                defaultCenter={{ lat: mapCoords.lat, lng: mapCoords.lng }}
                                defaultZoom={14}
                                gestureHandling={'greedy'}
                                disableDefaultUI={true}
                                mapId="DEMO_MAP_ID_2"
                                onClick={handleMapClick}
                            >
                                <AdvancedMarker position={{ lat: mapCoords.lat, lng: mapCoords.lng }} />
                                <MapEffect lat={mapCoords.lat} lng={mapCoords.lng} trigger={mapFlyTrigger} />
                            </Map>
                        </APIProvider>
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-slate-900 border-t border-slate-700 space-y-3">
                        <div className="flex items-center gap-2 min-h-[28px]">
                            {isGeocoding ? (
                                <div className="flex items-center gap-2 text-orange-400 text-sm animate-pulse">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Konum bilgisi alınıyor...
                                </div>
                            ) : mapLocationLabel ? (
                                <div className="flex items-center gap-1.5 text-green-400 text-sm font-bold bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {mapLocationLabel}
                                </div>
                            ) : (
                                <span className="text-slate-500 text-xs">Haritaya tıklayarak konum seçin</span>
                            )}
                            <div className="ml-auto text-[10px] text-slate-600 font-mono">
                                {mapCoords.lat.toFixed(5)}, {mapCoords.lng.toFixed(5)}
                            </div>
                        </div>

                        <button
                            onClick={applyMapSelection}
                            className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-xl font-black uppercase tracking-wider transition-all shadow-lg shadow-orange-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <MapPin className="w-5 h-5" />
                            BU KONUMU KAYDET
                        </button>
                    </div>
                </div>
            )}

            {/* ── Confirmation Modal ───────────────────────────────────────── */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setShowConfirmModal(false)}>
                    <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-600"></div>
                        <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-orange-500" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2 text-center italic uppercase">Emin misiniz?</h3>
                        <p className="text-slate-400 mb-8 text-center font-medium">İşletme bilgileriniz güncellenecektir.</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={handleConfirmSave} className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl transition-all shadow-lg shadow-orange-600/20 uppercase tracking-wider active:scale-[0.98]">
                                EVET, KAYDET
                            </button>
                            <button onClick={() => setShowConfirmModal(false)} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all uppercase tracking-wider">
                                İPTAL
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
