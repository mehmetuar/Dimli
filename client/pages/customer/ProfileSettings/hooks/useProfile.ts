import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getProfile, updateProfile, changePassword } from '../../../../services/api';

export const useProfile = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [profileData, setProfileData] = useState<{
        full_name: string;
        username: string;
        birthDate: string;
        position: string;
        secondaryPosition: string;
        foot: string;
        location: string;
        avatarUrl: string | null;
    }>({
        full_name: '',
        username: '',
        birthDate: '',
        position: '',
        secondaryPosition: '',
        foot: '',
        location: '',
        avatarUrl: null,
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
            const user = await getProfile();
            setProfileData({
                full_name: user.full_name || '',
                username: user.username || '',
                birthDate: user.birthDate ? user.birthDate.split('T')[0] : '',
                position: user.position || '',
                secondaryPosition: user.secondaryPosition || '',
                foot: user.foot || '',
                location: user.location || '',
                avatarUrl: user.avatarUrl || null,
            });
        } catch (error) {
            console.error('Error loading profile:', error);
            setMessage({ type: 'error', text: 'Profil bilgileri yüklenemedi.' });
        } finally {
            setLoading(false);
        }
    };

    const showSuccess = (msg: string) => {
        setMessage({ type: 'success', text: msg });
        setTimeout(() => setMessage(null), 3000);
    };

    const showError = (msg: string) => {
        setMessage({ type: 'error', text: msg });
        setTimeout(() => setMessage(null), 3000);
    };

    const deleteCloudImage = async (url: string) => {
        try {
            await api.post('/files/delete-cloud', { url });
        } catch (err) {
            console.error('Failed to delete cloud image:', err);
        }
    };

    const uploadAvatar = async (file: File): Promise<void> => {
        setIsUploadingAvatar(true);
        const oldUrl = profileData.avatarUrl;
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const fullUrl: string = res.data.url;
            setProfileData(prev => ({ ...prev, avatarUrl: fullUrl }));
            await api.patch('/users/me', { avatarUrl: fullUrl });
            if (oldUrl && oldUrl.includes('cloudinary.com')) {
                await deleteCloudImage(oldUrl);
            }
            showSuccess('Profil fotoğrafı güncellendi!');
        } catch (err: any) {
            showError(err.response?.data?.message || 'Fotoğraf yüklenemedi.');
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const removeAvatar = async (): Promise<void> => {
        const oldUrl = profileData.avatarUrl;
        setProfileData(prev => ({ ...prev, avatarUrl: null }));
        try {
            await api.patch('/users/me', { avatarUrl: null });
            if (oldUrl && oldUrl.includes('cloudinary.com')) {
                await deleteCloudImage(oldUrl);
            }
        } catch (err) {
            console.error('Failed to remove avatar', err);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        const payload: any = {
            full_name: profileData.full_name,
            username: profileData.username,
            position: profileData.position,
            secondaryPosition: profileData.secondaryPosition || null,
            foot: profileData.foot,
        };
        if (profileData.birthDate) {
            payload.birthDate = profileData.birthDate;
        }

        try {
            await updateProfile(payload);
            showSuccess('Profil başarıyla güncellendi.');
        } catch (error: any) {
            console.error(error);
            showError('Profil güncellenirken bir hata oluştu.');
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
            showSuccess('Şifre başarıyla değiştirildi.');
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            console.error(error);
            const errorMsg = error.response?.data?.message || 'Şifre değiştirilemedi. Mevcut şifrenizi kontrol edin.';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setSaving(false);
        }
    };

    const deleteAccount = async (reason: string, note: string, password: string): Promise<void> => {
        await api.delete('/users/me', { data: { reason, note, password } });
        localStorage.clear();
        navigate('/login');
    };

    return {
        activeTab,
        setActiveTab,
        loading,
        saving,
        isUploadingAvatar,
        message,
        setMessage,
        profileData,
        setProfileData,
        passwordData,
        setPasswordData,
        uploadAvatar,
        removeAvatar,
        handleProfileUpdate,
        handlePasswordChange,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        deleteAccount,
    };
};
