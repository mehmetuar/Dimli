import { useState, useEffect, useRef } from 'react';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';
import api from '../../../../services/api';
import { useLocationContext } from '../../../../contexts/LocationContext';

export const useJokerPool = () => {
    const { coords, radius, isLocating, setRadius } = useLocationContext();

    const [jokers, setJokers] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedJoker, setSelectedJoker] = useState<any | null>(null);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);

    // Computed location filter (for UI components that expect LocationFilter shape)
    const locationFilter: LocationFilter = { type: 'NEARBY', radius, coords: coords ?? undefined };

    // Track last patched coords to avoid redundant PATCH calls
    const lastPatchedKey = useRef<string | null>(null);

    useEffect(() => {
        api.get('/users/me').then(res => setCurrentUser(res.data)).catch(console.error);
    }, []);

    const fetchJokers = async (lat: number, lng: number, r: number) => {
        setIsLoading(true);
        try {
            const res = await api.get('/users/jokers', { params: { lat, lng, radius: r } });
            setJokers(res.data);
        } catch (err) {
            console.error('Failed to fetch jokers:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Re-fetch jokers whenever coords or radius changes (context-driven)
    useEffect(() => {
        if (!coords) {
            setJokers([]);
            return;
        }
        fetchJokers(coords.lat, coords.lng, radius);
    }, [coords, radius]); // eslint-disable-line react-hooks/exhaustive-deps

    // When coords change, update backend so this user appears as joker in the right area
    useEffect(() => {
        if (!coords) return;
        const key = `${coords.lat},${coords.lng}`;
        if (lastPatchedKey.current === key) return;
        lastPatchedKey.current = key;
        api.patch('/users/me', { latitude: coords.lat, longitude: coords.lng }).catch(() => {});
    }, [coords]);

    // Delegate filter change to global context
    const applyLocationFilter = (filter: LocationFilter) => {
        if (filter.radius) setRadius(filter.radius);
    };

    const visibleJokers = currentUser
        ? [
            ...jokers.filter(j => j.id === currentUser.id),
            ...jokers.filter(j => j.id !== currentUser.id)
          ]
        : jokers;

    const handleSaveProfile = async (data: any) => {
        try {
            const res = await api.patch('/users/me', data);
            setCurrentUser(res.data);
            setIsProfileModalOpen(false);
            if (coords) fetchJokers(coords.lat, coords.lng, radius);
        } catch (err) {
            console.error('Failed to update profile:', err);
            alert('Profil güncellenemedi.');
        }
    };

    return {
        jokers,
        currentUser,
        isLoading,
        isLoadingLocation: isLocating && !coords,
        selectedJoker, setSelectedJoker,
        isInviteModalOpen, setIsInviteModalOpen,
        isProfileModalOpen, setIsProfileModalOpen,
        isLocationFilterOpen, setIsLocationFilterOpen,
        locationFilter,
        applyLocationFilter,
        visibleJokers,
        handleSaveProfile,
        fetchJokers
    };
};
