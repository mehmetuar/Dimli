import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getPitches, getBusinesses } from '../../../../services/api';
import { Team, Player, Pitch, Business, MatchHistoryItem } from '../../../../types';
import { SuccessType } from '../../../../components/Modals/SuccessModal';
import { useLocationContext } from '../../../../contexts/LocationContext';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';
import { getCurrentUserSnapshot } from '../../../../services/currentUserStore';
import { isNetworkError } from '../../../../utils/apiError';
import { readObjectCache, writeObjectCache, TEAM_CACHE_KEY } from '../../../../utils/listCache';
import { useOnReconnect } from '../../../../hooks/useOnReconnect';

// Kadro projeksiyonu — fetch/cache-hydrate/create yollarında aynı eşleme.
const mapRoster = (players: any[]): Partial<Player>[] =>
    (players || []).map((p: any) => ({
        id: p.id,
        name: p.full_name || p.username,
        position: p.position || 'Orta Saha',
        avatarUrl: p.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || p.username || '?')}&background=random&size=100`,
        rating: p.rating || 0,
    }));

export const useMyTeam = (modals: any) => {
    const navigate = useNavigate();
    const { coords, radius, setRadius } = useLocationContext();
    // Çevrimdışı açılış: ortak store snapshot'ı + takım önbelleği ile sayfa
    // "son bilinen" haliyle açılır — eski davranış ağ hatasında kullanıcıyı
    // YANLIŞLIKLA login'e yönlendiriyordu (currentUser null → <Navigate>).
    const [currentUser, setCurrentUser] = useState<any>(() => getCurrentUserSnapshot());
    const [isLoading, setIsLoading] = useState(currentUser === null);
    const [loadError, setLoadError] = useState<'network' | 'generic' | null>(null);
    const [myTeam, setMyTeam] = useState<Team | undefined>(
        () => readObjectCache<{ team: Team | null }>(TEAM_CACHE_KEY)?.team ?? undefined,
    );
    const [roster, setRoster] = useState<Partial<Player>[]>(
        () => mapRoster((readObjectCache<{ team: any }>(TEAM_CACHE_KEY)?.team?.players) ?? []),
    );
    const [pitches, setPitches] = useState<Pitch[]>([]);
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
    const [bio, setBio] = useState(
        () => readObjectCache<{ team: any }>(TEAM_CACHE_KEY)?.team?.description ?? '',
    );
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [upcomingMatches, setUpcomingMatches] = useState<any[]>([]);
    const [isUpcomingLoading, setIsUpcomingLoading] = useState(false);
    const [matchHistory, setMatchHistory] = useState<MatchHistoryItem[]>([]);
    const [isMatchHistoryLoading, setIsMatchHistoryLoading] = useState(false);

    // Success/Error messages
    const [successMessage, setSuccessMessage] = useState('');
    const [successType, setSuccessType] = useState<SuccessType | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (successMessage || errorMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage('');
                setErrorMessage('');
                setSuccessType(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, errorMessage]);

    const fetchUser = useCallback(async () => {
        try {
            const response = await api.get('/users/me');
            const user = response.data;
            setCurrentUser(user);

            const [pitchesData, historyResponse] = await Promise.all([
                getPitches(),
                api.get('/ratings/history'),
            ]);
            setPitches(pitchesData);
            setMatchHistory(historyResponse.data || []);

            if (user.team) {
                const teamResponse = await api.get(`/teams/${user.team.id}`);
                const fullTeam = teamResponse.data;

                setMyTeam(fullTeam);
                setBio(fullTeam.description || '');
                if (fullTeam.players) setRoster(mapRoster(fullTeam.players));
                // Çevrimdışı açılış için son bilinen takım saklanır.
                writeObjectCache(TEAM_CACHE_KEY, { team: fullTeam });
            } else {
                // Takımsız kullanıcı: bayat takım önbelleği kalmasın (ayrılma/silme sonrası).
                setMyTeam(undefined);
                setRoster([]);
                writeObjectCache(TEAM_CACHE_KEY, { team: null });
            }
            setLoadError(null);
        } catch (error) {
            console.error("Failed to fetch user profile", error);
            setLoadError(isNetworkError(error) ? 'network' : 'generic');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    // Ağ geri gelince profil + takım tazele (banner yeşil onayıyla eşzamanlı).
    useOnReconnect(fetchUser);

    // Konum değişince işletmeleri yeniden çek — PitchBooking ile aynı pattern
    useEffect(() => {
        if (!coords) {
            setBusinesses([]);
            return;
        }
        let cancelled = false;
        const fetchBusinessesWithCoords = async () => {
            try {
                const data = await getBusinesses({ lat: coords.lat, lng: coords.lng, radius });
                if (!cancelled) setBusinesses(data);
            } catch (error) {
                console.error('Failed to fetch businesses:', error);
            }
        };
        fetchBusinessesWithCoords();
        return () => { cancelled = true; };
    }, [coords, radius]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchUpcomingMatches = async () => {
        if (!myTeam?.id) return;
        setIsUpcomingLoading(true);
        try {
            const response = await api.get(`/reservations/upcoming?teamId=${myTeam.id}`);
            setUpcomingMatches(response.data);
        } catch (error) {
            console.error('Failed to fetch upcoming matches:', error);
        } finally {
            setIsUpcomingLoading(false);
        }
    };

    const fetchMatchHistory = async () => {
        setIsMatchHistoryLoading(true);
        try {
            const response = await api.get('/ratings/history');
            setMatchHistory(response.data || []);
        } catch (error) {
            console.error('Failed to fetch match history:', error);
        } finally {
            setIsMatchHistoryLoading(false);
        }
    };

    const handleSaveBio = async () => {
        if (!myTeam) return;
        try {
            const response = await api.patch(`/teams/${myTeam.id}/description`, { description: bio });
            setMyTeam(response.data);
            setIsEditingBio(false);
        } catch (error) {
            setErrorMessage('Takım ruhu kaydedilemedi.');
        }
    };

    const handleSetHomeBusiness = async (businessId: string) => {
        if (!myTeam) return;
        try {
            const response = await api.patch(`/teams/${myTeam.id}/home-business`, { homeBusinessId: businessId });
            setMyTeam(response.data);
            modals.setIsEditingPitch(false);
            setSuccessMessage('Favori işletme başarıyla güncellendi!');
        } catch (error) {
            setErrorMessage('İşletme seçilemedi.');
        }
    };

    const handleCreateTeam = async (teamData: Partial<Team>) => {
        try {
            const response = await api.post('/teams', teamData);
            const created = response.data;
            // Sunucu create() → findOne() döndürür (players + description dahil). Reload'a gerek
            // kalmadan myTeam + bio + roster'ı DOĞRUDAN doldur → ilk açılışta Takım Ruhu/Kadro boş kalmaz
            // (eski davranış: yalnız setMyTeam + reload → reload-fetch yarışı bio/roster'ı boş bırakabiliyordu).
            setMyTeam(created);
            setBio(created.description || '');
            if (Array.isArray(created.players)) {
                setRoster(created.players.map((p: any) => ({
                    id: p.id,
                    name: p.full_name || p.username,
                    position: p.position || 'Orta Saha',
                    avatarUrl: p.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || p.username || '?')}&background=random&size=100`,
                    rating: p.rating || 0,
                })));
            }
            modals.setIsCreateTeamModalOpen(false);
            setSuccessMessage('Takım başarıyla oluşturuldu!');
            setSuccessType('TEAM_CREATED');
        } catch (error: any) {
            setErrorMessage(error.response?.data?.message || 'Takım oluşturulamadı.');
        }
    };

    const handleLeaveTeam = () => {
        if (!myTeam) return;
        const isCaptain = (myTeam.captain && (myTeam.captain as any).id === currentUser.id) || myTeam.captainId === currentUser.id;

        if (isCaptain) {
            if (roster.length <= 1) {
                modals.setConfirmModal({
                    isOpen: true,
                    title: 'Takımı Sil',
                    message: `Takımda sadece sen varsın. Ayrılırsan "${myTeam.name}" takımı tamamen silinecek.\n\nAktif "Rakip Aranıyor" ilanların varsa otomatik olarak iptal edilecektir.\n\nBu işlemi onaylıyor musun?`,
                    onConfirm: async () => {
                        try {
                            await api.delete(`/teams/${myTeam.id}`);
                            setMyTeam(undefined);
                            setRoster([]);
                            navigate('/team');
                        } catch (err: any) {
                            const msg = err.response?.data?.message || 'Takım silinemedi.';
                            modals.setConfirmModal({
                                isOpen: true,
                                title: 'Takım Silinemez',
                                message: msg,
                                onConfirm: () => {},
                                isDangerous: false,
                            });
                        }
                    },
                    isDangerous: true
                });
                return;
            }

            modals.setConfirmModal({
                isOpen: true,
                title: 'Uyarı',
                message: 'Takım kaptanısın. Ayrılmadan önce kaptanlığı başka bir oyuncuya devretmelisin.',
                onConfirm: () => { },
                isDangerous: false
            });
            return;
        }

        modals.setConfirmModal({
            isOpen: true,
            title: 'Takımdan Ayrıl',
            message: `${myTeam.name} takımından ayrılmak istediğine emin misin?`,
            onConfirm: async () => {
                try {
                    await api.delete(`/teams/${myTeam.id}/leave`);
                    setMyTeam(undefined);
                    setRoster([]);
                    navigate('/team');
                } catch (err: any) {
                    setErrorMessage(err.response?.data?.message || 'Takımdan ayrılınamadı.');
                }
            },
            isDangerous: true
        });
    };

    const locationFilter: LocationFilter = { type: 'NEARBY', radius, coords: coords ?? undefined };
    const applyLocationFilter = (filter: LocationFilter) => { if (filter.radius) setRadius(filter.radius); };

    return {
        currentUser, isLoading, loadError, fetchUser, myTeam, setMyTeam, roster, setRoster,
        pitches, businesses, bio, setBio, isEditingBio, setIsEditingBio,
        upcomingMatches, isUpcomingLoading, fetchUpcomingMatches,
        matchHistory, isMatchHistoryLoading, fetchMatchHistory,
        successMessage, setSuccessMessage, successType, setSuccessType, errorMessage, setErrorMessage,
        handleSaveBio, handleSetHomeBusiness, handleCreateTeam, handleLeaveTeam,
        isLocationFilterOpen, setIsLocationFilterOpen,
        locationFilter, applyLocationFilter,
    };
};
