import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { classifyGeoError } from '../../../../utils/geolocationErrors';
import { useLocationContext } from '../../../../contexts/LocationContext';
import { useCurrentUser } from '../../../../hooks/useCurrentUser';
import { calculateAge } from '../../../../utils/calculateAge';
import { LocationErrorType } from '../../../../components/LocationPermissionSheet';

export const useUserProfile = () => {
    // Konum işi tamamen LocationContext'te merkezî: refreshLocation GPS alır, sunucuya
    // coords PATCH'ler ve ilçeyi (location) sunucudan türetip locationName'e yazar.
    // PATCH yanıtı ortak kullanıcı store'unu da beslediğinden ayrıca GET gerekmez.
    const { refreshLocation, locationName, isLocating, isSyncing } = useLocationContext();

    // Ortak store: sıcak cache'te anında dolu — sayfa her girişte ağı beklemez.
    const { currentUser, isLoading } = useCurrentUser();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [locationErrorType, setLocationErrorType] = useState<LocationErrorType | null>(null);

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
            // İzin reddi UX'i için önden kontrol (denied → ayarlar sheet'i).
            // Asıl GPS+senkron işini refreshLocation (context) yapar.
            let permission = await Geolocation.checkPermissions();
            if (isAuto && permission.location === 'denied') return;
            if (permission.location === 'prompt' || permission.location === 'prompt-with-rationale') {
                permission = await Geolocation.requestPermissions();
            }
            if (permission.location === 'denied') {
                if (!isAuto) setLocationErrorType('permission_denied');
                return;
            }

            // GPS al → sunucuya coords PATCH → sunucu ilçeyi türetir (tek yetkili kaynak).
            // PATCH yanıtı hem locationName'i hem ortak kullanıcı store'unu günceller.
            const name = await refreshLocation();
            if (!isAuto) {
                setSuccessMessage(name ? `Konum güncellendi: ${name}` : 'Konum güncellendi');
            }
        } catch (error: any) {
            console.error('Location update failed:', error);
            if (!isAuto) {
                // §103: tek kaynak sınıflandırıcı (numeric code Android'de hiç yoktu)
                const cls = classifyGeoError(error);
                if (cls === 'gps_disabled') {
                    setLocationErrorType('gps_disabled');
                } else if (cls === 'denied') {
                    setLocationErrorType('permission_denied');
                } else {
                    setErrorMessage('Konum alınamadı. Lütfen tekrar deneyin.');
                }
            }
        }
    };

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
        // GPS alınıyor veya sunucu senkronu sürüyor — KONUM hücresi sessiz gösterge basar
        isLocationUpdating: isLocating || isSyncing,
        clearLocationError: () => setLocationErrorType(null),
        handleUpdateLocation,
        calculateAge
    };
};
