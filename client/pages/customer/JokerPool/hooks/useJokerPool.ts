import { useState, useEffect, useRef, useCallback } from 'react';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';
import api from '../../../../services/api';
import { useLocationContext } from '../../../../contexts/LocationContext';
import { useCurrentUser } from '../../../../hooks/useCurrentUser';
import { seedCurrentUser } from '../../../../services/currentUserStore';
import { readListCache, writeListCache, JOKERS_CACHE_KEY } from '../../../../utils/listCache';

const PAGE_SIZE = 50;
const POSITION_KEYS = ['kaleci', 'orta_saha', 'forvet', 'defans'];

export const useJokerPool = () => {
    const { coords, radius, setRadius, requestLocation } = useLocationContext();

    // Ortak store: kendi profil pinlemesi (visibleJokers) sıcak cache'te anında çalışır
    const { currentUser } = useCurrentUser();

    // Sahalar deseni (stale-while-revalidate): önbellekli sayfa-0 anında basılır,
    // taze veri arkada çekilir — soğuk açılışta boş liste + spinner beklenmez.
    const [jokers, setJokers] = useState<any[]>(() => readListCache(JOKERS_CACHE_KEY));
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [selectedJoker, setSelectedJoker] = useState<any | null>(null);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
    const [sortBy, setSortBy] = useState<string>('distance');
    const [isSortOpen, setIsSortOpen] = useState(false);

    // Offset hesabı + yarış korumaları (usePitchBooking referans deseni):
    // her reset bir "nesil" başlatır; eski yanıtlar reset'ten sonra uygulanmaz.
    const jokersRef = useRef<any[]>(jokers);
    jokersRef.current = jokers;
    const lastFetchKeyRef = useRef<string | null>(null);
    const isFetchingRef = useRef(false);
    const fetchGenRef = useRef(0);

    const locationFilter: LocationFilter = { type: 'NEARBY', radius, coords: coords ?? undefined };

    const buildParams = (off: number) => {
        const params: Record<string, any> = { offset: off, limit: PAGE_SIZE };
        if (coords) {
            params.lat = coords.lat;
            params.lng = coords.lng;
            params.radius = radius;
        }
        if (POSITION_KEYS.includes(sortBy)) params.position = sortBy;
        if (sortBy === 'ucreteOrtak') params.sharesFee = true;
        if (sortBy === 'ucreteOrtakDegil') params.sharesFee = false;
        return params;
    };

    // Konum-önce + sayfalı çekim. reset=true → sayfa 0 (koordinat/yarıçap/sıralama
    // değişince); reset=false → sonraki sayfayı ekle. Aynı konum+yarıçap+sıralama
    // için gereksiz tam yeniden çekim yapılmaz (mount'ta ref'ler sıfır → her mount
    // yine de bir kez tazelenir).
    const doFetch = useCallback(async (reset: boolean, force = false) => {
        if (!coords) return; // LocationAccessGate coords yokken içeriği zaten gizliyor
        if (!reset && isFetchingRef.current) return;
        const round = (n: number) => n.toFixed(3);
        const key = `${round(coords.lat)}|${round(coords.lng)}|${radius}|${sortBy}`;
        if (reset && !force && key === lastFetchKeyRef.current && jokersRef.current.length > 0) {
            return;
        }
        const gen = reset ? ++fetchGenRef.current : fetchGenRef.current;
        const offset = reset ? 0 : jokersRef.current.length;
        isFetchingRef.current = true;
        if (reset) { setIsLoading(true); setLoadingMore(false); }
        else setLoadingMore(true);
        try {
            const res = await api.get('/users/jokers', { params: buildParams(offset) });
            if (gen !== fetchGenRef.current) return; // daha yeni bir reset bunu geçersiz kıldı
            const { jokers: data, hasMore: more } = res.data;
            if (reset) {
                setJokers(data);
                writeListCache(JOKERS_CACHE_KEY, data);
                lastFetchKeyRef.current = key;
            } else {
                setJokers(prev => [...prev, ...data]);
            }
            setHasMore(more);
        } catch (err) {
            console.error('Failed to fetch jokers:', err);
        } finally {
            if (gen === fetchGenRef.current) {
                isFetchingRef.current = false;
                setIsLoading(false);
                setLoadingMore(false);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coords, radius, sortBy]);

    // Koordinat / yarıçap / sıralama değişince sayfa 0'a reset (guard içeride).
    useEffect(() => {
        doFetch(true, false);
    }, [doFetch]);

    // NOT: Koordinat→sunucu PATCH'i LocationContext'te merkezî yapılıyor
    // (tek yetkili kaynak). Burada ayrıca PATCH atılmıyor.

    const loadMore = () => {
        if (!hasMore || isFetchingRef.current) return;
        doFetch(false, false);
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
            seedCurrentUser(res.data); // ortak store — Profilim/diğer sayfalar da güncellenir
            setIsProfileModalOpen(false);
            doFetch(true, true);
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
        requestLocation,
    };
};
