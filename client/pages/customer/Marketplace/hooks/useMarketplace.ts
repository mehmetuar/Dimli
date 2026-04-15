import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import api from '../../../../services/api';
import { Business } from '../../../../types';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';

// ─────────────────────────────────────────────────────────────────────────────
// Coord cache: survives tab switches and page re-mounts within a session.
// Stored in sessionStorage so it resets on full app restart.
// ─────────────────────────────────────────────────────────────────────────────
const COORD_CACHE_KEY = 'marketplace_user_coords';

const getCachedCoords = (): { lat: number; lng: number } | null => {
  try {
    const raw = sessionStorage.getItem(COORD_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const setCachedCoords = (coords: { lat: number; lng: number }) => {
  try { sessionStorage.setItem(COORD_CACHE_KEY, JSON.stringify(coords)); } catch { /* ignore */ }
};

// ─────────────────────────────────────────────────────────────────────────────

export const useMarketplace = () => {
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

  // Location
  const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState<LocationFilter>({ type: 'ALL' });
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Only true when the OS permission is actually denied — NOT on timeout/error
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

  // ── Core fetch ────────────────────────────────────────────────────────────
  const fetchAnnouncements = async (filter: LocationFilter, coords: { lat: number; lng: number } | null) => {
    try {
      const params: Record<string, any> = {};
      if (filter.type === 'NEARBY' && coords) {
        params.lat = coords.lat;
        params.lng = coords.lng;
        params.radius = filter.radius ?? 20;
      }
      const res = await api.get('/match-announcements', { params });
      return (res.data as any[]).filter(m => m.matchType !== 'kendi_aramizda');
    } catch (err) {
      console.error('Failed to fetch announcements', err);
      return [];
    }
  };

  // ── GPS helper ────────────────────────────────────────────────────────────
  // Returns coords if available, null if permission denied or unavailable.
  // Only sets locationPermissionDenied when permission is ACTUALLY denied.
  const resolveGPS = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      // Use checkPermissions first — avoids re-triggering the iOS dialog unnecessarily
      let permStatus = await Geolocation.checkPermissions();

      if (permStatus.location === 'prompt' || permStatus.location === 'prompt-with-rationale') {
        permStatus = await Geolocation.requestPermissions();
      }

      if (permStatus.location === 'denied') {
        setLocationPermissionDenied(true);
        return null;
      }

      // Permission granted — get position with a generous timeout
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false, // lower accuracy = faster fix
        timeout: 10000,
      });

      setLocationPermissionDenied(false); // clear any stale denied flag
      return { lat: position.coords.latitude, lng: position.coords.longitude };
    } catch (err) {
      // This is a GPS error / timeout, NOT a permission denial
      console.warn('GPS resolve failed (timeout or hw error):', err);
      return null;
    }
  };

  // ── Mount effect (runs every time user enters this screen) ────────────────
  useEffect(() => {
    const fetchData = async () => {
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
            .catch(err => console.error('Failed to fetch challenges', err));
        }

        // ── Check for cached coords from this session ────────────────────────
        const cached = getCachedCoords();

        if (cached) {
          // We have coords from a previous load in this session:
          // → immediately fetch with proximity so distanceKm shows from the start
          const nearbyFilter: LocationFilter = { type: 'NEARBY', radius: 20, coords: cached };
          setUserCoords(cached);
          setLocationFilter(nearbyFilter);

          const announcements = await fetchAnnouncements(nearbyFilter, cached);
          setMatches(announcements);
          setIsLoading(false);

          // Silently refresh GPS in background (updates cache, re-fetches if moved)
          resolveGPS().then(freshCoords => {
            if (!freshCoords) return;
            setCachedCoords(freshCoords);
            if (JSON.stringify(freshCoords) === JSON.stringify(cached)) return; // no change
            setUserCoords(freshCoords);
            const updatedFilter: LocationFilter = { type: 'NEARBY', radius: 20, coords: freshCoords };
            setLocationFilter(updatedFilter);
            fetchAnnouncements(updatedFilter, freshCoords).then(setMatches);
          });
        } else {
          // No cached coords — show all results instantly, then try GPS
          const allAnnouncements = await fetchAnnouncements({ type: 'ALL' }, null);
          setMatches(allAnnouncements);
          setIsLoading(false);

          // Try GPS in background
          const coords = await resolveGPS();
          if (coords) {
            setCachedCoords(coords);
            setUserCoords(coords);
            const nearbyFilter: LocationFilter = { type: 'NEARBY', radius: 20, coords };
            setLocationFilter(nearbyFilter);
            const nearbyAnnouncements = await fetchAnnouncements(nearbyFilter, coords);
            setMatches(nearbyAnnouncements);
          }
        }
      } catch (error) {
        console.error('Failed to fetch marketplace data:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // ── Manual filter change ──────────────────────────────────────────────────
  const applyLocationFilter = async (filter: LocationFilter) => {
    setLocationFilter(filter);

    let coords = userCoords;
    if (filter.type === 'NEARBY' && filter.coords) {
      coords = filter.coords;
      setUserCoords(coords);
      if (coords) setCachedCoords(coords);
    }

    if (filter.type === 'DISTRICT' && filter.value) {
      const all = await fetchAnnouncements({ type: 'ALL' }, null);
      const district = filter.value.toLowerCase();
      setMatches(all.filter((m: any) => {
        const { business } = getPitchDetails(m.pitchId);
        return `${business?.district || ''} ${business?.city || ''}`.toLowerCase().includes(district);
      }));
      return;
    }

    const announcements = await fetchAnnouncements(filter, coords);
    setMatches(announcements);
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
    if (!selectedDate) return matches;
    return matches.filter(m => m.date === selectedDate);
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
    userCoords,
    locationPermissionDenied,
    isAuthorized,
    getPitchDetails,
    getFilteredMatches,
    selectedDate,
    setSelectedDate,
    isDateFilterOpen,
    setIsDateFilterOpen
  };
};
