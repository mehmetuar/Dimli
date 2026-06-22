import { useState, useEffect, useMemo } from 'react';
import api from '../../../../services/api';
import { getBusinesses } from '../../../../services/api';
import { Business, Team } from '../../../../types';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';
import { useLocationContext } from '../../../../contexts/LocationContext';
import { useFilterContext } from '../../../../contexts/FilterContext';

export const usePitchBooking = () => {
    const { coords, radius, setRadius, requestLocation } = useLocationContext();
    const { selectedDate, setSelectedDate, pitchSortBy, setPitchSortBy, isDateFilterModalOpen: isDateFilterOpen, setIsDateFilterModalOpen: setIsDateFilterOpen } = useFilterContext();

    const [businesses, setBusinesses] = useState<Business[]>(() => {
        const cached = localStorage.getItem('cached_businesses');
        return cached ? JSON.parse(cached) : [];
    });

    // Clear potentially corrupted cache once to handle schema changes
    useEffect(() => {
        const hasCleared = localStorage.getItem('cache_cleared_v3');
        if (!hasCleared) {
            localStorage.removeItem('cached_businesses');
            localStorage.setItem('cache_cleared_v3', 'true');
        }
    }, []);

    const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(false);
    const [expandedBusinessId, setExpandedBusinessId] = useState<string | null>(null);
    const [selectedPitchIdInBusiness, setSelectedPitchIdInBusiness] = useState<Record<string, string>>({});

    const [viewingTeam, setViewingTeam] = useState<Team | null>(null);
    const [offerMode, setOfferMode] = useState<{ matchId: string, teamName: string } | null>(null);

    const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
    const [myChallenges, setMyChallenges] = useState<any[]>([]);
    const [confirmCancelModal, setConfirmCancelModal] = useState<{ isOpen: boolean; challengeId: string | null }>({ isOpen: false, challengeId: null });
    const [confirmDeleteAdModal, setConfirmDeleteAdModal] = useState<{ isOpen: boolean; adId: string | null }>({ isOpen: false, adId: null });

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createModalPitchId, setCreateModalPitchId] = useState<string | undefined>(undefined);
    const [createModalStartTime, setCreateModalStartTime] = useState<string | undefined>(undefined);

    const [needTeamRoleModal, setNeedTeamRoleModal] = useState<{ isOpen: boolean; reason: 'no_team' | 'no_role' }>({ isOpen: false, reason: 'no_team' });
    // Sort — shared via FilterContext (persisted to localStorage)
    const sortBy = pitchSortBy as 'distance' | 'price_asc' | 'price_desc' | 'rating' | 'rating_count';
    const setSortBy = setPitchSortBy;
    const [isSortOpen, setIsSortOpen] = useState(false);
    // selectedDate — shared via FilterContext (synced with Marketplace, persisted)
    const [reservations, setReservations] = useState<any[]>([]);

    const [slotDetailModal, setSlotDetailModal] = useState<{
        isOpen: boolean;
        slotTime: string | null;
        slotEndTime?: string | null;
        reservations: any[];
        announcements: any[];
        approvedReservation?: any;
    }>({
        isOpen: false,
        slotTime: null,
        slotEndTime: null,
        reservations: [],
        announcements: [],
        approvedReservation: undefined
    });

    const [currentUser, setCurrentUser] = useState<any>(null);
    const [pitchAnnouncements, setPitchAnnouncements] = useState<any[]>([]);

    // Computed location filter (for UI components that expect LocationFilter shape)
    const locationFilter: LocationFilter = { type: 'NEARBY', radius, coords: coords ?? undefined };

    const isAuthorized = () => {
        if (!currentUser?.team) return false;
        return currentUser.team.captainId === currentUser.id || currentUser.team.viceCaptainIds?.includes(currentUser.id) || false;
    };

    // Fetch user + challenges once
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userRes = await api.get('/users/me');
                setCurrentUser(userRes.data);

                if (userRes.data?.team) {
                    const challengesRes = await api.get(`/challenges/team/${userRes.data.team.id}`);
                    setMyChallenges(challengesRes.data);
                }
            } catch (error) {
                console.error('Failed to fetch user data:', error);
            }
        };
        fetchUserData();
    }, []);

    // Re-fetch businesses whenever coords or radius changes
    useEffect(() => {
        if (!coords) return;
        let cancelled = false;
        const fetchBusinessesWithCoords = async () => {
            setIsLoadingBusinesses(true);
            try {
                const bList: Business[] = await getBusinesses({ lat: coords.lat, lng: coords.lng, radius });
                if (!cancelled) {
                    setBusinesses(bList);
                    localStorage.setItem('cached_businesses', JSON.stringify(bList));
                }
            } catch (error) {
                console.error('Failed to fetch businesses:', error);
            } finally {
                if (!cancelled) setIsLoadingBusinesses(false);
            }
        };
        fetchBusinessesWithCoords();
        return () => { cancelled = true; };
    }, [coords, radius]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (expandedBusinessId && selectedPitchIdInBusiness[expandedBusinessId]) {
            const pitchId = selectedPitchIdInBusiness[expandedBusinessId];
            const fetchAnnouncements = async () => {
                try {
                    const response = await api.get(`/match-announcements/pitch/${pitchId}`);
                    setPitchAnnouncements(response.data);
                } catch (error) {
                    console.error('Failed to fetch pitch announcements:', error);
                    setPitchAnnouncements([]);
                }
            };
            fetchAnnouncements();
        } else {
            setPitchAnnouncements([]);
        }
    }, [expandedBusinessId, selectedPitchIdInBusiness]);

    useEffect(() => {
        if (expandedBusinessId && selectedPitchIdInBusiness[expandedBusinessId]) {
            const pitchId = selectedPitchIdInBusiness[expandedBusinessId];
            const fetchReservations = async () => {
                try {
                    const response = await api.get(`/reservations/pitch/${pitchId}?date=${selectedDate}`);
                    setReservations(response.data);
                } catch (error) {
                    console.error('Failed to fetch reservations:', error);
                    setReservations([]);
                }
            };
            fetchReservations();
        } else {
            setReservations([]);
        }
    }, [expandedBusinessId, selectedPitchIdInBusiness, selectedDate]);

    useEffect(() => {
        if (expandedBusinessId) {
            const business = businesses.find(b => b.id === expandedBusinessId);
            if (business?.pitches?.length && !selectedPitchIdInBusiness[expandedBusinessId]) {
                setSelectedPitchIdInBusiness(prev => ({
                    ...prev,
                    [expandedBusinessId]: business.pitches![0].id
                }));
            }
        }
    }, [expandedBusinessId, businesses, selectedPitchIdInBusiness]);

    // Delegate filter change to global context
    const applyLocationFilter = (filter: LocationFilter) => {
        if (filter.radius) setRadius(filter.radius);
    };

    const filteredBusinesses = useMemo(() => {
        const sorted = [...businesses];
        switch (sortBy) {
            case 'price_asc':
                return sorted.sort((a, b) => (a.pitches?.[0]?.pricePerHour ?? 0) - (b.pitches?.[0]?.pricePerHour ?? 0));
            case 'price_desc':
                return sorted.sort((a, b) => (b.pitches?.[0]?.pricePerHour ?? 0) - (a.pitches?.[0]?.pricePerHour ?? 0));
            case 'rating':
                return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
            case 'rating_count':
                return sorted.sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0));
            case 'distance':
            default:
                return sorted.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
        }
    }, [businesses, sortBy]);

    const handleSendOffer = async (note: string) => {
        if (!currentUser?.team || !offerMode) return;
        try {
            const response = await api.post('/challenges', {
                fromTeamId: currentUser.team.id,
                toMatchId: offerMode.matchId,
                note
            });
            setMyChallenges(prev => [...prev, response.data]);
        } catch (error) {
            console.error('Failed to send offer:', error);
        }
    };

    const handleCancelClick = (challengeId: string) => {
        setConfirmCancelModal({ isOpen: true, challengeId });
    };

    const handleDeleteAdClick = (adId: string) => {
        setConfirmDeleteAdModal({ isOpen: true, adId });
    };

    const handleConfirmCancel = async () => {
        if (!confirmCancelModal.challengeId) return;
        try {
            await api.delete(`/challenges/${confirmCancelModal.challengeId}`);
            setMyChallenges(prev => prev.filter(c => c.id !== confirmCancelModal.challengeId));
        } catch (error) {
            console.error('Failed to cancel challenge:', error);
            alert('İptal edilemedi.');
        } finally {
            setConfirmCancelModal({ isOpen: false, challengeId: null });
        }
    };

    const handleConfirmDeleteAd = async () => {
        if (!confirmDeleteAdModal.adId) return;
        try {
            await api.delete(`/match-announcements/${confirmDeleteAdModal.adId}`);
            setPitchAnnouncements(prev => prev.filter(p => p.id !== confirmDeleteAdModal.adId));
        } catch (error) {
            console.error('Failed to delete ad:', error);
            alert('İlan silinemedi.');
        } finally {
            setConfirmDeleteAdModal({ isOpen: false, adId: null });
        }
    };

    const handleCreateAd = (pitchId: string, startTime?: string) => {
        setCreateModalPitchId(pitchId);
        setCreateModalStartTime(startTime);
        setIsCreateModalOpen(true);
    };

    const handleUnauthorizedSlotClick = () => {
        const reason = currentUser?.team
            ? 'no_role'  // takımı var ama kaptan/yardımcı kaptan değil
            : 'no_team'; // hiç takımı yok
        setNeedTeamRoleModal({ isOpen: true, reason });
    };

    const openSlotDetail = (slotTime: string, slotEndTime: string, resList: any[], announcements: any[], approvedReservation?: any) => {
        setSlotDetailModal({
            isOpen: true,
            slotTime,
            slotEndTime,
            reservations: resList,
            announcements,
            approvedReservation
        });
    };

    useEffect(() => () => setIsDateFilterOpen(false), []);

    return {
        businesses, expandedBusinessId, setExpandedBusinessId,
        selectedPitchIdInBusiness, setSelectedPitchIdInBusiness,
        viewingTeam, setViewingTeam,
        offerMode, setOfferMode,
        isLocationFilterOpen, setIsLocationFilterOpen,
        locationFilter, setLocationFilter: applyLocationFilter,
        myChallenges,
        confirmCancelModal, setConfirmCancelModal,
        confirmDeleteAdModal, setConfirmDeleteAdModal,
        isCreateModalOpen, setIsCreateModalOpen,
        createModalPitchId, createModalStartTime,
        isDateFilterOpen, setIsDateFilterOpen,
        needTeamRoleModal, setNeedTeamRoleModal,
        sortBy, setSortBy, isSortOpen, setIsSortOpen,
        selectedDate, setSelectedDate,
        reservations, slotDetailModal, setSlotDetailModal,
        currentUser, pitchAnnouncements,
        isAuthorized, filteredBusinesses,
        applyLocationFilter,
        isLoadingBusinesses,
        handleSendOffer, handleConfirmCancel, handleConfirmDeleteAd,
        handleCreateAd, handleUnauthorizedSlotClick, openSlotDetail,
        handleCancelClick, handleDeleteAdClick,
        requestLocation,
    };
};
