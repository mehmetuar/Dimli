import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getBusinesses, getMatchHistoryPaged } from '../../../../services/api';
import { Team, Player, Business, MatchHistoryItem } from '../../../../types';
import { SuccessType } from '../../../../components/Modals/SuccessModal';
import { useLocationContext } from '../../../../contexts/LocationContext';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';
import { getCurrentUserSnapshot } from '../../../../services/currentUserStore';
import { isNetworkError } from '../../../../utils/apiError';
import { readObjectCache, writeObjectCache, TEAM_CACHE_KEY } from '../../../../utils/listCache';
import { useOnReconnect } from '../../../../hooks/useOnReconnect';

// Kadro projeksiyonu — fetch/cache-hydrate/create yollarında aynı eşleme.
// Liste alanlarına ek olarak oyuncu kartının (PlayerDetailModal) ihtiyaç
// duyduğu alanlar da taşınır (yaş/ayak/mevki/uyruk/konum/favori işletmeler).
const mapRoster = (players: any[]): Partial<Player>[] =>
    (players || []).map((p: any) => ({
        id: p.id,
        name: p.full_name || p.username,
        position: p.position || 'Orta Saha',
        avatarUrl: p.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || p.username || '?')}&background=random&size=100`,
        rating: p.rating || 0,
        secondaryPosition: p.secondaryPosition,
        location: p.location,
        birthDate: p.birthDate,
        foot: p.foot,
        nationality: p.nationality,
        favoritePitchIds: p.favoriteBusinessIds ?? [],
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
    // Takım henüz sunucudan çözülmedi VE önbellekte cevap yok mu? → dönen top göster.
    // readObjectCache yalnızca önbellek YOKKEN null döner (takımsız durumu {team:null}
    // olarak non-null saklanır), böylece "cevap var mı" net ayrılır.
    const [teamResolved, setTeamResolved] = useState(
        () => readObjectCache<{ team: Team | null }>(TEAM_CACHE_KEY) != null,
    );
    const [roster, setRoster] = useState<Partial<Player>[]>(
        () => mapRoster((readObjectCache<{ team: any }>(TEAM_CACHE_KEY)?.team?.players) ?? []),
    );
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [isBusinessListLoading, setIsBusinessListLoading] = useState(false);
    // Ev sahibi işletme kartı: yarıçap listesinden BAĞIMSIZ tekil kayıt.
    // Çevrimdışı açılış için takım zarfındaki opsiyonel anahtardan hydrate edilir.
    const [homeBusiness, setHomeBusiness] = useState<Business | null>(
        () => readObjectCache<{ team: Team | null; homeBusiness?: Business | null }>(TEAM_CACHE_KEY)?.homeBusiness ?? null,
    );
    const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
    const [bio, setBio] = useState(
        () => readObjectCache<{ team: any }>(TEAM_CACHE_KEY)?.team?.description ?? '',
    );
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [upcomingMatches, setUpcomingMatches] = useState<any[]>([]);
    const [isUpcomingLoading, setIsUpcomingLoading] = useState(false);
    // Geçmiş maçlar: sayfalı + birikmeli (sonsuz kaydırma). Guard'lar usePitchBooking deseni.
    const [matchHistory, setMatchHistory] = useState<MatchHistoryItem[]>([]);
    const [matchHistoryTotal, setMatchHistoryTotal] = useState(0);
    const [hasMoreMatchHistory, setHasMoreMatchHistory] = useState(false);
    const [isMatchHistoryLoading, setIsMatchHistoryLoading] = useState(false);
    const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false);
    const historyFetchingRef = useRef(false);
    const historyGenRef = useRef(0);      // reset, uçuştaki eski yanıtı geçersiz kılar
    const historyOffsetRef = useRef(0);

    // Success/Error messages
    const [successMessage, setSuccessMessage] = useState('');
    const [successType, setSuccessType] = useState<SuccessType | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (successMessage || errorMessage) {
            // YARDIMCI SINIRI uyarısı otomatik KAPANMAZ — kullanıcı TAMAM ile kapatır
            // (kullanıcı kararı). Diğer tüm sonuç modalları 3sn davranışını korur.
            if (successType === 'VICE_LIMIT') return;
            const timer = setTimeout(() => {
                setSuccessMessage('');
                setErrorMessage('');
                setSuccessType(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, errorMessage, successType]);

    const fetchUser = useCallback(async () => {
        try {
            const response = await api.get('/users/me');
            const user = response.data;
            setCurrentUser(user);

            // Geçmiş maçlar sayfa açılışında ÇEKİLMEZ: modal her açılışta
            // fetchMatchHistory() ile zaten çeker (eski hali çift istekti).

            if (user.team) {
                const teamResponse = await api.get(`/teams/${user.team.id}`);
                const fullTeam = teamResponse.data;

                setMyTeam(fullTeam);
                setBio(fullTeam.description || '');
                if (fullTeam.players) setRoster(mapRoster(fullTeam.players));
                // Çevrimdışı açılış için son bilinen takım saklanır
                // (zarftaki homeBusiness anahtarı korunur — onu kendi effect'i yazar).
                writeObjectCache(TEAM_CACHE_KEY, {
                    ...(readObjectCache<Record<string, unknown>>(TEAM_CACHE_KEY) ?? {}),
                    team: fullTeam,
                });
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
            setTeamResolved(true);   // fetch bitince (başarı/hata) top asla asılı kalmaz
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    // Ağ geri gelince profil + takım tazele (banner yeşil onayıyla eşzamanlı).
    useOnReconnect(fetchUser);

    // Ev sahibi işletme: tekil ids fetch'i (TeamDetailModal deseni) — kart, yarıçap
    // listesine bağımlı DEĞİL. Ev işletmesi seçili yarıçapın dışında kalsa bile dolar;
    // silinmiş/pasif işletmede sunucu boş döner → kart "seç" durumuna düşer.
    useEffect(() => {
        const businessId = myTeam?.homeBusinessId;
        if (!businessId) {
            setHomeBusiness(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const data = await getBusinesses({ ids: [businessId] });
                if (cancelled) return;
                const found: Business | null = Array.isArray(data) ? (data[0] ?? null) : null;
                setHomeBusiness(found);
                // Çevrimdışı açılışta kart dolu gelsin (takım zarfına opsiyonel anahtar).
                writeObjectCache(TEAM_CACHE_KEY, {
                    ...(readObjectCache<Record<string, unknown>>(TEAM_CACHE_KEY) ?? {}),
                    homeBusiness: found,
                });
            } catch (error) {
                // Ağ hatasında son bilinen (cache) değer korunur.
                console.error('Failed to fetch home business:', error);
            }
        })();
        return () => { cancelled = true; };
    }, [myTeam?.homeBusinessId]);

    // İşletme listesi YALNIZ "Değiştir" (edit) modunda çekilir — sayfa açılışında
    // yarıçaptaki tüm işletmeleri çekmek gereksizdi (kart artık tekil fetch).
    // Edit modu açıkken konum/yarıçap değişirse yeniden çekilir.
    useEffect(() => {
        if (!modals.isEditingPitch) return;
        if (!coords) {
            setBusinesses([]);
            return;
        }
        let cancelled = false;
        const fetchBusinessesWithCoords = async () => {
            setIsBusinessListLoading(true);
            try {
                const data = await getBusinesses({ lat: coords.lat, lng: coords.lng, radius });
                if (!cancelled) setBusinesses(data);
            } catch (error) {
                console.error('Failed to fetch businesses:', error);
            } finally {
                if (!cancelled) setIsBusinessListLoading(false);
            }
        };
        fetchBusinessesWithCoords();
        return () => { cancelled = true; };
    }, [modals.isEditingPitch, coords, radius]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const HISTORY_PAGE_SIZE = 20;

    // reset=true → sayfa 0'dan (modal açılışı); reset=false → sonraki sayfayı ekle.
    const fetchMatchHistory = async (reset = true) => {
        if (!reset && historyFetchingRef.current) return;
        historyFetchingRef.current = true;
        const gen = reset ? ++historyGenRef.current : historyGenRef.current;
        const offset = reset ? 0 : historyOffsetRef.current;
        if (reset) setIsMatchHistoryLoading(true);
        else setIsLoadingMoreHistory(true);
        try {
            const page = await getMatchHistoryPaged({ limit: HISTORY_PAGE_SIZE, offset });
            if (gen !== historyGenRef.current) return; // bayat yanıt (reset araya girdi)
            setMatchHistory(prev => (reset ? page.items : [...prev, ...page.items]));
            historyOffsetRef.current = offset + page.items.length;
            setMatchHistoryTotal(page.total);
            setHasMoreMatchHistory(page.hasMore);
        } catch (error) {
            console.error('Failed to fetch match history:', error);
        } finally {
            if (gen === historyGenRef.current) {
                setIsMatchHistoryLoading(false);
                setIsLoadingMoreHistory(false);
            }
            historyFetchingRef.current = false;
        }
    };

    const loadMoreMatchHistory = () => {
        if (!hasMoreMatchHistory || historyFetchingRef.current) return;
        fetchMatchHistory(false);
    };

    // Puanlama sonucunu birikmeli listeye işler. Modal-lokal state yerine burada:
    // sonraki sayfa append'leri bu güncellemeyi SİLEMEZ (aynı state'te yaşarlar).
    const applyRatingResult = (
        reservationId: string,
        businessScore: number,
        fairPlayScore: number | null,
    ) => {
        setMatchHistory(prev =>
            prev.map(m =>
                m.reservationId === reservationId
                    ? {
                          ...m,
                          isBusinessRated: true,
                          isFairPlayRated: m.needsFairPlayRating ? true : m.isFairPlayRated,
                          businessScore: businessScore > 0 ? businessScore : m.businessScore,
                          fairPlayScore: fairPlayScore ?? m.fairPlayScore,
                          needsBusinessRating: false,
                          needsFairPlayRating: false,
                      }
                    : m,
            ),
        );
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
            // Kart anında dolsun (liste elemanı elimizde); effect ids fetch'iyle doğrular.
            setHomeBusiness(businesses.find(b => b.id === businessId) ?? null);
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
                setRoster(mapRoster(created.players));
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
        currentUser, isLoading, teamResolved, loadError, fetchUser, myTeam, setMyTeam, roster, setRoster,
        businesses, isBusinessListLoading, homeBusiness, bio, setBio, isEditingBio, setIsEditingBio,
        upcomingMatches, isUpcomingLoading, fetchUpcomingMatches,
        matchHistory, matchHistoryTotal, hasMoreMatchHistory, isMatchHistoryLoading,
        isLoadingMoreHistory, fetchMatchHistory, loadMoreMatchHistory, applyRatingResult,
        successMessage, setSuccessMessage, successType, setSuccessType, errorMessage, setErrorMessage,
        handleSaveBio, handleSetHomeBusiness, handleCreateTeam, handleLeaveTeam,
        isLocationFilterOpen, setIsLocationFilterOpen,
        locationFilter, applyLocationFilter,
    };
};
