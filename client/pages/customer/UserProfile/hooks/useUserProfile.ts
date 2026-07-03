import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import api from '../../../../services/api';
import { useLocationContext } from '../../../../contexts/LocationContext';
import { calculateAge } from '../../../../utils/calculateAge';
import { LocationErrorType } from '../../../../components/LocationPermissionSheet';

export const useUserProfile = () => {
    // Konum işi tamamen LocationContext'te merkezî: refreshLocation GPS alır, sunucuya
    // coords PATCH'ler ve ilçeyi (location) sunucudan türetip locationName'e yazar.
    const { refreshLocation, locationName } = useLocationContext();

    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [locationErrorType, setLocationErrorType] = useState<LocationErrorType | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/users/me');
                setCurrentUser(response.data);
            } catch (error) {
                console.error("Failed to fetch user profile", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        if (successMessage || errorMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage('');
                setErrorMessage('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, errorMessage]);

    const handleUpdateLocation = async (isAuto = false) => {
        try {
            if (!isAuto) setIsLoading(true);

            // İzin reddi UX'i için önden kontrol (denied → ayarlar sheet'i).
            // Asıl GPS+senkron işini refreshLocation (context) yapar.
            let permission = await Geolocation.checkPermissions();
            if (isAuto && permission.location === 'denied') return;
            if (permission.location === 'prompt' || permission.location === 'prompt-with-rationale') {
                permission = await Geolocation.requestPermissions();
            }
            if (permission.location === 'denied') {
                if (!isAuto) {
                    setLocationErrorType('permission_denied');
                    setIsLoading(false);
                }
                return;
            }

            // GPS al → sunucuya coords PATCH → sunucu ilçeyi türetir (tek yetkili kaynak)
            await refreshLocation();

            // Güncel kullanıcıyı çek (sunucu-türetilmiş `location` dahil) → yerel state tazelensin
            const res = await api.get('/users/me');
            setCurrentUser(res.data);
            if (!isAuto) {
                setSuccessMessage(
                    res.data?.location ? `Konum güncellendi: ${res.data.location}` : 'Konum güncellendi',
                );
            }
        } catch (error: any) {
            console.error('Location update failed:', error);
            if (!isAuto) {
                const code = error?.code;
                if (code === 2) {
                    setLocationErrorType('gps_disabled');
                } else {
                    setErrorMessage('Konum alınamadı. Lütfen tekrar deneyin.');
                }
            }
        } finally {
            if (!isAuto) setIsLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser && !currentUser.location) {
            handleUpdateLocation(true);
        }
    }, [currentUser?.id]);

    return {
        currentUser,
        isLoading,
        isMenuOpen, setIsMenuOpen,
        isModalOpen, setIsModalOpen,
        errorMessage,
        successMessage,
        locationErrorType,
        // Sunucudan türetilen canlı ilçe — profil kartı bunu currentUser.location'a tercih eder
        liveLocation: locationName,
        clearLocationError: () => setLocationErrorType(null),
        handleUpdateLocation,
        calculateAge
    };
};
