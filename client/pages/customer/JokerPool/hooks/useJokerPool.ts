import { useState, useEffect, useRef } from 'react';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';
import api from '../../../../services/api';
import { useLocationContext } from '../../../../contexts/LocationContext';

const PAGE_SIZE = 50;
const POSITION_KEYS = ['kaleci', 'orta_saha', 'forvet', 'defans'];

export const useJokerPool = () => {
    const { coords, radius, isLocating, setRadius } = useLocationContext();

    const [jokers, setJokers] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [selectedJoker, setSelectedJoker] = useState<any | null>(null);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
    const [sortBy, setSortBy] = useState<string>('distance');
    const [isSortOpen, setIsSortOpen] = useState(false);

    const locationFilter: LocationFilter = { type: 'NEARBY', radius, coords: coords ?? undefined };

    const lastPatchedKey = useRef<string | null>(null);

    useEffect(() => {
        api.get('/users/me').then(res => setCurrentUser(res.data)).catch(console.error);
    }, []);

    const buildParams = (lat: number, lng: number, r: number, sort: string, off: number) => {
        const params: Record<string, any> = { lat, lng, radius: r, offset: off, limit: PAGE_SIZE };
        if (POSITION_KEYS.includes(sort)) params.position = sort;
        if (sort === 'ucreteOrtak') params.sharesFee = true;
        if (sort === 'ucreteOrtakDegil') params.sharesFee = false;
        return params;
    };

    const fetchJokers = async (lat: number, lng: number, r: number, sort: string, off: number, append = false) => {
        if (off === 0) setIsLoading(true);
        else setLoadingMore(true);
        try {
            const res = await api.get('/users/jokers', { params: buildParams(lat, lng, r, sort, off) });
            const { jokers: data, hasMore: more } = res.data;
            if (append) {
                setJokers(prev => [...prev, ...data]);
            } else {
                setJokers(data);
            }
            setHasMore(more);
        } catch (err) {
            console.error('Failed to fetch jokers:', err);
        } finally {
            setIsLoading(false);
            setLoadingMore(false);
        }
    };

    // coords veya radius değişince sıfırla ve yeniden yükle
    useEffect(() => {
        if (!coords) { setJokers([]); return; }
        setOffset(0);
        fetchJokers(coords.lat, coords.lng, radius, sortBy, 0, false);
    }, [coords, radius]); // eslint-disable-line react-hooks/exhaustive-deps

    // sortBy değişince sıfırla ve yeniden yükle
    useEffect(() => {
        if (!coords) return;
        setOffset(0);
        fetchJokers(coords.lat, coords.lng, radius, sortBy, 0, false);
    }, [sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

    // Konum güncellemesi
    useEffect(() => {
        if (!coords) return;
        const key = `${coords.lat},${coords.lng}`;
        if (lastPatchedKey.current === key) return;
        lastPatchedKey.current = key;
        api.patch('/users/me', { latitude: coords.lat, longitude: coords.lng }).catch(() => {});
    }, [coords]);

    const loadMore = () => {
        if (!coords || loadingMore || !hasMore) return;
        const newOffset = offset + PAGE_SIZE;
        setOffset(newOffset);
        fetchJokers(coords.lat, coords.lng, radius, sortBy, newOffset, true);
    };

    const applyLocationFilter = (filter: LocationFilter) => {
        if (filter.radius) setRadius(filter.radius);
    };

    // Kendi profilini listenin başına sabit koy
    const visibleJokers = currentUser
        ? [...jokers.filter(j => j.id === currentUser.id), ...jokers.filter(j => j.id !== currentUser.id)]
        : [...jokers];

    const handleSaveProfile = async (data: any) => {
        try {
            const res = await api.patch('/users/me', data);
            setCurrentUser(res.data);
            setIsProfileModalOpen(false);
            if (coords) {
                setOffset(0);
                fetchJokers(coords.lat, coords.lng, radius, sortBy, 0, false);
            }
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
        loadingMore,
        hasMore,
        loadMore,
        selectedJoker, setSelectedJoker,
        isInviteModalOpen, setIsInviteModalOpen,
        isProfileModalOpen, setIsProfileModalOpen,
        isLocationFilterOpen, setIsLocationFilterOpen,
        sortBy, setSortBy, isSortOpen, setIsSortOpen,
        locationFilter,
        applyLocationFilter,
        visibleJokers,
        handleSaveProfile,
        fetchJokers,
    };
};
