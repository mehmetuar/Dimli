import { useState, useEffect } from 'react';
import api from '../../../../services/api';
import { Business } from '../../../../types';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';
import { useLocationContext } from '../../../../contexts/LocationContext';
import { useFilterContext } from '../../../../contexts/FilterContext';

const PAGE_SIZE = 50;

export const useMarketplace = () => {
  const { coords, radius, permissionStatus, setRadius } = useLocationContext();
  const { selectedDate, setSelectedDate, marketplaceSortBy, setMarketplaceSortBy } = useFilterContext();

  const [matches, setMatches] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [myChallenges, setMyChallenges] = useState<any[]>([]);

  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);

  const sortBy = marketplaceSortBy as 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc' | 'fair_play' | 'distance';
  const setSortBy = setMarketplaceSortBy;
  const [isSortOpen, setIsSortOpen] = useState(false);

  const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);

  const locationFilter: LocationFilter = coords
    ? { type: 'NEARBY', radius, coords }
    : { type: 'ALL' };

  const fetchAnnouncements = async (
    lat: number, lng: number, r: number,
    date: string | null, sort: string,
    off: number, append = false,
  ) => {
    if (off === 0) setIsLoading(true);
    else setLoadingMore(true);
    try {
      const res = await api.get('/match-announcements', {
        params: {
          lat, lng, radius: r,
          date: date || undefined,
          sortBy: sort,
          offset: off,
          limit: PAGE_SIZE,
        },
      });
      const responseData = res.data;
      const data: any[] = Array.isArray(responseData)
        ? responseData.filter((m: any) => m.matchType !== 'kendi_aramizda')
        : (responseData.data ?? []);
      const more: boolean = Array.isArray(responseData) ? false : (responseData.hasMore ?? false);
      if (append) setMatches(prev => [...prev, ...data]);
      else setMatches(data);
      setHasMore(more);
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

  // ── coords/radius değişince sıfırla ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const safetyTimer = setTimeout(() => setIsLoading(false), 12000);

    const load = async () => {
      setOffset(0);
      if (!coords) {
        setMatches([]);
        setIsLoading(false);
        clearTimeout(safetyTimer);
        return;
      }
      await fetchAnnouncements(coords.lat, coords.lng, radius, selectedDate, sortBy, 0, false);
      if (!cancelled) clearTimeout(safetyTimer);
    };

    load();
    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [coords, radius]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── selectedDate veya sortBy değişince sıfırla ──────────────────────────
  useEffect(() => {
    if (!coords) return;
    setOffset(0);
    fetchAnnouncements(coords.lat, coords.lng, radius, selectedDate, sortBy, 0, false);
  }, [selectedDate, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = () => {
    if (!coords || loadingMore || !hasMore) return;
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    fetchAnnouncements(coords.lat, coords.lng, radius, selectedDate, sortBy, newOffset, true);
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
    filteredMatches: matches, // backward compat — artık server-side filtered
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
