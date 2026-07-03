import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../../../services/api';
import { getBusinessesPaged } from '../../../../services/api';
import { getErrorMessage } from '../../../../utils/apiError';
import { Business, Team } from '../../../../types';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';
import { useLocationContext } from '../../../../contexts/LocationContext';
import { useFilterContext } from '../../../../contexts/FilterContext';
import { useCurrentUser } from '../../../../hooks/useCurrentUser';

export const usePitchBooking = () => {
    const { coords, radius, setRadius, requestLocation } = useLocationContext();
    const { selectedDate, setSelectedDate, pitchSortBy, setPitchSortBy, isDateFilterModalOpen: isDateFilterOpen, setIsDateFilterModalOpen: setIsDateFilterOpen } = useFilterContext();

    const [businesses, setBusinesses] = useState<Business[]>(() => {
        try {
            const cached = localStorage.getItem('cached_businesses');
            return cached ? JSON.parse(cached) : [];
        } catch { return []; } // bozuk cache hook'u çökertmesin
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
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    // Offset hesabı ve B3 (gereksiz yeniden çekim) guard'ı için ref'ler.
    const businessesRef = useRef<Business[]>(businesses);
    businessesRef.current = businesses;
    const lastFetchKeyRef = useRef<string | null>(null);
    const isFetchingRef = useRef(false);
    // Yarış guard'ı: her reset bir "nesil" başlatır; eski (loadMore) yanıtlar reset'ten
    // sonra uygulanmaz (yanlış sırada ekleme olmaz).
    const fetchGenRef = useRef(0);
    const PAGE_SIZE = 20;
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
    // Kapalı/dolu saate istek denemesinde gösterilen uyarı (server mesajı).
    const [slotWarning, setSlotWarning] = useState<string | null>(null);

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

    // Ortak store — sayfa başına ayrı GET /users/me atılmaz
    const { currentUser } = useCurrentUser();
    const [pitchAnnouncements, setPitchAnnouncements] = useState<any[]>([]);

    // Computed location filter (for UI components that expect LocationFilter shape)
    const locationFilter: LocationFilter = { type: 'NEARBY', radius, coords: coords ?? undefined };

    const isAuthorized = () => {
        if (!currentUser?.team) return false;
        return currentUser.team.captainId === currentUser.id || currentUser.team.viceCaptainIds?.includes(currentUser.id) || false;
    };

    // Takım meydan okumaları — ortak store'daki kullanıcının takımı üzerinden
    useEffect(() => {
        const teamId = currentUser?.team?.id;
        if (!teamId) return;
        let cancelled = false;
        api.get(`/challenges/team/${teamId}`)
            .then(r => { if (!cancelled) setMyChallenges(r.data); })
            .catch(error => console.error('Failed to fetch user data:', error));
        return () => { cancelled = true; };
    }, [currentUser?.team?.id]);

    // Konum-önce + sayfalı çekim. reset=true → sayfa 0 (koordinat/yarıçap/sıralama
    // değişince); reset=false → sonraki sayfayı ekle (infinite-scroll). force=true →
    // guard'ı atla (pull-to-refresh). B3: aynı yuvarlanmış konum+yarıçap+sıralama için
    // gereksiz tam yeniden çekim yapılmaz.
    const doFetch = useCallback(async (reset: boolean, force = false) => {
        if (!coords) return;
        // loadMore, devam eden bir çekim varken tetiklenmez; reset her zaman öncelikli
        // (yeni nesil başlatıp eski yanıtları geçersiz kılar).
        if (!reset && isFetchingRef.current) return;
        const round = (n: number) => n.toFixed(3);
        const key = `${round(coords.lat)}|${round(coords.lng)}|${radius}|${sortBy}`;
        if (reset && !force && key === lastFetchKeyRef.current && businessesRef.current.length > 0) {
            return;
        }
        const gen = reset ? ++fetchGenRef.current : fetchGenRef.current;
        const offset = reset ? 0 : businessesRef.current.length;
        isFetchingRef.current = true;
        if (reset) { setIsLoadingBusinesses(true); setIsLoadingMore(false); }
        else setIsLoadingMore(true);
        try {
            const res = await getBusinessesPaged({
                lat: coords.lat, lng: coords.lng, radius,
                limit: PAGE_SIZE, offset, sort: sortBy,
            });
            if (gen !== fetchGenRef.current) return; // daha yeni bir reset bunu geçersiz kıldı
            const items: Business[] = res?.items ?? [];
            if (reset) {
                setBusinesses(items);
                localStorage.setItem('cached_businesses', JSON.stringify(items));
                lastFetchKeyRef.current = key;
            } else {
                setBusinesses(prev => [...prev, ...items]);
            }
            setHasMore(!!res?.hasMore);
        } catch (error) {
            console.error('Failed to fetch businesses:', error);
        } finally {
            // Yalnız güncel nesil bayrakları temizler (eski/superseded çağrılar dokunmaz).
            if (gen === fetchGenRef.current) {
                isFetchingRef.current = false;
                setIsLoadingBusinesses(false);
                setIsLoadingMore(false);
            }
        }
    }, [coords, radius, sortBy]);

    // Koordinat / yarıçap / sıralama değişince sayfa 0'a reset (guard içeride).
    useEffect(() => {
        doFetch(true, false);
    }, [doFetch]);

    const loadMoreBusinesses = useCallback(() => {
        if (!hasMore || isFetchingRef.current) return;
        doFetch(false, false);
    }, [hasMore, doFetch]);

    // Pull-to-refresh: konum aynı olsa da sayfa 0'ı zorla yenile.
    const refreshBusinesses = useCallback(() => doFetch(true, true), [doFetch]);

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

    const refetchReservations = useCallback(async () => {
        if (expandedBusinessId && selectedPitchIdInBusiness[expandedBusinessId]) {
            const pitchId = selectedPitchIdInBusiness[expandedBusinessId];
            try {
                const response = await api.get(`/reservations/pitch/${pitchId}?date=${selectedDate}`);
                setReservations(response.data);
            } catch (error) {
                console.error('Failed to fetch reservations:', error);
                setReservations([]);
            }
        } else {
            setReservations([]);
        }
    }, [expandedBusinessId, selectedPitchIdInBusiness, selectedDate]);

    useEffect(() => {
        refetchReservations();
    }, [refetchReservations]);

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

    // Sıralama artık sunucuda (sortBy değişince doFetch reset). İstemci sunucu sırasını
    // korur — sayfalar sunucu sırasında eklenir, ekstra JS sort yok.
    const filteredBusinesses = businesses;

    const handleSendOffer = async (note: string) => {
        if (!currentUser?.team || !offerMode) return;
        try {
            const response = await api.post('/challenges', {
                fromTeamId: currentUser.team.id,
                toMatchId: offerMode.matchId,
                note
            });
            setMyChallenges(prev => [...prev, response.data]);
        } catch (error: any) {
            console.error('Failed to send offer:', error);
            // Slot az önce kapanmış/dolmuşsa (409): uyarı göster + slot listesini yenile.
            const isSlotConflict =
                error?.response?.status === 409 ||
                error?.response?.data?.code === 'SLOT_UNAVAILABLE';
            setOfferMode(null);
            setSlotWarning(
                getErrorMessage(
                    error,
                    isSlotConflict
                        ? 'Bu saat artık müsait değil. Lütfen başka bir saat seçin.'
                        : 'Teklif gönderilemedi. Lütfen tekrar deneyin.'
                )
            );
            if (isSlotConflict) refetchReservations();
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
        isLoadingBusinesses, isLoadingMore, hasMore,
        loadMoreBusinesses, refreshBusinesses,
        handleSendOffer, handleConfirmCancel, handleConfirmDeleteAd,
        handleCreateAd, handleUnauthorizedSlotClick, openSlotDetail,
        handleCancelClick, handleDeleteAdClick,
        requestLocation,
        slotWarning, setSlotWarning,
        refetchReservations,
    };
};
