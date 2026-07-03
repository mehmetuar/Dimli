import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LocationErrorType } from '../components/LocationPermissionSheet';
import { calculateDistance } from '../utils/location';
import api from '../services/api';
import { getToken } from '../services/authStorage';
import { seedCurrentUser } from '../services/currentUserStore';
import { useAuth } from './AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface Coords { lat: number; lng: number }
export type PermissionStatus = 'unknown' | 'granted' | 'denied';

interface LocationContextValue {
  /** Current GPS coordinates — null if permission denied or not yet obtained */
  coords: Coords | null;
  /** Global nearby radius in km — shared across all pages */
  radius: number;
  permissionStatus: PermissionStatus;
  /** True while a GPS request is in flight */
  isLocating: boolean;
  /** Set when a location error occurs that requires user action */
  locationError: LocationErrorType | null;
  /** Türetilmiş ilçe (örn. "Kâğıthane") — sunucudan gelir, uygulama geneli TEK değer */
  locationName: string | null;
  /** True while the coords→server sync (PATCH) is in flight */
  isSyncing: boolean;
  /** Clear the location error */
  clearLocationError: () => void;
  /** Update the global radius and persist to localStorage */
  setRadius: (r: number) => void;
  /** Trigger a GPS permission request + position fetch */
  requestLocation: (userInitiated?: boolean) => Promise<void>;
  /** Kullanıcı-tetikli TAM tazeleme: GPS al → sunucuya PATCH → ilçe güncelle (hareket olmasa da).
   *  Sunucunun türettiği taze ilçe adını döner (başarısızlıkta null). */
  refreshLocation: () => Promise<string | null>;
  /** Directly update coords (used by background watch in App.tsx) */
  updateCoords: (c: Coords) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage helpers
// ─────────────────────────────────────────────────────────────────────────────
const COORD_CACHE_KEY = 'marketplace_user_coords';
const LOCNAME_CACHE_KEY = 'marketplace_user_location_name';
const RADIUS_KEY = 'location_radius';
const DEFAULT_RADIUS = 20;

const getCachedCoords = (): Coords | null => {
  try { const r = localStorage.getItem(COORD_CACHE_KEY); return r ? JSON.parse(r) : null; }
  catch { return null; }
};

const getCachedLocationName = (): string | null => {
  try { return localStorage.getItem(LOCNAME_CACHE_KEY); } catch { return null; }
};

const getSavedRadius = (): number => {
  try { const r = localStorage.getItem(RADIUS_KEY); return r ? Number(r) : DEFAULT_RADIUS; }
  catch { return DEFAULT_RADIUS; }
};

// ─────────────────────────────────────────────────────────────────────────────
// GPS helpers — her zaman sonuçlanan, dayanıklı konum alma
// ─────────────────────────────────────────────────────────────────────────────

// Promise'i daima sonuçlandır: ms içinde dönmezse code:3 (timeout) ile reddet.
// Plugin'in kendi timeout'u bazı Android/MIUI WebView'lerinde güvenilir reddetmiyor;
// bu sarmalayıcı requestLocation'ın asla sonsuza dek asılı kalmamasını garanti eder.
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject({ code: 3, message: 'js-timeout' }), ms);
    p.then(
      (v) => { clearTimeout(id); resolve(v); },
      (e) => { clearTimeout(id); reject(e); },
    );
  });
}

// İki adımlı konum: önce hızlı düşük-doğruluk (network/fused), olmazsa yüksek-doğruluk (GPS).
// Her ikisi de JS zaman aşımıyla sınırlı. MIUI'de network sağlayıcı kapalıysa GPS'e düşülür.
async function getPositionRobust() {
  try {
    return await withTimeout(
      Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }),
      9000,
    );
  } catch {
    return await withTimeout(
      Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }),
      13000,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────
const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isReady, token, isCustomer } = useAuth();

  const [coords, setCoords] = useState<Coords | null>(getCachedCoords);
  const [radius, setRadiusState] = useState<number>(getSavedRadius);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('unknown');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<LocationErrorType | null>(null);
  const [locationName, setLocationName] = useState<string | null>(getCachedLocationName);
  const [isSyncing, setIsSyncing] = useState(false);
  const isLocatingRef = useRef(false);
  // Uçuştaki GPS isteğinin promise'i — eşzamanlı çağrılar yenisini başlatmak
  // yerine bunu bekler (refreshLocation'ın bayat-koordinat PATCH'ini önler).
  const locatePromiseRef = useRef<Promise<void> | null>(null);
  // permissionStatus'u ref'te tut: foreground handler güncel izni re-subscribe olmadan okusun
  // (mount effect [] bağımlılığıyla kalır).
  const permissionStatusRef = useRef<PermissionStatus>('unknown');

  // Konum→sunucu senkron durumu (tek PATCH yeri için)
  const coordsRef = useRef<Coords | null>(coords);           // async akışlarda bayat-closure önlemi
  const syncInFlightRef = useRef(false);                     // eşzamanlı çift PATCH'i engelle
  const lastSyncedCoordsRef = useRef<Coords | null>(null);   // >250m kapısının referansı
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { coordsRef.current = coords; }, [coords]);

  // Persist coords to localStorage and update state — only if moved >250m
  const updateCoords = useCallback((newCoords: Coords) => {
    setCoords(prev => {
      if (prev && calculateDistance(prev.lat, prev.lng, newCoords.lat, newCoords.lng) < 0.25) {
        return prev;
      }
      try { localStorage.setItem(COORD_CACHE_KEY, JSON.stringify(newCoords)); } catch { /* ignore */ }
      return newCoords;
    });
  }, []);

  // Update radius globally and persist to localStorage
  const setRadius = useCallback((r: number) => {
    setRadiusState(r);
    try { localStorage.setItem(RADIUS_KEY, String(r)); } catch { /* ignore */ }
  }, []);

  const clearLocationError = useCallback(() => setLocationError(null), []);

  // ── Koordinatları sunucuya senkronla — İLÇE TÜRETMENİN TEK YERİ ──────────────
  // Client hiçbir harici geocoder çağırmaz: sadece koordinat PATCH'ler, ilçeyi
  // sunucu (offline point-in-polygon) türetip yanıtta `location` olarak döner.
  // >250m kapısı sunucu spam'ini önler; `force` ise manuel tazelemede kapıyı atlar.
  // Dönüş: sunucunun türettiği taze ilçe adı (atlanan/başarısız senkronda null).
  const syncLocationToServer = useCallback(async (c: Coords, force = false): Promise<string | null> => {
    if (!getToken()) return null;            // login öncesi PATCH atma
    if (syncInFlightRef.current) return null; // uçuşta olan varsa çift atma
    const prev = lastSyncedCoordsRef.current;
    if (!force && prev && calculateDistance(prev.lat, prev.lng, c.lat, c.lng) < 0.25) return null;
    syncInFlightRef.current = true;
    setIsSyncing(true);
    try {
      const res = await api.patch('/users/me', { latitude: c.lat, longitude: c.lng });
      lastSyncedCoordsRef.current = c;       // yalnız başarıda güncelle → hata olursa tekrar denenir
      const name: string | null = res?.data?.location ?? null;
      if (name) {
        setLocationName(name);
        try { localStorage.setItem(LOCNAME_CACHE_KEY, name); } catch { /* ignore */ }
      }
      // PATCH yanıtı GET /users/me ile birebir aynı şekil → ortak kullanıcı
      // store'unu SIFIR ek istekle besler (Profilim anında güncellenir).
      if (res?.data) seedCurrentUser(res.data);
      return name;
    } catch {
      // ağ/sunucu hatası — sessizce geç; bir sonraki tick veya hareket tekrar dener
      return null;
    } finally {
      syncInFlightRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  // Request GPS permission + get position.
  // userInitiated=true → izin 'prompt'/'prompt-with-rationale' ise sistem dialogunu göster
  //   (mount + açık "Tekrar Dene"/"Konumumu Bul"). userInitiated=false → asla yeni prompt açma;
  //   yalnızca izin zaten verilmişse konumu tazele (otomatik foreground refresh). Böylece reddedilen
  //   izinde foreground churn'ü (whole-app re-render + native bridge floodu) tamamen durur.
  const requestLocation = useCallback(async (userInitiated: boolean = true): Promise<void> => {
    // Uçuşta istek varsa yenisini başlatma; bitmesini BEKLE (erken-dönüş değil) —
    // refreshLocation böylece taze fix'i görüp öyle PATCH atar. Nüans: prompt'suz
    // bir isteğe katılan userInitiated çağrı yeni prompt açmaz (kabul edilen davranış;
    // Profilim butonu izin ön-kontrolünü zaten kendisi yapıyor).
    if (isLocatingRef.current) return locatePromiseRef.current ?? Promise.resolve();
    const run = (async () => {
      isLocatingRef.current = true;
      setIsLocating(true);
      setLocationError(null); // retry'da önceki hata/timeout'u temizle
      try {
        // checkPermissions JS timeout'la sarılır; requestPermissions kullanıcı etkileşimi olduğu için sarılmaz
        let permStatus = await withTimeout(Geolocation.checkPermissions(), 8000);
        if (userInitiated && (permStatus.location === 'prompt' || permStatus.location === 'prompt-with-rationale')) {
          permStatus = await Geolocation.requestPermissions();
        }
        if (permStatus.location === 'denied') {
          permissionStatusRef.current = 'denied';
          setPermissionStatus('denied');
          setCoords(null);
          return;
        }
        // İzin verilmemiş ama promptable (userInitiated=false ile geldik): yeni dialog açma, sessizce çık.
        // Hiçbir hata/konum state'i değiştirme → denied/promptable durumunda idle kal.
        if (permStatus.location !== 'granted') {
          return;
        }
        permissionStatusRef.current = 'granted';
        setPermissionStatus('granted');
        // Dayanıklı konum: düşük-doğruluk → yüksek-doğruluk, her ikisi de JS timeout'lu (asla asılı kalmaz)
        const pos = await getPositionRobust();
        updateCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError(null);
      } catch (err: any) {
        console.warn('LocationContext GPS error:', err);
        const code = err?.code;
        if (code === 2) {
          setLocationError('gps_disabled');
        } else if (code === 1) {
          permissionStatusRef.current = 'denied';
          setPermissionStatus('denied');
          setCoords(null);
        } else {
          // code 3 (plugin veya JS timeout) ve diğer her şey → yeniden denenebilir hata
          setLocationError('timeout');
        }
      } finally {
        isLocatingRef.current = false;
        setIsLocating(false);
      }
    })();
    locatePromiseRef.current = run.finally(() => { locatePromiseRef.current = null; });
    return locatePromiseRef.current;
  }, [updateCoords]);

  // Kullanıcı-tetikli tam tazeleme (Profilim "Konumu Güncelle" butonu): taze GPS al,
  // sonra hareket olmasa da (force) sunucuya PATCH'le ve ilçeyi güncelle.
  // Sunucunun döndürdüğü taze ilçe adını döner (toast'lar için).
  const refreshLocation = useCallback(async (): Promise<string | null> => {
    await requestLocation(true);
    const c = coordsRef.current;
    if (c) return syncLocationToServer(c, true);
    return null;
  }, [requestLocation, syncLocationToServer]);

  // Mount: zorunlu konum — izin promptable ise sistem dialogunu göster (userInitiated=true).
  // Foreground: SADECE izin zaten verilmişse konumu tazele. İzin verilmemişse hafif bir
  // checkPermissions yap (prompt yok, isLocating toggle yok, setState yok) ve yalnızca izin
  // gerçekten granted'a döndüyse (kullanıcı Ayarlar'dan verdiyse) bir kez konum al.
  useEffect(() => {
    requestLocation(true);

    const listenerPromise = CapApp.addListener('appStateChange', (state) => {
      if (!state.isActive) return;
      if (permissionStatusRef.current === 'granted') {
        requestLocation(false); // prompt'suz tazele
        return;
      }
      // İzinli değil: prompt açmadan sadece kontrol et; granted'a flip'i yakala.
      Geolocation.checkPermissions()
        .then((p) => {
          if (p.location === 'granted' && permissionStatusRef.current !== 'granted') {
            requestLocation(false);
          }
        })
        .catch(() => { /* sessizce geç — denied'da idle kal */ });
    });

    return () => {
      listenerPromise.then(h => h.remove()).catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Koordinat değişince sunucuya senkronla (yalnız müşteri). `updateCoords`'un >250m
  // dedup'u sayesinde `coords` kimliği yalnız gerçek harekette değişir → burada gereksiz
  // churn olmaz. İlk giriş de bu efektle karşılanır: coords ilk geldiğinde
  // lastSyncedCoordsRef null olduğundan >250m kapısı atlanmaz, tek PATCH atılır.
  useEffect(() => {
    if (!coords || !isCustomer) return;
    void syncLocationToServer(coords, false);
  }, [coords, isCustomer, syncLocationToServer]);

  // Periyodik tazeleme (iOS 3 dk / Android 2 dk): yalnız koordinatı yeniler; hareket
  // >250m ise `updateCoords` yeni coords commit eder → yukarıdaki efekt PATCH'ler.
  // Hareket yoksa hiçbir şey kımıldamaz (kapı tutar). Yalnız müşteri + izin granted.
  useEffect(() => {
    if (!isReady || !token || !isCustomer) return;
    const INTERVAL = Capacitor.getPlatform() === 'ios' ? 3 * 60 * 1000 : 2 * 60 * 1000;
    const tick = () => {
      if (permissionStatusRef.current !== 'granted') return; // reddedilen izinde native bridge'i yorma
      void requestLocation(false);
    };
    intervalRef.current = setInterval(tick, INTERVAL);
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [isReady, token, isCustomer, requestLocation]);

  // Çıkış / hesap değişimi: senkron referanslarını sıfırla ki yeni hesap kendi ilk
  // PATCH'ini alsın (aksi halde >250m kapısı yeni hesabın ilk yazımını yutabilir).
  useEffect(() => {
    if (!token) {
      lastSyncedCoordsRef.current = null;
    }
  }, [token]);

  const contextValue = useMemo<LocationContextValue>(() => ({
    coords, radius, permissionStatus, isLocating, locationError, locationName, isSyncing,
    clearLocationError, setRadius, requestLocation, refreshLocation, updateCoords,
  }), [coords, radius, permissionStatus, isLocating, locationError, locationName, isSyncing,
       clearLocationError, setRadius, requestLocation, refreshLocation, updateCoords]);

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationContext = (): LocationContextValue => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocationContext must be used inside LocationProvider');
  return ctx;
};
