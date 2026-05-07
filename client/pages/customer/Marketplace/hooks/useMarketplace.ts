import { useState, useEffect, useMemo } from 'react';
import api from '../../../../services/api';
import { Business } from '../../../../types';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';
import { useLocationContext } from '../../../../contexts/LocationContext';
import { useFilterContext } from '../../../../contexts/FilterContext';

export const useMarketplace = () => {
  const { coords, radius, permissionStatus, setRadius } = useLocationContext();
  const { selectedDate, setSelectedDate, marketplaceSortBy, setMarketplaceSortBy } = useFilterContext();

  const [matches, setMatches] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [myChallenges, setMyChallenges] = useState<any[]>([]);

  // Date — shared via FilterContext (persisted to localStorage)
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);

  // Sort — shared via FilterContext (persisted to localStorage)
  const sortBy = marketplaceSortBy as 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc' | 'fair_play' | 'distance';
  const setSortBy = setMarketplaceSortBy;
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Location modal visibility (local UI state only)
  const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);

  // ── Computed location filter (for UI components that expect LocationFilter shape) ──
  const locationFilter: LocationFilter = coords
    ? { type: 'NEARBY', radius, coords }
    : { type: 'ALL' };

  // ── Core fetch ────────────────────────────────────────────────────────────
  const fetchAnnouncements = async (lat: number, lng: number, r: number) => {
    try {
      const res = await api.get('/match-announcements', {
        params: { lat, lng, radius: r },
      });
      return (res.data as any[]).filter(m => m.matchType !== 'kendi_aramizda');
    } catch (err) {
      console.error('Failed to fetch announcements', err);
      return [];
    }
  };

  // ── Initial data (user, businesses for getPitchDetails, challenges) ──────
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

  // ── Re-fetch announcements whenever coords or radius changes ─────────────
  // Bug fix: if no coords, show empty list (never show all announcements)
  useEffect(() => {
    let cancelled = false;
    const safetyTimer = setTimeout(() => setIsLoading(false), 12000);

    const load = async () => {
      setIsLoading(true);
      try {
        if (!coords) {
          // No location — show empty, not all announcements
          setMatches([]);
        } else {
          const announcements = await fetchAnnouncements(coords.lat, coords.lng, radius);
          if (!cancelled) setMatches(announcements);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
        clearTimeout(safetyTimer);
      }
    };

    load();
    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [coords, radius]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Manual filter change — delegates to global context ──────────────────
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
        sorted.sort((a, b) => (getPitchDetails(a.pitchId).pitch?.distanceKm ?? 999) - (getPitchDetails(b.pitchId).pitch?.distanceKm ?? 999));
        break;
    }
    return sorted;
  }, [matches, businesses, selectedDate, sortBy]);

  return {
    currentUser,
    myTeam,
    matches,
    setMatches,
    businesses,
    isLoading,
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
    // Backward compat aliases
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
