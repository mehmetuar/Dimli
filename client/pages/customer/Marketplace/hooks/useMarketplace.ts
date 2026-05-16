import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../../../services/api';
import { Business } from '../../../../types';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';
import { useLocationContext } from '../../../../contexts/LocationContext';
import { useFilterContext } from '../../../../contexts/FilterContext';

const PAGE_SIZE = 50;

export const useMarketplace = () => {
  const { coords, radius, permissionStatus, setRadius } = useLocationContext();
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

  const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);

  const locationFilter: LocationFilter = coords
    ? { type: 'NEARBY', radius, coords }
    : { type: 'ALL' };

  const fetchAnnouncements = async (lat: number, lng: number, r: number, off = 0, append = false) => {
    if (!append) setIsLoading(true);
    else setLoadingMore(true);
    try {
      const res = await api.get('/match-announcements', {
        params: { lat, lng, radius: r, offset: off, limit: PAGE_SIZE },
      });
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
        const [userResponse, businessResponse] = await Promise.all([
          api.get('/users/me'),
          api.get('/businesses'),
        ]);
        setCurrentUser(userResponse.data);
        setBusinesses(businessResponse.data);

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
        const res = await api.get('/match-announcements', {
          params: { lat: coords.lat, lng: coords.lng, radius, offset: 0, limit: PAGE_SIZE },
        });
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
    if (!coords || loadingMore || !hasMore) return;
    const newOff = offsetRef.current + PAGE_SIZE;
    offsetRef.current = newOff;
    fetchAnnouncements(coords.lat, coords.lng, radius, newOff, true);
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
  const filteredMatches = useMemo(() => {
    const filtered = !selectedDate
      ? matches
      : matches.filter(m => m.date === selectedDate);

    const sorted = [...filtered];
    switch (sortBy) {
      case 'date_asc':
        sorted.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
        break;
      case 'date_desc':
        sorted.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
        break;
      case 'price_asc':
        sorted.sort((a, b) => (getPitchDetails(a.pitchId).pitch?.pricePerHour ?? 0) - (getPitchDetails(b.pitchId).pitch?.pricePerHour ?? 0));
        break;
      case 'price_desc':
        sorted.sort((a, b) => (getPitchDetails(b.pitchId).pitch?.pricePerHour ?? 0) - (getPitchDetails(a.pitchId).pitch?.pricePerHour ?? 0));
        break;
      case 'fair_play':
        sorted.sort((a, b) => (b.team?.fairPlayScore ?? 0) - (a.team?.fairPlayScore ?? 0));
        break;
      case 'distance':
        sorted.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
        break;
    }
    return sorted;
  }, [matches, businesses, selectedDate, sortBy]);

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
    locationPermissionDenied: permissionStatus === 'denied',
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
  };
};
