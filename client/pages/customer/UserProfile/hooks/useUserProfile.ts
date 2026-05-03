import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import axios from 'axios';
import api from '../../../../services/api';
import { useLocationContext } from '../../../../contexts/LocationContext';
import { calculateAge } from '../../../../utils/calculateAge';

export const useUserProfile = () => {
    const { coords: contextCoords, updateCoords } = useLocationContext();

    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

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

            const permission = await Geolocation.checkPermissions();
            if (isAuto && permission.location === 'denied') return;

            if (permission.location !== 'granted') {
                const request = await Geolocation.requestPermissions();
                if (request.location !== 'granted') {
                    if (!isAuto) setErrorMessage('Konum izni reddedildi.');
                    if (!isAuto) setIsLoading(false);
                    return;
                }
            }

            // maximumAge: 0 → OS GPS cache'ini hiç kullanma, taze konum al
            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: false,
                timeout: 15000,
                maximumAge: 0
            });

            const { latitude, longitude } = position.coords;

            // Context koordinatlarını da güncelle (tüm sayfalar anlık konumu görsün)
            updateCoords({ lat: latitude, lng: longitude });

            const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const address = response.data.address;
            const locationName = address.district || address.city || address.town || address.state || 'Bilinmeyen Konum';

            const updateRes = await api.patch('/users/me', { location: locationName, latitude, longitude });
            setCurrentUser(updateRes.data);
            setSuccessMessage(`Konum güncellendi: ${locationName}`);
        } catch (error) {
            console.error('Location update failed:', error);
            if (!isAuto) setErrorMessage('Konum alınamadı.');
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
        handleUpdateLocation,
        calculateAge
    };
};
