import { useLocationContext } from '../contexts/LocationContext';

export type LocationGateState = 'loading' | 'denied' | 'gps_disabled' | 'network_location_off' | 'timeout' | 'ready';

export const useLocationGate = (): { state: LocationGateState } => {
    const { coords, permissionStatus, locationError, isLocating } = useLocationContext();

    if (coords) return { state: 'ready' };
    if (permissionStatus === 'denied') return { state: 'denied' };
    if (locationError === 'gps_disabled') return { state: 'gps_disabled' };
    // §104: konum açık ama ağ sağlayıcısı kapalı — hedefli yönlendirme kartı
    if (locationError === 'network_location_off' && !isLocating) return { state: 'network_location_off' };
    // Konum alınamadı ve yeni bir deneme uçuşta değilse → yeniden denenebilir hata kartı
    if (locationError === 'timeout' && !isLocating) return { state: 'timeout' };
    return { state: 'loading' };
};
