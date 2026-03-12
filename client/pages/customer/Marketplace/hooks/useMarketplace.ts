import { useState, useEffect } from 'react';
import api from '../../../../services/api';
import { Business } from '../../../../types';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';

export const useMarketplace = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  
  const [myChallenges, setMyChallenges] = useState<any[]>([]);
  
  // Filter state
  const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState<LocationFilter>({ type: 'ALL' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userResponse = await api.get('/users/me');
        setCurrentUser(userResponse.data);

        const announcementsResponse = await api.get('/match-announcements');
        setMatches(announcementsResponse.data);

        const businessResponse = await api.get('/businesses');
        setBusinesses(businessResponse.data);

        if (userResponse.data?.team) {
          try {
            const challengesRes = await api.get(`/challenges/team/${userResponse.data.team.id}`);
            setMyChallenges(challengesRes.data);
          } catch (err) {
            console.error('Failed to fetch my challenges', err);
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const myTeam = currentUser?.team;

  const isAuthorized = () => {
    if (!myTeam || !currentUser) return false;
    return myTeam.captainId === currentUser.id || myTeam.viceCaptainIds?.includes(currentUser.id) || false;
  };

  const getPitchDetails = (pitchId: string) => {
    for (const business of businesses) {
      const pitch = business.pitches?.find(p => p.id === pitchId);
      if (pitch) {
        return { pitch, business };
      }
    }
    return { pitch: null, business: null };
  };

  const getFilteredMatches = () => {
    let filtered = [...matches].filter(m => m.matchType !== 'kendi_aramizda');

    if (locationFilter.type === 'DISTRICT' && locationFilter.value) {
      filtered = filtered.filter(m => {
        const { business } = getPitchDetails(m.pitchId);
        const loc = business ? `${business.district}, ${business.city}` : m.team?.location || '';
        return loc.includes(locationFilter.value || '');
      });
    }

    return filtered;
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
    setLocationFilter,
    isAuthorized,
    getPitchDetails,
    getFilteredMatches
  };
};
