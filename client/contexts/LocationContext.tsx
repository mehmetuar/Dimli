import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  try { const r = sessionStorage.getItem(COORD_CACHE_KEY); return r ? JSON.parse(r) : null; }
  catch { return null; }
};

const getSavedRadius = (): number => {
  try { const r = localStorage.getItem(RADIUS_KEY); return r ? Number(r) : DEFAULT_RADIUS; }
  catch { return DEFAULT_RADIUS; }
};

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

  // Persist coords to sessionStorage and update state — only if moved >250m
  const updateCoords = useCallback((newCoords: Coords) => {
    setCoords(prev => {
      if (prev && calculateDistance(prev.lat, prev.lng, newCoords.lat, newCoords.lng) < 0.25) {
        return prev;
      }
      try { sessionStorage.setItem(COORD_CACHE_KEY, JSON.stringify(newCoords)); } catch { /* ignore */ }
      return newCoords;
    });
  }, []);

  // Update radius globally and persist to localStorage
  const setRadius = useCallback((r: number) => {
    setRadiusState(r);
    try { localStorage.setItem(RADIUS_KEY, String(r)); } catch { /* ignore */ }
  }, []);

  const clearLocationError = useCallback(() => setLocationError(null), []);

  // Request GPS permission + get position
  const requestLocation = useCallback(async () => {
    if (isLocatingRef.current) return;
    isLocatingRef.current = true;
    setIsLocating(true);
    try {
      let permStatus = await Geolocation.checkPermissions();
      if (permStatus.location === 'prompt' || permStatus.location === 'prompt-with-rationale') {
        permStatus = await Geolocation.requestPermissions();
      }
      if (permStatus.location === 'denied') {
        setPermissionStatus('denied');
        setCoords(null);
        return;
      }
      setPermissionStatus('granted');
      // maximumAge: 0 → OS'un GPS cache'ini asla kullanma, her zaman taze konum al
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 0 });
      updateCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (err: any) {
      console.warn('LocationContext GPS error:', err);
      const code = err?.code;
      if (code === 2) {
        setLocationError('gps_disabled');
      }
    } finally {
      isLocatingRef.current = false;
      setIsLocating(false);
    }
  }, [updateCoords]);

  // On mount + app foreground: always get fresh GPS
  useEffect(() => {
    requestLocation();

    // Capacitor: uygulama arka plandan ön plana gelince konumu tazele
    const listenerPromise = CapApp.addListener('appStateChange', (state) => {
      if (state.isActive) {
        requestLocation();
      }
    });

    return () => {
      listenerPromise.then(h => h.remove()).catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <LocationContext.Provider value={{ coords, radius, permissionStatus, isLocating, locationError, clearLocationError, setRadius, requestLocation, updateCoords }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationContext = (): LocationContextValue => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocationContext must be used inside LocationProvider');
  return ctx;
};
