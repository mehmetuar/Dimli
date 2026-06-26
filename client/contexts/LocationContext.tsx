import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { App as CapApp } from '@capacitor/app';
import { LocationErrorType } from '../components/LocationPermissionSheet';
import { calculateDistance } from '../utils/location';

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
  /** Clear the location error */
  clearLocationError: () => void;
  /** Update the global radius and persist to localStorage */
  setRadius: (r: number) => void;
  /** Trigger a GPS permission request + position fetch */
  requestLocation: () => Promise<void>;
  /** Directly update coords (used by background watch in App.tsx) */
  updateCoords: (c: Coords) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage helpers
// ─────────────────────────────────────────────────────────────────────────────
const COORD_CACHE_KEY = 'marketplace_user_coords';
const RADIUS_KEY = 'location_radius';
const DEFAULT_RADIUS = 20;

const getCachedCoords = (): Coords | null => {
  try { const r = localStorage.getItem(COORD_CACHE_KEY); return r ? JSON.parse(r) : null; }
  catch { return null; }
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
  const [coords, setCoords] = useState<Coords | null>(getCachedCoords);
  const [radius, setRadiusState] = useState<number>(getSavedRadius);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('unknown');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<LocationErrorType | null>(null);
  const isLocatingRef = useRef(false);
  // permissionStatus'u ref'te tut: foreground handler güncel izni re-subscribe olmadan okusun
  // (mount effect [] bağımlılığıyla kalır).
  const permissionStatusRef = useRef<PermissionStatus>('unknown');

  // Persist coords to sessionStorage and update state — only if moved >250m
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

  // Request GPS permission + get position.
  // userInitiated=true → izin 'prompt'/'prompt-with-rationale' ise sistem dialogunu göster
  //   (mount + açık "Tekrar Dene"/"Konumumu Bul"). userInitiated=false → asla yeni prompt açma;
  //   yalnızca izin zaten verilmişse konumu tazele (otomatik foreground refresh). Böylece reddedilen
  //   izinde foreground churn'ü (whole-app re-render + native bridge floodu) tamamen durur.
  const requestLocation = useCallback(async (userInitiated: boolean = true) => {
    if (isLocatingRef.current) return;
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
  }, [updateCoords]);

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

  const contextValue = useMemo<LocationContextValue>(() => ({
    coords, radius, permissionStatus, isLocating, locationError,
    clearLocationError, setRadius, requestLocation, updateCoords,
  }), [coords, radius, permissionStatus, isLocating, locationError,
       clearLocationError, setRadius, requestLocation, updateCoords]);

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
