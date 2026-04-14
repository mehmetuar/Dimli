import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import api from '../../../../services/api';
import { Business, Team } from '../../../../types';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';

// ── Haversine distance (km) ─────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

// ── Coord cache shared with Marketplace ────────────────────────────────────
const COORD_CACHE_KEY = 'marketplace_user_coords';
const getCachedCoords = (): { lat: number; lng: number } | null => {
    try { const r = sessionStorage.getItem(COORD_CACHE_KEY); return r ? JSON.parse(r) : null; }
    catch { return null; }
};
const setCachedCoords = (c: { lat: number; lng: number }) => {
    try { sessionStorage.setItem(COORD_CACHE_KEY, JSON.stringify(c)); } catch { /* ignore */ }
};
// ───────────────────────────────────────────────────────────────────────────

export const usePitchBooking = () => {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [expandedBusinessId, setExpandedBusinessId] = useState<string | null>(null);
    const [selectedPitchIdInBusiness, setSelectedPitchIdInBusiness] = useState<Record<string, string>>({});

    const [viewingTeam, setViewingTeam] = useState<Team | null>(null);
    const [offerMode, setOfferMode] = useState<{ matchId: string, teamName: string } | null>(null);

    const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
    const [locationFilter, setLocationFilter] = useState<LocationFilter>({ type: 'ALL' });

    const [myChallenges, setMyChallenges] = useState<any[]>([]);
    const [confirmCancelModal, setConfirmCancelModal] = useState<{ isOpen: boolean; challengeId: string | null }>({ isOpen: false, challengeId: null });
    const [confirmDeleteAdModal, setConfirmDeleteAdModal] = useState<{ isOpen: boolean; adId: string | null }>({ isOpen: false, adId: null });

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createModalPitchId, setCreateModalPitchId] = useState<string | undefined>(undefined);
    const [createModalStartTime, setCreateModalStartTime] = useState<string | undefined>(undefined);

    const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
    const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
    const [reservationPitchId, setReservationPitchId] = useState<string | undefined>(undefined);
    const [reservationStartTime, setReservationStartTime] = useState<string | undefined>(undefined);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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
    const [businessDistances, setBusinessDistances] = useState<Record<string, number>>({});

    const isAuthorized = () => {
        if (!currentUser?.team) return false;
        return currentUser.team.captainId === currentUser.id || currentUser.team.viceCaptainIds?.includes(currentUser.id) || false;
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userRes = await api.get('/users/me');
                setCurrentUser(userRes.data);

                if (userRes.data?.team) {
                    const challengesRes = await api.get(`/challenges/team/${userRes.data.team.id}`);
                    setMyChallenges(challengesRes.data);
                }

                const businessRes = await api.get('/businesses');
                const bList: Business[] = businessRes.data;
                setBusinesses(bList);

                // ── Compute distances ─────────────────────────────────────
                const computeDistances = (coords: { lat: number; lng: number }) => {
                    const map: Record<string, number> = {};
                    bList.forEach(b => {
                        if (b.latitude && b.longitude) {
                            map[b.id] = haversineKm(coords.lat, coords.lng, b.latitude, b.longitude);
                        }
                    });
                    setBusinessDistances(map);
                };

                // Use cached coords first (instant), then refresh GPS
                const cached = getCachedCoords();
                if (cached) computeDistances(cached);

                try {
                    let permStatus = await Geolocation.checkPermissions();
                    if (permStatus.location === 'prompt' || permStatus.location === 'prompt-with-rationale') {
                        permStatus = await Geolocation.requestPermissions();
                    }
                    if (permStatus.location !== 'denied') {
                        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
                        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                        setCachedCoords(coords);
                        computeDistances(coords);
                    }
                } catch (gpsErr) {
                    console.warn('Sahalar GPS unavailable:', gpsErr);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            }
        };
        fetchData();
    }, []);

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

    const getFilteredBusinesses = () => {
        let filtered = [...businesses];
        if (locationFilter.type === 'DISTRICT' && locationFilter.value) {
            filtered = filtered.filter(b => (b.district || '').includes(locationFilter.value!) || (b.city || '').includes(locationFilter.value!));
        }
        return filtered;
    };

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

    const handleReserve = (pitchId: string, startTime: string) => {
        setReservationPitchId(pitchId);
        setReservationStartTime(startTime);
        setIsReservationModalOpen(true);
    };

    const handleReservationSuccess = () => {
        if (reservationPitchId) {
            api.get(`/reservations/pitch/${reservationPitchId}?date=${selectedDate}`)
                .then(res => setReservations(res.data))
                .catch(err => console.error('Failed to refresh reservations:', err));
        }
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

    return {
        businesses, expandedBusinessId, setExpandedBusinessId,
        selectedPitchIdInBusiness, setSelectedPitchIdInBusiness,
        viewingTeam, setViewingTeam,
        offerMode, setOfferMode,
        isLocationFilterOpen, setIsLocationFilterOpen,
        locationFilter, setLocationFilter,
        myChallenges,
        confirmCancelModal, setConfirmCancelModal,
        confirmDeleteAdModal, setConfirmDeleteAdModal,
        isCreateModalOpen, setIsCreateModalOpen,
        createModalPitchId, createModalStartTime,
        isDateFilterOpen, setIsDateFilterOpen,
        isReservationModalOpen, setIsReservationModalOpen,
        reservationPitchId, reservationStartTime,
        selectedDate, setSelectedDate,
        reservations, slotDetailModal, setSlotDetailModal,
        currentUser, pitchAnnouncements,
        businessDistances,
        isAuthorized, getFilteredBusinesses,
        handleSendOffer, handleConfirmCancel, handleConfirmDeleteAd,
        handleCreateAd, handleReserve, handleReservationSuccess, openSlotDetail,
        handleCancelClick, handleDeleteAdClick
    };
};
