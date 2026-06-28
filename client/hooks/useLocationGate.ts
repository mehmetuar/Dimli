import { useLocationContext } from '../contexts/LocationContext';

export type LocationGateState = 'loading' | 'denied' | 'gps_disabled' | 'timeout' | 'ready';

export const useLocationGate = (): { state: LocationGateState } => {
    const { coords, permissionStatus, locationError, isLocating } = useLocationContext();

    if (coords) return { state: 'ready' };
    if (permissionStatus === 'denied') return { state: 'denied' };
    if (locationError === 'gps_disabled') return { state: 'gps_disabled' };
    // Konum alınamadı ve yeni bir deneme uçuşta değilse → yeniden denenebilir hata kartı
    if (locationError === 'timeout' && !isLocating) return { state: 'timeout' };
    return { state: 'loading' };
};
