import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getProfile, updateProfile, changePassword } from '../../../../services/api';
import { seedCurrentUser } from '../../../../services/currentUserStore';
import { useAuth } from '../../../../contexts/AuthContext';
import { normalizeUsername, isValidUsername, USERNAME_INVALID_MESSAGE } from '../../../../utils/username';

export type UsernameStatus = null | 'checking' | 'available' | 'taken';

export const useProfile = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [originalUsername, setOriginalUsername] = useState('');
    const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>(null);
    const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [profileData, setProfileData] = useState<{
        id: string;
        full_name: string;
        username: string;
        phone: string;
        birthDate: string;
        position: string;
        secondaryPosition: string;
        foot: string;
        nationality: string;
        location: string;
        avatarUrl: string | null;
    }>({
        id: '',
        full_name: '',
        username: '',
        phone: '',
        birthDate: '',
        position: '',
        secondaryPosition: '',
        foot: '',
        nationality: 'TR',
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

    const checkUsernameAvailability = useCallback((username: string, original: string, selfId: string) => {
        if (usernameTimerRef.current) {
            clearTimeout(usernameTimerRef.current);
        }
        // original da normalize edilir: DB'de eski büyük harfli ad kalmışsa
        // ("Hakam") değişmemiş alan "alınmış" sanılmasın
        const normalized = normalizeUsername(username);
        if (normalized === normalizeUsername(original) || normalized.length < 3) {
            setUsernameStatus(null);
            return;
        }
        setUsernameStatus('checking');
        usernameTimerRef.current = setTimeout(async () => {
            try {
                const res = await api.get('/users/check-username', {
                    params: { username: normalized, ...(selfId ? { excludeId: selfId } : {}) },
                });
                setUsernameStatus(res.data.available ? 'available' : 'taken');
            } catch {
                setUsernameStatus(null);
            }
        }, 500);
    }, []);

    // Trigger username check whenever username field changes
    useEffect(() => {
        checkUsernameAvailability(profileData.username, originalUsername, profileData.id);
    }, [profileData.username]);

    const loadProfile = async () => {
        setLoadError(false);
        setLoading(true);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        try {
            const user = await getProfile();
            // Ortak depo da tohumlanır — iki kaynağın (yerel form / store) ayrışması önlenir
            if (user) seedCurrentUser(user);
            const username = user.username || '';
            setProfileData({
                id: user.id || '',
                full_name: user.full_name || '',
                username,
                phone: user.phone || '',
                birthDate: user.birthDate ? user.birthDate.split('T')[0] : '',
                position: user.position || '',
                secondaryPosition: user.secondaryPosition || '',
                foot: user.foot || '',
                nationality: user.nationality || 'TR',
                location: user.location || '',
                avatarUrl: user.avatarUrl || null,
            });
            setOriginalUsername(username);
        } catch (error: any) {
            if (!error?.response) {
                window.dispatchEvent(new CustomEvent('auth:sessionExpired'));
            } else {
                setLoadError(true);
            }
        } finally {
            clearTimeout(timer);
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
            const patchRes = await api.patch('/users/me', { avatarUrl: fullUrl });
            // Ortak depo ANINDA güncellenir → Profilim/Chat yeni fotoğrafı hemen gösterir
            seedCurrentUser(patchRes.data ?? { avatarUrl: fullUrl });
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
            const patchRes = await api.patch('/users/me', { avatarUrl: null });
            seedCurrentUser(patchRes.data ?? { avatarUrl: null });
            if (oldUrl && oldUrl.includes('cloudinary.com')) {
                await deleteCloudImage(oldUrl);
            }
        } catch (err) {
            console.error('Failed to remove avatar', err);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (usernameStatus === 'taken') {
            showError('Bu kullanıcı adı zaten kullanılıyor.');
            return;
        }
        if (usernameStatus === 'checking') {
            showError('Kullanıcı adı kontrol ediliyor, lütfen bekleyin.');
            return;
        }
        const normalizedUsername = normalizeUsername(profileData.username);
        if (normalizedUsername !== normalizeUsername(originalUsername) && !isValidUsername(normalizedUsername)) {
            showError(USERNAME_INVALID_MESSAGE);
            return;
        }

        setSaving(true);
        setMessage(null);

        const payload: any = {
            full_name: profileData.full_name,
            username: normalizedUsername,
            position: profileData.position,
            secondaryPosition: profileData.secondaryPosition || null,
            foot: profileData.foot,
            nationality: profileData.nationality || 'TR',
        };
        if (profileData.birthDate) {
            payload.birthDate = profileData.birthDate;
        }

        try {
            const updated = await updateProfile(payload);
            // Ortak depo ANINDA tohumlanır (LocationContext deseni) → Profilim'e
            // dönüşte yeni ad/uyruk 30sn TTL beklemeden görünür.
            seedCurrentUser(updated ?? payload);
            setProfileData(prev => ({ ...prev, username: normalizedUsername }));
            setOriginalUsername(normalizedUsername);
            setUsernameStatus(null);
            showSuccess('Profil başarıyla güncellendi.');
        } catch (error: any) {
            console.error(error);
            if (error.response?.status === 409) {
                showError(error.response.data.message || 'Bu kullanıcı adı zaten kullanılıyor.');
            } else {
                showError('Profil güncellenirken bir hata oluştu.');
            }
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
        await logout();
        navigate('/login');
    };

    return {
        activeTab,
        setActiveTab,
        loading,
        loadError,
        loadProfile,
        saving,
        isUploadingAvatar,
        message,
        setMessage,
        profileData,
        setProfileData,
        originalUsername,
        usernameStatus,
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
