import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../../../services/api';
import { getToken, decodeTokenPayload } from '../../../../services/authStorage';
import { useSocket } from '../../../../contexts/SocketContext';
import { Challenge } from '../../../../types';

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
    type: 'JOIN_REQUEST' | 'CHALLENGE' | 'MATCH_RESULT' | 'REMATCH_PROPOSAL' | 'SYSTEM' | 'MATCH_REMINDER' | 'RESERVATION_REQUEST' | 'JOKER_INVITE' | 'TEAM_KICKED' | 'JOIN_REQUEST_ACCEPTED';
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
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
    const [matchRequests, setMatchRequests] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const navigate = useNavigate();
    const socket = useSocket();
    const [selectedJoinRequest, setSelectedJoinRequest] = useState<JoinRequest | null>(null);
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();

        // Reaktif socket (useSocket) — socket bağlanınca/değişince listener yeniden bağlanır.
        // Eskiden (window as any).__socket deps:[] ile okunuyordu; socket sonradan bağlanırsa
        // listener hiç takılmıyordu.
        if (!socket) return;
        const handleRefresh = () => fetchData();
        socket.on('notification', handleRefresh);
        socket.on('newChallenge', handleRefresh);
        socket.on('joinRequest', handleRefresh);

        return () => {
            socket.off('notification', handleRefresh);
            socket.off('newChallenge', handleRefresh);
            socket.off('joinRequest', handleRefresh);
        };
    }, [socket]);

    const getCurrentUserId = () => {
        const token = getToken();
        if (!token) return null;
        const payload = decodeTokenPayload(token);
        return payload?.sub ?? null;
    };

    const fetchData = async () => {
        try {
            setLoading(true);

            const notifResponse = await api.get('/notifications');
            const fetchedNotifications = notifResponse.data;
            setNotifications(fetchedNotifications);

            const unreadIds = fetchedNotifications.filter((n: any) => !n.read).map((n: any) => n.id);
            if (unreadIds.length > 0) {
                await Promise.all(unreadIds.map((id: string) => api.patch(`/notifications/${id}/read`)));
                window.dispatchEvent(new CustomEvent('notificationsCleared'));
            }

            const teamsResponse = await api.get('/teams');
            const myTeams = teamsResponse.data.filter((team: any) =>
                team.captainId === getCurrentUserId() ||
                team.captain?.id === getCurrentUserId()
            );

            const allJoinRequests: JoinRequest[] = [];
            const allMatchRequests: Challenge[] = [];

            for (const team of myTeams) {
                try {
                    const joinRes = await api.get(`/join-requests/team/${team.id}`);
                    allJoinRequests.push(...joinRes.data);
                } catch (err) {
                    console.error(`Katılma istekleri alınamadı (takım: ${team.id})`, err);
                }

                try {
                    const matchRes = await api.get(`/challenges/team/${team.id}/incoming`);
                    allMatchRequests.push(...matchRes.data);
                } catch (err) {
                    console.error(`Maç istekleri alınamadı (takım: ${team.id})`, err);
                }
            }

            setJoinRequests(allJoinRequests);
            setMatchRequests(allMatchRequests);

        } catch (error) {
            console.error('Bildirimler alınamadı:', error);
        } finally {
            setLoading(false);
        }
    };

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
