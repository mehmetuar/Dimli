import { useEffect, useRef } from 'react';

/**
 * Takım üyeliği/rolü değişince (useTeamEventsSync 'team:changed' event'i)
 * verilen callback'i çağırır. Store'a abone olmayan, kendi fetch'ini yapan
 * sayfalar (ör. MyTeam) lokal state'lerini tazelemek için kullanır —
 * useOnReconnect ('network:reconnected') deseninin birebir emsali.
 * cb ref'te tutulur: stale closure olmaz, listener bir kez takılır.
 */
export function useOnTeamChanged(cb: () => void): void {
    const cbRef = useRef(cb);
    cbRef.current = cb;

    useEffect(() => {
        const handler = () => cbRef.current();
        window.addEventListener('team:changed', handler);
        return () => window.removeEventListener('team:changed', handler);
    }, []);
}
