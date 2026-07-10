import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import { getOwnerId } from '../../../../services/authStorage';

interface OwnerFormData {
    fullName: string;
    email: string;
}

// Basit e-posta biçim kontrolü (kesin doğrulama sunucu @IsEmail ile yapılır).
const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Yetkili (BusinessOwner) profil sayfası: ad soyad + e-posta düzenlenir, telefon salt-okunur.
// Okuma mevcut GET /business-owner/:id ucundan (fullName/email/phone zaten döner);
// yazma yeni guard'lı PATCH /business-owner/profile ucundan.
export const useBusinessOwnerProfile = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const [formData, setFormData] = useState<OwnerFormData>({ fullName: '', email: '' });
    const [phone, setPhone] = useState(''); // salt-okunur — asla gönderilmez
    const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; email?: string }>({});

    useEffect(() => {
        fetchOwnerData();
    }, []);

    const fetchOwnerData = async () => {
        try {
            const ownerId = getOwnerId();
            if (!ownerId) { navigate('/business/login'); return; }
            const resp = await api.get(`/business-owner/${ownerId}`);
            setFormData({
                fullName: resp.data.fullName || '',
                email: resp.data.email || '',
            });
            setPhone(resp.data.phone || '');
            setLoading(false);
        } catch (error) {
            console.error('Error fetching owner data:', error);
            setLoading(false);
        }
    };

    const handleChange = (field: keyof OwnerFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    };

    const validate = (): boolean => {
        const errors: { fullName?: string; email?: string } = {};
        if (!formData.fullName.trim()) errors.fullName = 'Ad Soyad zorunludur';
        if (!formData.email.trim()) errors.email = 'E-Posta zorunludur';
        else if (!isValidEmail(formData.email.trim())) errors.email = 'Geçerli bir e-posta giriniz';
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setShowConfirmModal(true);
    };

    const handleConfirmSave = async () => {
        setShowConfirmModal(false);
        setSaving(true);
        setSuccess(false);
        try {
            const resp = await api.patch('/business-owner/profile', {
                fullName: formData.fullName.trim(),
                email: formData.email.trim(),
            });
            setFormData({
                fullName: resp.data.fullName || formData.fullName.trim(),
                email: resp.data.email || formData.email.trim(),
            });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error: any) {
            // Sunucu Türkçe mesaj döner (ör. e-posta çakışması) — ilgili alana bas.
            const msg = error?.response?.data?.message;
            const text = Array.isArray(msg) ? msg[0] : msg;
            if (error?.response?.status === 409 || (typeof text === 'string' && text.toLowerCase().includes('posta'))) {
                setFieldErrors(prev => ({ ...prev, email: text || 'Bu e-posta zaten kullanımda.' }));
            } else {
                alert(text || 'Güncelleme başarısız oldu.');
            }
        } finally {
            setSaving(false);
        }
    };

    return {
        navigate,
        loading,
        saving,
        success,
        formData,
        phone,
        fieldErrors,
        handleChange,
        handleSubmit,
        showConfirmModal, setShowConfirmModal,
        handleConfirmSave,
    };
};
