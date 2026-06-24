import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Geolocation } from '@capacitor/geolocation';
import api from '../../../../services/api';
import { getOwnerId } from '../../../../services/authStorage';
import { locationService } from '../../../../services/locationService';
import { LocationErrorType } from '../../../../components/LocationPermissionSheet';

const DEFAULT_COORDS = { lat: 41.0082, lng: 28.9784 };

const EMPTY_FORM_DATA = {
    name: '',
    address: '',
    city: '',
    district: '',
    latitude: 0,
    longitude: 0,
};

export const useBusinessInfoSettings = () => {
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
    const [mapCoords, setMapCoords] = useState(DEFAULT_COORDS);
    const [mapFlyTrigger, setMapFlyTrigger] = useState(0);
    const [isLocating, setIsLocating] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [mapLocationLabel, setMapLocationLabel] = useState('');
    const [locationErrorType, setLocationErrorType] = useState<LocationErrorType | null>(null);

    // Form state
    const [formData, setFormData] = useState(EMPTY_FORM_DATA);

    useEffect(() => {
        fetchBusinessData();
    }, []);

    const fetchBusinessData = async () => {
        try {
            const ownerId = getOwnerId();
            if (!ownerId) { navigate('/business/login'); return; }

            const ownerResponse = await api.get(`/business-owner/${ownerId}`);
            const bId = ownerResponse.data.business?.id;
            if (!bId) { alert('İşletme bulunamadı'); return; }
            setBusinessId(bId);

            const businessResponse = await api.get(`/businesses/${bId}`);
            const b = businessResponse.data;
            setFormData({
                name: b.name || '',
                address: b.address || '',
                city: b.city || '',
                district: b.district || '',
                latitude: b.latitude || DEFAULT_COORDS.lat,
                longitude: b.longitude || DEFAULT_COORDS.lng,
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
        setMapCoords({ lat: formData.latitude || DEFAULT_COORDS.lat, lng: formData.longitude || DEFAULT_COORDS.lng });
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

    const doReverseGeocode = async (lat: number, lng: number) => {
        setIsGeocoding(true);
        try {
            const info = await locationService.reverseGeocode(lat, lng);
            if (info) setMapLocationLabel(`${info.city} / ${info.district}`);
        } catch { /* silent */ } finally {
            setIsGeocoding(false);
        }
    };

    const handleMapLocateMe = async () => {
        setIsLocating(true);
        try {
            const permission = await Geolocation.requestPermissions();
            if (permission.location === 'denied') {
                setLocationErrorType('permission_denied');
                return;
            }
            const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setMapCoords({ lat, lng });
            setMapFlyTrigger(t => t + 1);
            await doReverseGeocode(lat, lng);
        } catch (err: any) {
            console.error(err);
            const code = err?.code;
            if (code === 1) setLocationErrorType('permission_denied');
            else if (code === 2) setLocationErrorType('gps_disabled');
        } finally {
            setIsLocating(false);
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

    const handleLocationSelect = (city: string, district: string) => {
        setFormData(prev => ({ ...prev, city, district }));
    };

    return {
        navigate,
        loading,
        saving,
        success,
        formData,
        handleChange,
        handleSubmit,
        // Location (city/district) modal
        isLocationModalOpen, setIsLocationModalOpen,
        locationModalStep, setLocationModalStep,
        handleLocationSelect,
        // Map modal
        showMapModal, setShowMapModal,
        mapCoords,
        mapFlyTrigger,
        isLocating,
        isGeocoding,
        mapLocationLabel,
        openMapModal,
        applyMapSelection,
        handleMapLocateMe,
        handleMapClick,
        // Location permission sheet
        locationErrorType, setLocationErrorType,
        // Confirmation modal
        showConfirmModal, setShowConfirmModal,
        handleConfirmSave,
    };
};
