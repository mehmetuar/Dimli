import { useState, useEffect } from 'react';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';
import api from '../../../../services/api';
import { useLocationContext } from '../../../../contexts/LocationContext';

const PAGE_SIZE = 50;
const POSITION_KEYS = ['kaleci', 'orta_saha', 'forvet', 'defans'];

export const useJokerPool = () => {
    const { coords, radius, setRadius, requestLocation } = useLocationContext();

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

    useEffect(() => {
        api.get('/users/me').then(res => setCurrentUser(res.data)).catch(console.error);
    }, []);

    const buildParams = (sort: string, off: number, lat?: number, lng?: number, r?: number) => {
        const params: Record<string, any> = { offset: off, limit: PAGE_SIZE };
        if (lat !== undefined && lng !== undefined && r !== undefined) {
            params.lat = lat;
            params.lng = lng;
            params.radius = r;
        }
        if (POSITION_KEYS.includes(sort)) params.position = sort;
        if (sort === 'ucreteOrtak') params.sharesFee = true;
        if (sort === 'ucreteOrtakDegil') params.sharesFee = false;
        return params;
    };

    const fetchJokers = async (sort: string, off: number, append = false, lat?: number, lng?: number, r?: number) => {
        if (off === 0) setIsLoading(true);
        else setLoadingMore(true);
        try {
            const res = await api.get('/users/jokers', { params: buildParams(sort, off, lat, lng, r) });
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
        fetchJokers(sortBy, 0, false, coords.lat, coords.lng, radius);
    }, [coords, radius]); // eslint-disable-line react-hooks/exhaustive-deps

    // sortBy değişince sıfırla ve yeniden yükle
    useEffect(() => {
        if (!coords) return;
        setOffset(0);
        fetchJokers(sortBy, 0, false, coords.lat, coords.lng, radius);
    }, [sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

    // NOT: Koordinat→sunucu PATCH'i artık LocationContext'te merkezî yapılıyor
    // (tek yetkili kaynak). Burada ayrıca PATCH atılmıyor.

    const loadMore = () => {
        if (!coords) return;
        if (loadingMore || !hasMore) return;
        const newOffset = offset + PAGE_SIZE;
        setOffset(newOffset);
        fetchJokers(sortBy, newOffset, true, coords?.lat, coords?.lng, radius);
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
                fetchJokers(sortBy, 0, false, coords.lat, coords.lng, radius);
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
        requestLocation,
    };
};
