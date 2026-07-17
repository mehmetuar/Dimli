import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { getNotificationsPaged, markAllNotificationsRead } from '../../../../services/api';
import { useSocket } from '../../../../contexts/SocketContext';
import { useCurrentUser } from '../../../../hooks/useCurrentUser';
import { readListCache, writeListCache, NOTIFICATIONS_CACHE_KEY } from '../../../../utils/listCache';
import { isNetworkError } from '../../../../utils/apiError';
import { useOnReconnect } from '../../../../hooks/useOnReconnect';
import { Challenge } from '../../../../types';

const PAGE_SIZE = 20;

export interface JoinRequest {
    id: string;
    user: {
        id: string;
        username: string;
        full_name?: string;
        position?: string;
        birthDate?: string;
        foot?: string;
        secondaryPosition?: string;
        location?: string;
        nationality?: string;
        avatarUrl?: string;
    };
    teamId: string;
    message?: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    createdAt: string;
}

export interface Notification {
    id: string;
    type: 'JOIN_REQUEST' | 'CHALLENGE' | 'MATCH_RESULT' | 'REMATCH_PROPOSAL' | 'SYSTEM' | 'MATCH_REMINDER' | 'RESERVATION_REQUEST' | 'JOKER_INVITE' | 'TEAM_KICKED' | 'JOIN_REQUEST_ACCEPTED' | 'TEAM_ADDED' | 'TEAM_ROLE_CHANGED' | 'TEAM_DELETED';
    relatedId: string;
    metadata: any;
    read: boolean;
    createdAt: string;
    title?: string;
    message?: string;
}

export const useNotifications = () => {
    const [searchParams] = useSearchParams();
    const initialTab = (() => {
        const t = searchParams.get('tab');
        if (t === 'JOIN_REQUESTS' || t === 'MATCH_REQUESTS') return t;
        return 'ALL';
    })();
    const [activeTab, setActiveTab] = useState<'ALL' | 'JOIN_REQUESTS' | 'MATCH_REQUESTS'>(initialTab);
    // Stale-while-revalidate: önbellekli sayfa-0 anında basılır, taze veri arkada
    // çekilir (JokerPool/Sahalar deseni) — soğuk açılışta spinner beklenmez.
    const [notifications, setNotifications] = useState<Notification[]>(() => readListCache(NOTIFICATIONS_CACHE_KEY));
    const [total, setTotal] = useState<number | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    // Ağ hatası / genel hata ayrımı — boş listede "Bağlantı yok + Tekrar Dene".
    const [loadError, setLoadError] = useState<'network' | 'generic' | null>(null);
    const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
    const [matchRequests, setMatchRequests] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(notifications.length === 0);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const navigate = useNavigate();
    const socket = useSocket();
    const { currentUser } = useCurrentUser();
    const [selectedJoinRequest, setSelectedJoinRequest] = useState<JoinRequest | null>(null);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

    // Sayfalama yarış korumaları (useJokerPool/useMarketplace referans deseni):
    // her reset bir "nesil" başlatır; eski yanıtlar reset'ten sonra uygulanmaz.
    const notificationsRef = useRef<Notification[]>(notifications);
    notificationsRef.current = notifications;
    const isFetchingRef = useRef(false);
    const fetchGenRef = useRef(0);

    // Kaptanlık ve yardımcı kaptanlık: kaptan veya viceCaptainIds içinde olan kullanıcı
    // maç istekleri + katılma istekleri sekmelerini görür ve işlem yapabilir.
    const isTeamLeader =
        currentUser?.team &&
        (currentUser.team.captainId === currentUser.id ||
            (currentUser.team.viceCaptainIds || []).includes(currentUser.id));
    const myTeamId = isTeamLeader ? currentUser.team.id : null;


    // Bildirim listesi — 20'şerli sunucu sayfalama + append + id-dedup.
    const fetchNotifications = useCallback(async (reset: boolean) => {
        if (!reset && isFetchingRef.current) return;
        const gen = reset ? ++fetchGenRef.current : fetchGenRef.current;
        const offset = reset ? 0 : notificationsRef.current.length;
        isFetchingRef.current = true;
        if (!reset) setLoadingMore(true);
        try {
            const { items, total: t, hasMore: more } = await getNotificationsPaged({ limit: PAGE_SIZE, offset });
            if (gen !== fetchGenRef.current) return; // daha yeni bir reset bunu geçersiz kıldı

            // Okundu işaretleme: TEK read-all isteği (eski bildirim-başına PATCH
            // döngüsü yerine). Yeni gelenler her zaman en yeni oldukları için
            // sayfa-0'da görünür → sayfa-0'da okunmamış yoksa gerisinde de yoktur.
            // Liste basımını bloklamasın diye beklenmez; badge event'i başarıda atılır.
            const unreadIds = items.filter((n: any) => !n.read).map((n: any) => n.id);
            if (reset && unreadIds.length > 0) {
                void markAllNotificationsRead(unreadIds)
                    .then(() => window.dispatchEvent(new CustomEvent('notificationsCleared')))
                    .catch(err => console.error('Bildirimler okundu işaretlenemedi:', err));
            }
            const readItems = items.map((n: any) => ({ ...n, read: true }));

            if (reset) {
                setNotifications(readItems);
                writeListCache(NOTIFICATIONS_CACHE_KEY, readItems);
            } else {
                // id-bazlı dedup: yeni bildirim gelişiyle offset kayarsa aynı kayıt
                // ikinci kez gelmesin (useJokerPool deseni).
                setNotifications(prev => {
                    const seen = new Set(prev.map(n => n.id));
                    return [...prev, ...readItems.filter((n: any) => !seen.has(n.id))];
                });
            }
            setTotal(t);
            setHasMore(more);
            setLoadError(null);
        } catch (error) {
            console.error('Bildirimler alınamadı:', error);
            if (reset) setLoadError(isNetworkError(error) ? 'network' : 'generic');
        } finally {
            if (gen === fetchGenRef.current) {
                isFetchingRef.current = false;
                setLoadingMore(false);
            }
        }
    }, []);

    // Katılma istekleri + gelen meydan okumalar — yalnız kaptansa, tek takım.
    const fetchSideData = useCallback(async () => {
        if (!myTeamId) {
            setJoinRequests([]);
            setMatchRequests([]);
            return;
        }
        const [joinRes, matchRes] = await Promise.allSettled([
            api.get(`/join-requests/team/${myTeamId}`),
            api.get(`/challenges/team/${myTeamId}/incoming`),
        ]);
        if (joinRes.status === 'fulfilled') setJoinRequests(joinRes.value.data);
        else console.error('Katılma istekleri alınamadı:', joinRes.reason);
        if (matchRes.status === 'fulfilled') setMatchRequests(matchRes.value.data);
        else console.error('Maç istekleri alınamadı:', matchRes.reason);
    }, [myTeamId]);

    const fetchData = useCallback(async () => {
        setLoading(notificationsRef.current.length === 0); // önbellek doluysa spinner yok
        try {
            await Promise.all([fetchNotifications(true), fetchSideData()]);
        } finally {
            setLoading(false);
        }
    }, [fetchNotifications, fetchSideData]);

    const loadMore = useCallback(() => {
        if (!hasMore || isFetchingRef.current) return;
        void fetchNotifications(false);
    }, [hasMore, fetchNotifications]);

    // Ağ geri gelince tam tazele (bildirimler + yan veriler).
    useOnReconnect(() => { void fetchData(); });

    useEffect(() => {
        void fetchData();

        // Reaktif socket (useSocket) — socket bağlanınca/değişince listener yeniden bağlanır.
        // Her event'te tam refetch yerine 1sn debounce'lu sayfa-0 reset: art arda
        // gelen event'ler (ör. toplu bildirim) tek yenilemeye katlanır.
        if (!socket) return;
        let debounce: ReturnType<typeof setTimeout> | null = null;
        const handleRefresh = () => {
            if (debounce) clearTimeout(debounce);
            debounce = setTimeout(() => { void fetchData(); }, 1000);
        };
        socket.on('notification', handleRefresh);
        socket.on('newChallenge', handleRefresh);
        socket.on('joinRequest', handleRefresh);

        return () => {
            if (debounce) clearTimeout(debounce);
            socket.off('notification', handleRefresh);
            socket.off('newChallenge', handleRefresh);
            socket.off('joinRequest', handleRefresh);
        };
    }, [socket, fetchData]);

    const handleAcceptJoinRequest = async (requestId: string) => {
        try {
            await api.patch(`/join-requests/${requestId}/accept`);
            await fetchData();
            setSuccessMessage('Katılma isteği kabul edildi! Oyuncu takıma eklendi.');
            setErrorMessage('');
        } catch (error: any) {
            console.error('Katılma isteği kabul edilemedi:', error);
            setErrorMessage(error.response?.data?.message || 'Kabul edilemedi.');
        }
    };

    const handleRejectJoinRequest = async (requestId: string) => {
        try {
            await api.patch(`/join-requests/${requestId}/reject`);
            await fetchData();
            setSuccessMessage('Katılma isteği reddedildi.');
            setErrorMessage('');
        } catch (error: any) {
            console.error('Katılma isteği reddedilemedi:', error);
            setErrorMessage(error.response?.data?.message || 'Reddedilemedi.');
        }
    };

    const handleAcceptChallenge = async (challengeId: string) => {
        try {
            await api.patch(`/challenges/${challengeId}/accept`);
            await fetchData();
            setSuccessMessage('Meydan okuma kabul edildi! Sohbet kanalı oluşturuluyor...');
            setErrorMessage('');
            setTimeout(() => navigate('/chat'), 1500);
        } catch (error: any) {
            console.error('Meydan okuma kabul edilemedi:', error);
            setErrorMessage(error.response?.data?.message || 'Kabul edilemedi.');
        }
    };

    const handleRejectChallenge = async (challengeId: string) => {
        try {
            await api.patch(`/challenges/${challengeId}/reject`);
            await fetchData();
            setSuccessMessage('Meydan okuma reddedildi.');
            setErrorMessage('');
        } catch (error: any) {
            console.error('Meydan okuma reddedilemedi:', error);
            setErrorMessage(error.response?.data?.message || 'Reddedilemedi.');
        }
    };

    const isMatchExpired = (dateVal: any, timeVal: any) => {
        if (!dateVal || !timeVal) return false;
        const dateStr = typeof dateVal === 'string' ? dateVal : new Date(dateVal).toISOString().split('T')[0];
        const matchDateTime = new Date(`${dateStr}T${timeVal}`);
        if (isNaN(matchDateTime.getTime())) return false;
        return new Date() > matchDateTime;
    };

    const handleAcceptRematchFromNotif = async (notification: Notification) => {
        const channelId = notification.metadata?.channelId;
        const matchAnnouncementId = notification.metadata?.matchAnnouncementId;
        if (!channelId || !matchAnnouncementId) {
            setErrorMessage('Teklif bilgileri eksik.');
            return;
        }
        try {
            const result = await api.post(`/chat/channels/${channelId}/accept-rematch`, {
                matchAnnouncementId
            });
            setSuccessMessage('Rövanş teklifi kabul edildi! Yeni sohbet kanalı oluşturuldu.');
            setErrorMessage('');
            setTimeout(() => navigate('/chat'), 1500);
        } catch (error: any) {
            console.error('Rövanş teklifi kabul edilemedi:', error);
            setErrorMessage(error.response?.data?.message || 'Kabul edilemedi.');
        }
    };

    const handleAcceptJokerInvite = async (notification: Notification) => {
        try {
            const result = await api.post(`/chat/joker-negotiation`, {
                notificationId: notification.id,
                matchId: notification.relatedId,
                inviterId: notification.metadata?.inviterId
            });
            setSuccessMessage('Joker daveti kabul edildi! Davet sahibi ile özel sohbet oluşturuldu.');
            setErrorMessage('');
            setTimeout(() => navigate('/chat', { state: { channelId: result.data.id } }), 1500);
        } catch (error: any) {
            console.error('Joker daveti kabul edilemedi:', error);
            setErrorMessage(error.response?.data?.message || 'Kabul edilemedi.');
            // Sunucu geçersiz/bayat daveti sildiyse listeden anında düşür.
            await fetchData();
        }
    };

    const handleRejectJokerInvite = async (notification: Notification) => {
        try {
            await api.delete(`/notifications/${notification.id}`);
            await fetchData();
            setSuccessMessage('Joker daveti reddedildi.');
            setErrorMessage('');
        } catch (error: any) {
            console.error('Joker daveti reddedilemedi:', error);
            setErrorMessage(error.response?.data?.message || 'Reddedilemedi.');
        }
    };

    const filteredJoinRequests = joinRequests.filter(r => r.status === 'PENDING');
    const filteredMatchRequests = matchRequests.filter(r => {
        if (r.status !== 'PENDING') return false;
        if (r.match) {
            return !isMatchExpired(r.match.date, r.match.time);
        }
        return true;
    });

    const rematchProposals = notifications.filter(n => {
        if (n.type !== 'REMATCH_PROPOSAL') return false;
        if (n.metadata?.matchDate && n.metadata?.matchTime) {
            return !isMatchExpired(n.metadata.matchDate, n.metadata.matchTime);
        }
        return true;
    });

    const jokerInvites = notifications.filter(n => {
        if (n.type !== 'JOKER_INVITE') return false;
        if (n.metadata?.matchDate && n.metadata?.matchTime) {
            return !isMatchExpired(n.metadata.matchDate, n.metadata.matchTime);
        }
        return true;
    });

    return {
        activeTab, setActiveTab,
        notifications, loading,
        total, hasMore, loadingMore, loadMore, loadError,
        refetch: fetchData,
        successMessage, errorMessage,
        selectedJoinRequest, setSelectedJoinRequest,
        selectedTeamId, setSelectedTeamId,
        filteredJoinRequests, filteredMatchRequests,
        rematchProposals, jokerInvites,
        handleAcceptJoinRequest, handleRejectJoinRequest,
        handleAcceptChallenge, handleRejectChallenge,
        handleAcceptRematchFromNotif, handleAcceptJokerInvite, handleRejectJokerInvite,
        isMatchExpired
    };
};
