import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import api, { getMatchAnnouncementsPaged, MarketplaceSort } from '../../../../services/api';
import { LocationFilter } from '../../../../components/Modals/LocationFilterModal';
import { useLocationContext } from '../../../../contexts/LocationContext';
import { useFilterContext } from '../../../../contexts/FilterContext';
import { useCurrentUser } from '../../../../hooks/useCurrentUser';
import { readListCache, writeListCache, MATCHES_CACHE_KEY } from '../../../../utils/listCache';
import { isNetworkError } from '../../../../utils/apiError';
import { useOnReconnect } from '../../../../hooks/useOnReconnect';
import { useTourActive } from '../../../../services/tourStore';
import { getDemoMarketAd } from '../../PitchBooking/demo/demoTourData';

const PAGE_SIZE = 50;

export const useMarketplace = () => {
  const { coords, radius, setRadius, requestLocation } = useLocationContext();
  const { selectedDate, setSelectedDate, marketplaceSortBy, setMarketplaceSortBy, isDateFilterModalOpen: isDateFilterOpen, setIsDateFilterModalOpen: setIsDateFilterOpen } = useFilterContext();

  // Ortak store — sayfa başına ayrı GET /users/me atılmaz
  const { currentUser } = useCurrentUser();

  // Sahalar deseni (stale-while-revalidate): önbellekli sayfa-0 anında basılır,
  // taze veri arkada çekilir. İşletme/saha bilgisi artık sunucunun her ilana
  // gömdüğü pitchSummary'den gelir — ayrı (sınırsız) GET /businesses çağrısı yok.
  const [matches, setMatches] = useState<any[]>(() => readListCache(MATCHES_CACHE_KEY));
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  // Ağ hatası / genel hata ayrımı — boş listede "Bağlantı yok + Tekrar Dene"
  // ile gerçek "ilan yok" durumunu ayırt etmek için.
  const [loadError, setLoadError] = useState<'network' | 'generic' | null>(null);

  // Yarış korumaları (usePitchBooking referans deseni): her reset bir "nesil"
  // başlatır; eski yanıtlar reset'ten sonra uygulanmaz. Offset, birikmiş liste
  // uzunluğudur — istemci artık öğe filtrelemediği için (kendi_aramizda +
  // tarih + sıralama sunucuda) uzunluk gerçek sunucu offset'ine eşittir.
  const matchesRef = useRef<any[]>(matches);
  matchesRef.current = matches;
  const lastFetchKeyRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);
  const fetchGenRef = useRef(0);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [myChallenges, setMyChallenges] = useState<any[]>([]);



  const sortBy = marketplaceSortBy as MarketplaceSort;
  const setSortBy = setMarketplaceSortBy;
  const [isSortOpen, setIsSortOpen] = useState(false);

  const HIDE_MY_KEY = 'marketplace_hide_my_listings';
  const [hideMyListings, setHideMyListingsRaw] = useState(
    () => localStorage.getItem(HIDE_MY_KEY) === 'true'
  );
  const setHideMyListings = (v: boolean) => {
    localStorage.setItem(HIDE_MY_KEY, String(v));
    setHideMyListingsRaw(v);
  };

  const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);

  const locationFilter: LocationFilter = { type: 'NEARBY', radius, coords: coords ?? undefined };

  // ── Takım meydan okumaları — ortak store'daki kullanıcının takımı üzerinden ──
  useEffect(() => {
    const teamId = currentUser?.team?.id;
    if (!teamId) return;
    let cancelled = false;
    api.get(`/challenges/team/${teamId}`)
      .then(r => { if (!cancelled) setMyChallenges(r.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser?.team?.id]);

  // Konum-önce + sayfalı çekim. reset=true → sayfa 0 (koordinat/yarıçap/tarih/
  // sıralama değişince); reset=false → sonraki sayfayı ekle. Aynı filtre kümesi
  // için gereksiz tam yeniden çekim yapılmaz (mount'ta ref'ler sıfır → her mount
  // bir kez tazelenir). Tarih + sıralama SUNUCUYA gönderilir: yalnız yüklü
  // sayfaları sıralamak/filtrelemek 500 ilanda yanlış sonuç veriyordu.
  const doFetch = useCallback(async (reset: boolean, force = false) => {
    if (!coords) return;
    if (!reset && isFetchingRef.current) return;
    const round = (n: number) => n.toFixed(3);
    const key = `${round(coords.lat)}|${round(coords.lng)}|${radius}|${selectedDate ?? ''}|${sortBy}`;
    if (reset && !force && key === lastFetchKeyRef.current && matchesRef.current.length > 0) {
      return;
    }
    const gen = reset ? ++fetchGenRef.current : fetchGenRef.current;
    const off = reset ? 0 : matchesRef.current.length;
    isFetchingRef.current = true;
    if (reset) { setIsLoading(true); setLoadingMore(false); }
    else setLoadingMore(true);
    try {
      const res = await getMatchAnnouncementsPaged({
        lat: coords.lat,
        lng: coords.lng,
        radius,
        limit: PAGE_SIZE,
        offset: off,
        sort: sortBy,
        date: selectedDate || undefined,
      });
      if (gen !== fetchGenRef.current) return; // daha yeni bir reset bunu geçersiz kıldı
      if (reset) {
        setMatches(res.items);
        writeListCache(MATCHES_CACHE_KEY, res.items);
        lastFetchKeyRef.current = key;
      } else {
        setMatches(prev => [...prev, ...res.items]);
      }
      setHasMore(res.hasMore);
      setLoadError(null);
    } catch (err) {
      console.error('Failed to fetch announcements', err);
      if (reset) setLoadError(isNetworkError(err) ? 'network' : 'generic');
    } finally {
      if (gen === fetchGenRef.current) {
        isFetchingRef.current = false;
        setIsLoading(false);
        setLoadingMore(false);
      }
    }
  }, [coords, radius, selectedDate, sortBy]);

  // Koordinat / yarıçap / tarih / sıralama değişince sayfa 0'a reset (guard içeride).
  useEffect(() => {
    doFetch(true, false);
  }, [doFetch]);

  // useCallback: onScroll içindeki infinite-scroll tetikleyicisi stabil kalsın
  // (usePitchBooking.loadMoreBusinesses ile aynı desen).
  const loadMore = useCallback(() => {
    if (!hasMore || isFetchingRef.current) return;
    doFetch(false, false);
  }, [hasMore, doFetch]);

  // İlan yayınlandıktan hemen sonra listeyi tazele (offset başa döner)
  const refetch = () => {
    doFetch(true, true);
  };

  // Ağ geri gelince sayfa-0 tazele (OfflineBanner yeşil onayıyla eşzamanlı).
  useOnReconnect(() => doFetch(true, true));

  const applyLocationFilter = (filter: LocationFilter) => {
    if (filter.radius) setRadius(filter.radius);
  };

  const myTeam = currentUser?.team;

  const isAuthorized = () => {
    if (!myTeam || !currentUser) return false;
    return myTeam.captainId === currentUser.id || myTeam.viceCaptainIds?.includes(currentUser.id) || false;
  };

  // Kart/modalın tükettiği { pitch, business } şekli — sunucunun ilana gömdüğü
  // pitchSummary'den türetilir. Özet yoksa (eski sunucu sürümü) null döner;
  // kartın mevcut "Saha bilgisi yükleniyor…" fallback'i devrede kalır.
  const getPitchDetails = (announcement: any) => {
    const s = announcement?.pitchSummary;
    if (!s) return { pitch: null, business: null };
    return {
      pitch: {
        id: s.id,
        name: s.name,
        pricePerHour: s.pricePerHour ?? undefined,
        imageUrl: s.imageUrl ?? undefined,
        endTime: s.endTime ?? undefined,
      },
      business: s.business
        ? {
            id: s.business.id,
            name: s.business.name,
            district: s.business.district,
            city: s.business.city,
          }
        : null,
    };
  };

  // Sıralama + tarih filtresi artık SUNUCUDA (tüm aday küme üzerinde doğru).
  // Burada yalnız: kendi takım ilanlarını üste sabitleme, bayat sayfa-0
  // önbelleğine karşı ucuz tarih emniyet filtresi ve "ilanlarımı gizle".
  // Tanıtım turu: demo "Dimli United" ilanı RENDER'DA türetilerek başa eklenir —
  // matches state'i ve writeListCache demo'yu hiç görmez (Sahalar demo deseni).
  const marketplaceTourActive = useTourActive('marketplace');

  const filteredMatches = useMemo(() => {
    const myTeamId = myTeam?.id;
    const byDate = !selectedDate ? matches : matches.filter(m => m.date === selectedDate);
    const mine = myTeamId ? byDate.filter(m => m.teamId === myTeamId) : [];
    const others = myTeamId ? byDate.filter(m => m.teamId !== myTeamId) : byDate;
    const result = hideMyListings ? others : [...mine, ...others];
    if (!marketplaceTourActive) return result;
    // Demo ilan tarih emniyet filtresinden bağımsız hep görünür (tarihi seçili güne uyar)
    const t = new Date();
    const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    return [getDemoMarketAd(selectedDate || todayStr), ...result];
  }, [matches, selectedDate, myTeam, hideMyListings, marketplaceTourActive]);

  useEffect(() => () => setIsDateFilterOpen(false), []);

  return {
    currentUser,
    myTeam,
    marketplaceTourActive,
    matches,
    setMatches,
    isLoading,
    loadingMore,
    hasMore,
    loadMore,
    refetch,
    loadError,
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
    hideMyListings,
    setHideMyListings,
    requestLocation,
  };
};
