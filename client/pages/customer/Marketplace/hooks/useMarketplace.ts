import { useState, useEffect } from 'react';
import api from '../../../../services/api';
import { Business } from '../../../../types';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';
import { useLocationContext } from '../../../../contexts/LocationContext';

export const useMarketplace = () => {
  const { coords, radius, permissionStatus, setRadius } = useLocationContext();

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

  // Date
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);

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

  const getFilteredMatches = () => {
    const filtered = !selectedDate
      ? matches
      : matches.filter(m => m.date === selectedDate);

    const myTeamId = myTeam?.id;
    if (!myTeamId) return filtered;

    return [...filtered].sort((a, b) => {
      const aOwn = a.teamId === myTeamId ? 0 : 1;
      const bOwn = b.teamId === myTeamId ? 0 : 1;
      return aOwn - bOwn;
    });
  };

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
    getFilteredMatches,
    selectedDate,
    setSelectedDate,
    isDateFilterOpen,
    setIsDateFilterOpen,
  };
};
