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
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);

    // Map state (used inside the map modal)
    const [mapCoords, setMapCoords] = useState(DEFAULT_COORDS);
    const [mapFlyTrigger, setMapFlyTrigger] = useState(0);
    const [isLocating, setIsLocating] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [mapLocationLabel, setMapLocationLabel] = useState('');
    // Reverse-geocode sonucu — şehir/ilçe yazımı için yetkili kaynak (etiket parçalamak yerine)
    const [mapGeocode, setMapGeocode] = useState<{ city: string; district: string }>({ city: '', district: '' });
    const [locationErrorType, setLocationErrorType] = useState<LocationErrorType | null>(null);

    // Form state
    const [formData, setFormData] = useState(EMPTY_FORM_DATA);

    // İşletme fotoğrafı — formData'dan AYRI tutulur: PATCH gövdesine karışmamalı,
    // değişikliği yalnız admin onaylı change-request akışından geçer.
    const [coverImageUrl, setCoverImageUrl] = useState('');
    const [pendingChangeRequests, setPendingChangeRequests] = useState<any[]>([]);
    const [submittingPhoto, setSubmittingPhoto] = useState(false);
    const [changeRequestSentModal, setChangeRequestSentModal] = useState(false);

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
            setMapGeocode({ city: b.city || '', district: b.district || '' });
            if (b.latitude && b.longitude) {
                setMapCoords({ lat: b.latitude, lng: b.longitude });
                if (b.city || b.district) setMapLocationLabel(`${b.city || ''} / ${b.district || ''}`);
            }
            setCoverImageUrl(b.coverImageUrl || '');
            try {
                const pendingResp = await api.get(`/businesses/${bId}/change-requests/pending`);
                setPendingChangeRequests(pendingResp.data || []);
            } catch {
                // Bekleyen istekler alınamazsa sayfa yine açılır; rozet görünmez.
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
        setMapGeocode({ city: formData.city, district: formData.district });
        setShowMapModal(true);
    };

    const applyMapSelection = () => {
        setFormData(prev => ({
            ...prev,
            latitude: mapCoords.lat,
            longitude: mapCoords.lng,
            city: mapGeocode.city,
            district: mapGeocode.district,
        }));
        setShowMapModal(false);
    };

    const doReverseGeocode = async (lat: number, lng: number) => {
        setIsGeocoding(true);
        try {
            const info = await locationService.reverseGeocode(lat, lng);
            if (info) {
                setMapLocationLabel(`${info.city} / ${info.district}`);
                setMapGeocode({ city: info.city, district: info.district });
            } else {
                // Geocode başarısız: taşınan pin'e eski (yanlış) il/ilçe yazılmasın
                setMapLocationLabel('');
                setMapGeocode({ city: '', district: '' });
            }
        } catch {
            setMapLocationLabel('');
            setMapGeocode({ city: '', district: '' });
        } finally {
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

    // Fotoğraf değişikliği → admin onay isteği gönder (saha fotoğrafı akışıyla aynı desen)
    const handleSubmitPhotoRequest = async (imageUrl: string) => {
        if (!businessId) return;
        setSubmittingPhoto(true);
        try {
            await api.post(`/businesses/${businessId}/change-requests`, {
                requestedData: { imageUrl },
            });
            setChangeRequestSentModal(true);
            const updated = await api.get(`/businesses/${businessId}/change-requests/pending`);
            setPendingChangeRequests(updated.data || []);
        } catch (error) {
            console.error('Error submitting business photo request:', error);
            alert('Fotoğraf isteği gönderilirken hata oluştu.');
        } finally {
            setSubmittingPhoto(false);
        }
    };

    const hasPendingPhoto = pendingChangeRequests.some(r => r.type === 'BUSINESS_PHOTO_UPDATE');

    return {
        // İşletme fotoğrafı
        coverImageUrl,
        hasPendingPhoto,
        submittingPhoto,
        handleSubmitPhotoRequest,
        changeRequestSentModal, setChangeRequestSentModal,
        navigate,
        loading,
        saving,
        success,
        formData,
        handleChange,
        handleSubmit,
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
