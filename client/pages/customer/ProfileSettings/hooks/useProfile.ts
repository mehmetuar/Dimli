import React, { useState, useEffect } from 'react';
import { getProfile, updateProfile, changePassword, getBusinesses } from '../../../../services/api';

export const useProfile = () => {
    const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [businesses, setBusinesses] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [profileData, setProfileData] = useState<{
        full_name: string;
        username: string;
        phone: string;
        birthDate: string;
        position: string;
        secondaryPosition: string;
        foot: string;
        location: string;
        favoriteBusinessIds: string[];
    }>({
        full_name: '',
        username: '',
        phone: '',
        birthDate: '',
        position: '',
        secondaryPosition: '',
        foot: '',
        location: '',
        favoriteBusinessIds: []
    });

    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const [user, allBusinesses] = await Promise.all([
                getProfile(),
                getBusinesses()
            ]);
            setBusinesses(allBusinesses);
            setProfileData({
                full_name: user.full_name || '',
                username: user.username || '',
                phone: user.phone || '',
                birthDate: user.birthDate ? user.birthDate.split('T')[0] : '',
                position: user.position || '',
                secondaryPosition: user.secondaryPosition || '',
                foot: user.foot || '',
                location: user.location || '',
                favoriteBusinessIds: user.favoriteBusinessIds || []
            });
        } catch (error) {
            console.error('Error loading profile:', error);
            setMessage({ type: 'error', text: 'Profil bilgileri yüklenemedi.' });
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFavorite = (businessId: string) => {
        setProfileData(prev => {
            const isSelected = prev.favoriteBusinessIds.includes(businessId);
            if (isSelected) {
                return { ...prev, favoriteBusinessIds: prev.favoriteBusinessIds.filter(id => id !== businessId) };
            } else {
                if (prev.favoriteBusinessIds.length >= 3) {
                    setMessage({ type: 'error', text: 'En fazla 3 favori işletme seçebilirsiniz.' });
                    return prev;
                }
                return { ...prev, favoriteBusinessIds: [...prev.favoriteBusinessIds, businessId] };
            }
        });
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        const payload = { ...profileData };
        if (!payload.birthDate) {
            delete payload.birthDate;
        }
        if (!payload.secondaryPosition) {
            payload.secondaryPosition = null as any;
        }
        if (!payload.phone) {
            payload.phone = null as any;
        }

        try {
            await updateProfile(payload);
            setMessage({ type: 'success', text: 'Profil başarıyla güncellendi.' });
        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: 'Profil güncellenirken bir hata oluştu.' });
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'Yeni şifreler eşleşmiyor.' });
            return;
        }
        if (passwordData.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Şifre en az 6 karakter olmalıdır.' });
            return;
        }

        setSaving(true);
        setMessage(null);
        try {
            await changePassword({
                oldPassword: passwordData.oldPassword,
                newPassword: passwordData.newPassword
            });
            setMessage({ type: 'success', text: 'Şifre başarıyla değiştirildi.' });
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            console.error(error);
            const errorMsg = error.response?.data?.message || 'Şifre değiştirilemedi. Mevcut şifrenizi kontrol edin.';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setSaving(false);
        }
    };

    return {
        activeTab,
        setActiveTab,
        loading,
        saving,
        message,
        setMessage,
        businesses,
        searchQuery,
        setSearchQuery,
        profileData,
        setProfileData,
        passwordData,
        setPasswordData,
        handleToggleFavorite,
        handleProfileUpdate,
        handlePasswordChange
    };
};
