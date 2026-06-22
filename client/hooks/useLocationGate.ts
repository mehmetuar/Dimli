import { useLocationContext } from '../contexts/LocationContext';

export type LocationGateState = 'loading' | 'denied' | 'gps_disabled' | 'ready';

export const useLocationGate = (): { state: LocationGateState } => {
    const { coords, permissionStatus, locationError } = useLocationContext();

    if (coords) return { state: 'ready' };
    if (permissionStatus === 'denied') return { state: 'denied' };
    if (locationError === 'gps_disabled') return { state: 'gps_disabled' };
    return { state: 'loading' };
};
