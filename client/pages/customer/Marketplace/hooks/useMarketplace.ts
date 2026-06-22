import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../../../services/api';
import { Business } from '../../../../types';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';
import { useLocationContext } from '../../../../contexts/LocationContext';
import { useFilterContext } from '../../../../contexts/FilterContext';

const PAGE_SIZE = 50;

export const useMarketplace = () => {
  const { coords, radius, setRadius, requestLocation } = useLocationContext();
  const { selectedDate, setSelectedDate, marketplaceSortBy, setMarketplaceSortBy, isDateFilterModalOpen: isDateFilterOpen, setIsDateFilterModalOpen: setIsDateFilterOpen } = useFilterContext();

  const [matches, setMatches] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const offsetRef = useRef(0);

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

  const fetchAnnouncements = async (off = 0, append = false) => {
    if (!coords) return;
    if (!append) setIsLoading(true);
    else setLoadingMore(true);
    try {
      const params = { offset: off, limit: PAGE_SIZE, lat: coords.lat, lng: coords.lng, radius };
      const res = await api.get('/match-announcements', { params });
      const data = (res.data as any[]).filter((m: any) => m.matchType !== 'kendi_aramizda');
      if (append) setMatches(prev => [...prev, ...data]);
      else setMatches(data);
      setHasMore(data.length >= PAGE_SIZE);
    } catch (err) {
      console.error('Failed to fetch announcements', err);
      if (!append) setMatches([]);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  };

  // ── Initial static data ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        const userResponse = await api.get('/users/me');
        setCurrentUser(userResponse.data);

        if (userResponse.data?.team) {
          api.get(`/challenges/team/${userResponse.data.team.id}`)
            .then(r => setMyChallenges(r.data))
            .catch(() => {});
        }
      } catch (error) {
        console.error('Failed to fetch marketplace static data:', error);
      }
    };
    fetchStaticData();
  }, []);

  // Maç ilanlarına bağlı işletme/saha bilgisi — ilanlar zaten konuma göre
  // filtrelendiğinden, aynı konum/yarıçapla sınırlı tutmak yeterli.
  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    api.get('/businesses', { params: { lat: coords.lat, lng: coords.lng, radius } })
      .then(res => { if (!cancelled) setBusinesses(res.data); })
      .catch(error => console.error('Failed to fetch businesses:', error));
    return () => { cancelled = true; };
  }, [coords, radius]);

  // ── coords/radius değişince sıfırla ve yeniden yükle ────────────────────
  useEffect(() => {
    let cancelled = false;
    const safetyTimer = setTimeout(() => setIsLoading(false), 12000);

    const load = async () => {
      offsetRef.current = 0;
      setHasMore(false);
      setIsLoading(true);
      try {
        if (!coords) {
          setMatches([]);
          return;
        }
        const params = { offset: 0, limit: PAGE_SIZE, lat: coords.lat, lng: coords.lng, radius };
        const res = await api.get('/match-announcements', { params });
        if (cancelled) return;
        const data = (res.data as any[]).filter((m: any) => m.matchType !== 'kendi_aramizda');
        setMatches(data);
        setHasMore(data.length >= PAGE_SIZE);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch announcements', err);
          setMatches([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          clearTimeout(safetyTimer);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [coords, radius]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = () => {
    if (!coords) return;
    if (loadingMore || !hasMore) return;
    const newOff = offsetRef.current + PAGE_SIZE;
    offsetRef.current = newOff;
    fetchAnnouncements(newOff, true);
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
  // Kendi takım ilanları filtre/sıralama bağımsız her zaman en üstte sabitlenir
  const filteredMatches = useMemo(() => {
    const myTeamId = myTeam?.id;
    const myListings = myTeamId ? matches.filter(m => m.teamId === myTeamId) : [];
    const otherListings = myTeamId ? matches.filter(m => m.teamId !== myTeamId) : matches;

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
    return [...myListings, ...sortedOthers];
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
