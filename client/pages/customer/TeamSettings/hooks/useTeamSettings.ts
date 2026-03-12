import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../services/api';

export const useTeamSettings = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isCaptain, setIsCaptain] = useState(false);
    const [teamId, setTeamId] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [level, setLevel] = useState('BEGINNER');
    const [location, setLocation] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [primaryColor, setPrimaryColor] = useState('bg-blue-500');
    const [secondaryColor, setSecondaryColor] = useState('bg-purple-500');

    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

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
                setLocation(team.location || '');
                setLogoUrl(team.logoUrl || '');
                setPrimaryColor(team.primaryColor || 'bg-blue-500');
                setSecondaryColor(team.secondaryColor || 'bg-purple-500');

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

    const handleSave = async () => {
        if (!teamId || !isCaptain) return;
        if (!name.trim()) { showError('Takım adı boş olamaz.'); return; }

        setIsSaving(true);
        try {
            await api.patch(`/teams/${teamId}`, {
                name: name.trim(),
                level,
                location: location.trim(),
                logoUrl: logoUrl.trim(),
                primaryColor,
                secondaryColor,
            });
            showSuccess('Takım ayarları güncellendi!');
        } catch (err: any) {
            showError(err.response?.data?.message || 'Güncelleme başarısız.');
        } finally {
            setIsSaving(false);
        }
    };

    return {
        isLoading,
        isSaving,
        isCaptain,
        teamId,
        name, setName,
        level, setLevel,
        location, setLocation,
        logoUrl, setLogoUrl,
        primaryColor, setPrimaryColor,
        secondaryColor, setSecondaryColor,
        successMessage,
        errorMessage,
        handleSave,
        navigate
    };
};
