import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';

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
  const isLocatingRef = useRef(false);

  // Persist coords to sessionStorage and update state
  const updateCoords = useCallback((c: Coords) => {
    try { sessionStorage.setItem(COORD_CACHE_KEY, JSON.stringify(c)); } catch { /* ignore */ }
    setCoords(c);
  }, []);

  // Update radius globally and persist to localStorage
  const setRadius = useCallback((r: number) => {
    setRadiusState(r);
    try { localStorage.setItem(RADIUS_KEY, String(r)); } catch { /* ignore */ }
  }, []);

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
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
      updateCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (err) {
      console.warn('LocationContext GPS error:', err);
    } finally {
      isLocatingRef.current = false;
      setIsLocating(false);
    }
  }, [updateCoords]);

  // On mount: get fresh GPS (cached coords are already in state via useState initializer)
  useEffect(() => {
    requestLocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <LocationContext.Provider value={{ coords, radius, permissionStatus, isLocating, setRadius, requestLocation, updateCoords }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationContext = (): LocationContextValue => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocationContext must be used inside LocationProvider');
  return ctx;
};
