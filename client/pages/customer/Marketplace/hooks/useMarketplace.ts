import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import api from '../../../../services/api';
import { Business } from '../../../../types';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';
import { useLocationContext } from '../../../../contexts/LocationContext';
import { useFilterContext } from '../../../../contexts/FilterContext';
import { useCurrentUser } from '../../../../hooks/useCurrentUser';
import { readListCache, writeListCache, MATCHES_CACHE_KEY, MKT_BUSINESSES_CACHE_KEY } from '../../../../utils/listCache';

const PAGE_SIZE = 50;

export const useMarketplace = () => {
  const { coords, radius, setRadius, requestLocation } = useLocationContext();
  const { selectedDate, setSelectedDate, marketplaceSortBy, setMarketplaceSortBy, isDateFilterModalOpen: isDateFilterOpen, setIsDateFilterModalOpen: setIsDateFilterOpen } = useFilterContext();

  // Ortak store — sayfa başına ayrı GET /users/me atılmaz
  const { currentUser } = useCurrentUser();

  // Sahalar deseni (stale-while-revalidate): önbellekli sayfa-0 anında basılır,
  // taze veri arkada çekilir. İşletmeler de önbelleklenir — yoksa önbellekli
  // kartlar 1 RTT boyunca fiyat/ilçesiz ("Konum Yok" flash'ı) kalırdı.
  const [matches, setMatches] = useState<any[]>(() => readListCache(MATCHES_CACHE_KEY));
  const [businesses, setBusinesses] = useState<Business[]>(() => readListCache(MKT_BUSINESSES_CACHE_KEY));
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // DİKKAT: offset sunucu sayfalamasıyla ilerler (istemci kendi_aramizda'yı
  // filtrelediği için matches.length offset olarak kullanılamaz).
  const offsetRef = useRef(0);
  // Yarış korumaları (usePitchBooking referans deseni): her reset bir "nesil"
  // başlatır; eski yanıtlar reset'ten sonra uygulanmaz.
  const matchesRef = useRef<any[]>(matches);
  matchesRef.current = matches;
  const lastFetchKeyRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);
  const fetchGenRef = useRef(0);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [myChallenges, setMyChallenges] = useState<any[]>([]);



  const sortBy = marketplaceSortBy as 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc' | 'fair_play' | 'distance';
  const setSortBy = setMarketplaceSortBy;
  const [isSortOpen, setIsSortOpen] = useState(false);

  const HIDE_MY_KEY = 'marketplace_hide_my_listings';
  const [hideMyListings, setHideMyListingsRaw] = useState(
    () => localStorage.getItem(HIDE_MY_KEY) === 'true'
  );
  const setHideMyListings = (v: boolean) => {
    localStorage.setItem(HIDE_MY_KEY, String(v));
    setHideMyListingsRaw(v);
  };

  const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);

  const locationFilter: LocationFilter = { type: 'NEARBY', radius, coords: coords ?? undefined };

  // ── Takım meydan okumaları — ortak store'daki kullanıcının takımı üzerinden ──
  useEffect(() => {
    const teamId = currentUser?.team?.id;
    if (!teamId) return;
    let cancelled = false;
    api.get(`/challenges/team/${teamId}`)
      .then(r => { if (!cancelled) setMyChallenges(r.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser?.team?.id]);

  // Maç ilanlarına bağlı işletme/saha bilgisi — ilanlar zaten konuma göre
  // filtrelendiğinden, aynı konum/yarıçapla sınırlı tutmak yeterli.
  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    api.get('/businesses', { params: { lat: coords.lat, lng: coords.lng, radius } })
      .then(res => {
        if (cancelled) return;
        setBusinesses(res.data);
        writeListCache(MKT_BUSINESSES_CACHE_KEY, res.data);
      })
      .catch(error => console.error('Failed to fetch businesses:', error));
    return () => { cancelled = true; };
  }, [coords, radius]);

  // Konum-önce + sayfalı çekim. reset=true → sayfa 0 (koordinat/yarıçap değişince);
  // reset=false → sonraki sayfayı ekle. Aynı konum+yarıçap için gereksiz tam
  // yeniden çekim yapılmaz (mount'ta ref'ler sıfır → her mount bir kez tazelenir).
  const doFetch = useCallback(async (reset: boolean, force = false) => {
    if (!coords) return;
    if (!reset && isFetchingRef.current) return;
    const round = (n: number) => n.toFixed(3);
    const key = `${round(coords.lat)}|${round(coords.lng)}|${radius}`;
    if (reset && !force && key === lastFetchKeyRef.current && matchesRef.current.length > 0) {
      return;
    }
    const gen = reset ? ++fetchGenRef.current : fetchGenRef.current;
    const off = reset ? 0 : offsetRef.current + PAGE_SIZE;
    isFetchingRef.current = true;
    if (reset) { setIsLoading(true); setLoadingMore(false); }
    else setLoadingMore(true);
    try {
      const params = { offset: off, limit: PAGE_SIZE, lat: coords.lat, lng: coords.lng, radius };
      const res = await api.get('/match-announcements', { params });
      if (gen !== fetchGenRef.current) return; // daha yeni bir reset bunu geçersiz kıldı
      const data = (res.data as any[]).filter((m: any) => m.matchType !== 'kendi_aramizda');
      offsetRef.current = off; // yalnız başarıda ilerlet
      if (reset) {
        setMatches(data);
        writeListCache(MATCHES_CACHE_KEY, data);
        lastFetchKeyRef.current = key;
      } else {
        setMatches(prev => [...prev, ...data]);
      }
      setHasMore(data.length >= PAGE_SIZE);
    } catch (err) {
      console.error('Failed to fetch announcements', err);
    } finally {
      if (gen === fetchGenRef.current) {
        isFetchingRef.current = false;
        setIsLoading(false);
        setLoadingMore(false);
      }
    }
  }, [coords, radius]);

  // Koordinat / yarıçap değişince sayfa 0'a reset (guard içeride).
  useEffect(() => {
    doFetch(true, false);
  }, [doFetch]);

  const loadMore = () => {
    if (!hasMore || isFetchingRef.current) return;
    doFetch(false, false);
  };

  // İlan yayınlandıktan hemen sonra listeyi tazele (offset başa döner)
  const refetch = () => {
    doFetch(true, true);
  };

  const applyLocationFilter = (filter: LocationFilter) => {
    if (filter.radius) setRadius(filter.radius);
  };

  const myTeam = currentUser?.team;

  const isAuthorized = () => {
    if (!myTeam || !currentUser) return false;
    return myTeam.captainId === currentUser.id || myTeam.viceCaptainIds?.includes(currentUser.id) || false;
  };

  const getPitchDetails = (pitchId: string) => {
    for (const business of businesses) {
      const pitch = business.pitches?.find(p => p.id === pitchId);
      if (pitch) return { pitch, business };
    }
    return { pitch: null, business: null };
  };

  // Birikmiş tüm matches üzerinde client-side date + sort
  // Kendi takım ilanları da tarih filtresine tabidir; seçili tarihe ait olanlar
  // sıralamadan bağımsız her zaman en üstte sabitlenir
  const filteredMatches = useMemo(() => {
    const myTeamId = myTeam?.id;
    const myListings = myTeamId ? matches.filter(m => m.teamId === myTeamId) : [];
    const otherListings = myTeamId ? matches.filter(m => m.teamId !== myTeamId) : matches;

    const filteredMine = !selectedDate
      ? myListings
      : myListings.filter(m => m.date === selectedDate);

    const filteredOthers = !selectedDate
      ? otherListings
      : otherListings.filter(m => m.date === selectedDate);

    const sortedOthers = [...filteredOthers];
    switch (sortBy) {
      case 'date_asc':
        sortedOthers.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
        break;
      case 'date_desc':
        sortedOthers.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
        break;
      case 'price_asc':
        sortedOthers.sort((a, b) => (getPitchDetails(a.pitchId).pitch?.pricePerHour ?? 0) - (getPitchDetails(b.pitchId).pitch?.pricePerHour ?? 0));
        break;
      case 'price_desc':
        sortedOthers.sort((a, b) => (getPitchDetails(b.pitchId).pitch?.pricePerHour ?? 0) - (getPitchDetails(a.pitchId).pitch?.pricePerHour ?? 0));
        break;
      case 'fair_play':
        sortedOthers.sort((a, b) => (b.team?.fairPlayScore ?? 0) - (a.team?.fairPlayScore ?? 0));
        break;
      case 'distance':
        sortedOthers.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
        break;
    }

    if (hideMyListings) return sortedOthers;
    return [...filteredMine, ...sortedOthers];
  }, [matches, businesses, selectedDate, sortBy, myTeam, hideMyListings]);

  useEffect(() => () => setIsDateFilterOpen(false), []);

  return {
    currentUser,
    myTeam,
    matches,
    setMatches,
    businesses,
    isLoading,
    loadingMore,
    hasMore,
    loadMore,
    refetch,
    myChallenges,
    setMyChallenges,
    isCreateModalOpen,
    setIsCreateModalOpen,
    isChallengeModalOpen,
    setIsChallengeModalOpen,
    selectedTeamId,
    setSelectedTeamId,
    selectedMatch,
    setSelectedMatch,
    isLocationFilterOpen,
    setIsLocationFilterOpen,
    locationFilter,
    setLocationFilter: applyLocationFilter,
    userCoords: coords,
    isAuthorized,
    getPitchDetails,
    filteredMatches,
    selectedDate,
    setSelectedDate,
    isDateFilterOpen,
    setIsDateFilterOpen,
    sortBy,
    setSortBy,
    isSortOpen,
    setIsSortOpen,
    hideMyListings,
    setHideMyListings,
    requestLocation,
  };
};
