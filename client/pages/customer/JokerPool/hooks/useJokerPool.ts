import { useState, useEffect } from 'react';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';
import { calculateDistance } from '../../../../utils/location';
import api from '../../../../services/api';

export const useJokerPool = () => {
    const [jokers, setJokers] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedJoker, setSelectedJoker] = useState<any | null>(null);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
    const [locationFilter, setLocationFilter] = useState<LocationFilter>({ type: 'ALL' });

    useEffect(() => {
        api.get('/users/me').then(res => setCurrentUser(res.data)).catch(console.error);
    }, []);

    const fetchJokers = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/users/jokers');
            setJokers(res.data);
        } catch (err) {
            console.error('Failed to fetch jokers:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchJokers();
    }, [locationFilter]);

    const visibleJokers = locationFilter.type === 'NEARBY' && locationFilter.coords
        ? jokers.filter(j => {
            if (!j.coordinates) return false;
            const dist = calculateDistance(
                locationFilter.coords!.lat,
                locationFilter.coords!.lng,
                j.coordinates.lat,
                j.coordinates.lng
            );
            return dist <= (locationFilter.radius || 60);
        })
        : jokers;

    const handleSaveProfile = async (data: any) => {
        try {
            const res = await api.patch('/users/me', data);
            setCurrentUser(res.data);
            setIsProfileModalOpen(false);
            fetchJokers();
        } catch (err) {
            console.error('Failed to update profile:', err);
            alert('Profil güncellenemedi.');
        }
    };

    return {
        jokers,
        currentUser,
        isLoading,
        selectedJoker, setSelectedJoker,
        isInviteModalOpen, setIsInviteModalOpen,
        isProfileModalOpen, setIsProfileModalOpen,
        isLocationFilterOpen, setIsLocationFilterOpen,
        locationFilter, setLocationFilter,
        visibleJokers,
        handleSaveProfile,
        fetchJokers
    };
};
