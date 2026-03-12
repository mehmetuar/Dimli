import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import axios from 'axios';
import api from '../../../../services/api';

export const useUserProfile = () => {
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

            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 3000
            });

            const { latitude, longitude } = position.coords;
            const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const address = response.data.address;
            const locationName = address.district || address.city || address.town || address.state || 'Bilinmeyen Konum';

            const updateRes = await api.patch('/users/me', { location: locationName });
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

    const calculateAge = (birthDate: string | Date) => {
        if (!birthDate) return '-';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

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
