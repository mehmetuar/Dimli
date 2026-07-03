import { useCallback, useEffect, useSyncExternalStore } from 'react';
import {
    subscribe,
    getCurrentUserSnapshot,
    hasSettledCurrentUser,
    fetchCurrentUser,
} from '../services/currentUserStore';

/**
 * Ortak currentUser aboneliği — stale-while-revalidate.
 * Sıcak cache'te `currentUser` anında dolu ve `isLoading` hiç true olmaz;
 * yalnız gerçek ilk yüklemede (cache boş + ilk fetch sürüyor) true döner.
 */
export function useCurrentUser() {
    const currentUser = useSyncExternalStore(subscribe, getCurrentUserSnapshot);
    const settled = useSyncExternalStore(subscribe, hasSettledCurrentUser);

    useEffect(() => { void fetchCurrentUser(); }, []);

    const refresh = useCallback(() => fetchCurrentUser({ force: true }), []);

    return {
        currentUser,
        isLoading: !currentUser && !settled,
        refresh,
    };
}
