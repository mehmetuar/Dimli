import { useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { fetchCurrentUser } from '../services/currentUserStore';
import { getRole } from '../services/authStorage';

// Takım üyeliğini/rolünü DEĞİŞTİREN sunucu bildirimleri. Bu tiplerden biri
// gelince currentUser.team bayatlamış demektir → store zorla tazelenir.
// (TEAM_KICKED/JOIN_REQUEST_ACCEPTED eski sunucuda da var; diğer üçü yeni.)
const TEAM_EVENT_TYPES = new Set([
    'TEAM_KICKED',
    'JOIN_REQUEST_ACCEPTED',
    'TEAM_ADDED',
    'TEAM_ROLE_CHANGED',
    'TEAM_DELETED',
]);

/**
 * Global takım-olayı senkronu — AppContent'te BİR KEZ mount edilir.
 *
 * Başka bir kullanıcının aksiyonu (atılma, kabul, doğrudan ekleme, rol
 * değişikliği, takım silme) bu kullanıcının takım durumunu değiştirdiğinde
 * sunucu socket 'notification' emit'i gönderir; burada ortak currentUserStore
 * zorla tazelenir → Maç Pazarı/Sahalar/Bildirimler/Chat yetkileri anında düzelir.
 * MyTeam gibi store'a abone OLMAYAN sayfalar için 'team:changed' window-event'i
 * yayınlanır (useOnTeamChanged ile dinlenir; network:reconnected emsali).
 *
 * Ek sertleştirme: iOS arka planda socket'i askıya alır — arada kaçan emitler
 * resume/reconnect'te ('connect') zorla tazelemeyle telafi edilir.
 */
export function useTeamEventsSync(): void {
    const socket = useSocket();

    useEffect(() => {
        if (!socket) return;

        const refresh = () => {
            if (getRole() === 'business_owner') return; // işletme hesabında takım yok
            void fetchCurrentUser({ force: true });
            window.dispatchEvent(new CustomEvent('team:changed'));
        };

        const onNotification = (payload: { type?: string } | undefined) => {
            if (!payload?.type || !TEAM_EVENT_TYPES.has(payload.type)) return;
            refresh();
        };
        // Reconnect telafisi: kaçırılmış olabilecek takım olaylarına karşı
        // her (yeniden) bağlanışta bir kez tazele (8dk keepalive ile aynı iş).
        const onConnect = () => {
            if (getRole() === 'business_owner') return;
            void fetchCurrentUser({ force: true });
        };

        socket.on('notification', onNotification);
        socket.on('connect', onConnect);
        return () => {
            socket.off('notification', onNotification);
            socket.off('connect', onConnect);
        };
    }, [socket]);
}
