import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';

export const useTeamSettings = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isCaptain, setIsCaptain] = useState(false);
    const [teamId, setTeamId] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [level, setLevel] = useState('BEGINNER');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [primaryColor, setPrimaryColor] = useState('#3b82f6');
    const [secondaryColor, setSecondaryColor] = useState('#a855f7');

    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Kaydedilmemiş değişiklik takibi: yükleme sonrası anlık görüntü; logo HARİÇ
    // (logo yükleme/silme zaten anında PATCH'lenir). Başarılı kayıtta tazelenir.
    const initialRef = useRef({ name: '', level: 'BEGINNER', primaryColor: '#3b82f6', secondaryColor: '#a855f7' });

    useEffect(() => {
        const fetchTeam = async () => {
            try {
                const userRes = await api.get('/users/me');
                const user = userRes.data;
                if (!user.team) { navigate(-1); return; }

                const teamRes = await api.get(`/teams/${user.team.id}`);
                const team = teamRes.data;

                setTeamId(team.id);
                setName(team.name || '');
                setLevel(team.level || 'BEGINNER');
                setLogoUrl(team.logoUrl || null);
                setPrimaryColor(team.primaryColor || '#3b82f6');
                setSecondaryColor(team.secondaryColor || '#a855f7');
                initialRef.current = {
                    name: team.name || '',
                    level: team.level || 'BEGINNER',
                    primaryColor: team.primaryColor || '#3b82f6',
                    secondaryColor: team.secondaryColor || '#a855f7',
                };

                const captain = team.captain;
                const isCap = (captain && captain.id === user.id) || team.captainId === user.id;
                setIsCaptain(isCap);
            } catch (err) {
                console.error('Failed to load team settings', err);
                setErrorMessage('Takım bilgileri yüklenemedi.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchTeam();
    }, [navigate]);

    const showSuccess = (msg: string) => {
        setSuccessMessage(msg);
        setErrorMessage('');
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const showError = (msg: string) => {
        setErrorMessage(msg);
        setSuccessMessage('');
        setTimeout(() => setErrorMessage(''), 3000);
    };

    const deleteCloudImage = async (url: string) => {
        try {
            await api.post('/files/delete-cloud', { url });
        } catch (err) {
            console.error('Failed to delete cloud image:', err);
        }
    };

    const uploadLogo = async (file: File): Promise<string | null> => {
        if (!teamId) return null;
        setIsUploadingLogo(true);
        const oldLogoUrl = logoUrl;
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            // Cloudinary returns a full secure_url (https://res.cloudinary.com/...)
            const fullUrl: string = res.data.url;
            setLogoUrl(fullUrl);
            // Auto-save to DB immediately — no need to press Kaydet for logo changes
            await api.patch(`/teams/${teamId}`, { logoUrl: fullUrl });
            // Delete old cloud image after successful upload
            if (oldLogoUrl && oldLogoUrl.includes('cloudinary.com')) {
                await deleteCloudImage(oldLogoUrl);
            }
            showSuccess('Logo güncellendi!');
            return fullUrl;
        } catch (err: any) {
            showError(err.response?.data?.message || 'Logo yüklenemedi.');
            return null;
        } finally {
            setIsUploadingLogo(false);
        }
    };

    const removeLogo = async () => {
        if (!teamId) return;
        const oldLogoUrl = logoUrl;
        setLogoUrl(null);
        try {
            await api.patch(`/teams/${teamId}`, { logoUrl: null });
            if (oldLogoUrl && oldLogoUrl.includes('cloudinary.com')) {
                await deleteCloudImage(oldLogoUrl);
            }
        } catch (err) {
            console.error('Failed to remove logo', err);
        }
    };

    const handleSave = async () => {
        if (!teamId || !isCaptain) return;
        if (!name.trim()) { showError('Takım adı boş olamaz.'); return; }

        setIsSaving(true);
        try {
            await api.patch(`/teams/${teamId}`, {
                name: name.trim(),
                level,
                logoUrl: logoUrl ?? null,
                primaryColor,
                secondaryColor,
            });
            showSuccess('Takım ayarları güncellendi!');
            initialRef.current = { name: name.trim(), level, primaryColor, secondaryColor };
        } catch (err: any) {
            showError(err.response?.data?.message || 'Güncelleme başarısız.');
        } finally {
            setIsSaving(false);
        }
    };

    const dirtyFields = {
        name: name !== initialRef.current.name,
        level: level !== initialRef.current.level,
        primaryColor: primaryColor !== initialRef.current.primaryColor,
        secondaryColor: secondaryColor !== initialRef.current.secondaryColor,
    };
    const isDirty = Object.values(dirtyFields).some(Boolean);

    return {
        isLoading,
        isSaving,
        dirtyFields,
        isDirty,
        isUploadingLogo,
        isCaptain,
        teamId,
        name, setName,
        level, setLevel,
        logoUrl, setLogoUrl,
        primaryColor, setPrimaryColor,
        secondaryColor, setSecondaryColor,
        successMessage,
        errorMessage,
        uploadLogo,
        removeLogo,
        handleSave,
        navigate,
    };
};
