import { useEffect, useRef } from 'react';

/**
 * Ağ yeniden bağlanınca (NetworkContext 'network:reconnected' event'i) verilen
 * callback'i çağırır. Sayfa hook'ları listelerini tazelemek için kullanır —
 * context bağımlılığı almadan (auth:sessionExpired window-event emsali).
 * cb ref'te tutulur: stale closure olmaz, listener bir kez takılır.
 */
export function useOnReconnect(cb: () => void): void {
    const cbRef = useRef(cb);
    cbRef.current = cb;

    useEffect(() => {
        const handler = () => cbRef.current();
        window.addEventListener('network:reconnected', handler);
        return () => window.removeEventListener('network:reconnected', handler);
    }, []);
}
