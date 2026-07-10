import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import { subscribe, getCurrentUserSnapshot, fetchCurrentUser } from '../../../../services/currentUserStore';
import { formatMessageDate } from '../utils/chatUtils';
import { useSocket } from '../../../../contexts/SocketContext';
import { isNetworkError } from '../../../../utils/apiError';
import { readListCache, writeListCache, CHANNELS_CACHE_KEY } from '../../../../utils/listCache';
import { useOnReconnect } from '../../../../hooks/useOnReconnect';

const mapMsg = (msg: any, currentUserId?: string) => ({
    id: msg.id,
    senderId: msg.senderId,
    senderName: msg.sender?.full_name || msg.sender?.username || 'Unknown',
    senderTeamId: msg.sender?.team?.id ?? null,
    text: msg.content,
    timestamp: formatMessageDate(msg.createdAt),
    rawCreatedAt: msg.createdAt,
    isMe: msg.senderId === currentUserId,
    isSystem: msg.isSystemMessage,
    metadata: msg.metadata,
});

export const useChat = () => {
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    // Stale-while-revalidate: önbellekli kanal listesi (ilk 30) anında basılır —
    // çevrimdışı açılışta "Henüz sohbetin yok" yerine son bilinen sohbetler görünür.
    const [channels, setChannels] = useState<any[]>(() => readListCache(CHANNELS_CACHE_KEY));
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const sendingRef = useRef(false); // çift gönderim guard'ı (hızlı 2 dokunuş)
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [matchDetailData, setMatchDetailData] = useState<any>(null);
    const [isMatchDetailOpen, setIsMatchDetailOpen] = useState(false);
    const [isJokerDMInfoOpen, setIsJokerDMInfoOpen] = useState(false);
    const [isMatchDetailLoading, setIsMatchDetailLoading] = useState(false);

    // currentUserStore'dan senkron oku — localStorage önbelleği varsa ilk render'da dolu gelir,
    // böylece kanallar açılırken "Mehmet Uçar" → "Sen" flash'ı olmaz.
    const currentUser = useSyncExternalStore(subscribe, getCurrentUserSnapshot);

    const [optionsModalChannel, setOptionsModalChannel] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);

    const [isRematchModalOpen, setIsRematchModalOpen] = useState(false);
    const [isKendiAramizdaNewMatchOpen, setIsKendiAramizdaNewMatchOpen] = useState(false);
    const [isManageJokersModalOpen, setIsManageJokersModalOpen] = useState(false);

    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
    const [confirmTitle, setConfirmTitle] = useState('Onay');
    const [confirmMessage, setConfirmMessage] = useState('Bu işlemi onaylıyor musunuz?');
    const [confirmIsDangerous, setConfirmIsDangerous] = useState(false);
    const [confirmButtonText, setConfirmButtonText] = useState('Onayla');

    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [successModalMessage, setSuccessModalMessage] = useState('');
    const [successModalType, setSuccessModalType] = useState<any>('DEFAULT');

    // Ban modal: null = kapalı, { expiry: ISO string | null } = açık
    const [banModalExpiry, setBanModalExpiry] = useState<string | null | undefined>(undefined);

    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [isLoadingChannels, setIsLoadingChannels] = useState(channels.length === 0);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    // Ağ hatası ayrımı — boş kanal listesinde "Bağlantı yok" ile gerçek
    // "Henüz sohbetin yok" karışmasın.
    const [channelsError, setChannelsError] = useState<'network' | 'generic' | null>(null);

    const socket = useSocket();
    const isFirstChannelFetchRef = useRef(true);
    const location = useLocation();
    const navigate = useNavigate();

    // currentUserStore'u başlat / tazele — store zaten başka hook tarafından
    // beslenmişse TTL dolmadan ağa çıkmaz (dedupe).
    useEffect(() => { void fetchCurrentUser(); }, []);

    const fetchChannels = useCallback(async () => {
        try {
            const response = await api.get('/chat/channels');
            setChannels(response.data);
            // Sayfa-0 dengi: ilk 30 kanal çevrimdışı açılış için saklanır.
            writeListCache(CHANNELS_CACHE_KEY, (response.data ?? []).slice(0, 30));
            setChannelsError(null);
        } catch (error) {
            console.error('Failed to fetch channels:', error);
            setChannelsError(isNetworkError(error) ? 'network' : 'generic');
        } finally {
            if (isFirstChannelFetchRef.current) {
                isFirstChannelFetchRef.current = false;
                setIsLoadingChannels(false);
            }
        }
    }, []);

    // Ağ geri gelince kanal listesini tazele (60sn fallback interval'ini beklemeden).
    useOnReconnect(fetchChannels);

    useEffect(() => {
        fetchChannels();
        // 60s fallback — socket koptuğunda liste güncel kalır
        const interval = setInterval(fetchChannels, 60000);

        if (socket) {
            let debounceTimer: ReturnType<typeof setTimeout> | null = null;
            const onChannelCreated = () => fetchChannels();
            const onNewMessage = () => {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    debounceTimer = null;
                    fetchChannels();
                }, 1500);
            };
            socket.on('channelCreated', onChannelCreated);
            socket.on('newMessage', onNewMessage);
            return () => {
                clearInterval(interval);
                if (debounceTimer) clearTimeout(debounceTimer);
                socket.off('channelCreated', onChannelCreated);
                socket.off('newMessage', onNewMessage);
            };
        }
        return () => clearInterval(interval);
    }, [refreshTrigger, socket]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const deepLinkChannelId = location.state?.channelId || params.get('channelId');
        if (deepLinkChannelId) {
            setSelectedChannelId(deepLinkChannelId);
            navigate('/chat', { replace: true, state: {} });
        }
    }, [location, channels]);

    // Kanal değişince eski mesajları hemen temizle ve loading başlat
    useEffect(() => {
        if (!selectedChannelId) return;
        setMessages([]);
        setIsLoadingMessages(true);
        setMatchDetailData(null);
    }, [selectedChannelId]);

    useEffect(() => {
        if (!selectedChannelId) return;

        const PAGE_SIZE = 50;

        const fetchMessages = async () => {
            try {
                const response = await api.get(`/chat/channels/${selectedChannelId}/messages`, {
                    params: { limit: PAGE_SIZE },
                });
                const mapped = response.data.map((msg: any) => mapMsg(msg, currentUser?.id));
                setMessages(mapped);
                setHasMore(response.data.length === PAGE_SIZE);
            } catch (error) {
                console.error('Failed to fetch messages:', error);
            } finally {
                setIsLoadingMessages(false);
            }
        };

        fetchMessages();

        const channelIdAtMount = selectedChannelId;

        const markRead = async (channelId: string) => {
            try {
                await api.post(`/chat/channels/${channelId}/read`);
                window.dispatchEvent(new Event('chatRead'));
                const response = await api.get('/chat/channels');
                setChannels(response.data);
            } catch (error) {
                console.error('Failed to mark as read:', error);
            }
        };

        // Kanala girildiğinde oku
        markRead(channelIdAtMount);

        // 60s fallback — socket koptuğunda mesajlar güncel kalır
        const interval = setInterval(fetchMessages, 60000);

        const onNewMessage = (data: any) => {
            if (data?.channelId === channelIdAtMount) fetchMessages();
        };
        if (socket) socket.on('newMessage', onNewMessage);

        // Kanaldan çıkılırken de oku — kanalda görülen sistem mesajları okunmuş sayılsın
        return () => {
            clearInterval(interval);
            if (socket) socket.off('newMessage', onNewMessage);
            markRead(channelIdAtMount);
        };
    }, [selectedChannelId, currentUser, refreshTrigger, socket]);

    const activeChannel = channels.find(c => c.id === selectedChannelId);

    const loadMoreMessages = async () => {
        if (!selectedChannelId || loadingMore || !hasMore) return;
        const oldest = messages[0]?.rawCreatedAt;
        if (!oldest) return;
        setLoadingMore(true);
        try {
            const response = await api.get(`/chat/channels/${selectedChannelId}/messages`, {
                params: { before: oldest, limit: 50 },
            });
            if (response.data.length === 0) {
                setHasMore(false);
                return;
            }
            const older = response.data.map((msg: any) => mapMsg(msg, currentUser?.id));
            setMessages(prev => [...older, ...prev]);
            setHasMore(response.data.length === 50);
        } catch (error) {
            console.error('Failed to load more messages:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleSend = async () => {
        const text = input.trim();
        if (!text || !selectedChannelId) return;
        // Re-entry guard: gönderim sürerken ikinci dokunuş yok sayılır.
        if (sendingRef.current) return;
        sendingRef.current = true;
        setIsSending(true);
        // Input'u await'ten ÖNCE temizle → ikinci dokunuş boş input'la erken döner.
        setInput('');
        try {
            await api.post(`/chat/channels/${selectedChannelId}/messages`, { content: text });
            const response = await api.get(`/chat/channels/${selectedChannelId}/messages`);
            const mappedMessages = response.data.map((msg: any) => mapMsg(msg, currentUser?.id));
            setMessages(mappedMessages);
            await api.post(`/chat/channels/${selectedChannelId}/read`);
        } catch (error: any) {
            setInput(text); // hata → metni geri yükle ki kullanıcı tekrar gönderebilsin
            const data = error.response?.data;
            if (data?.statusCode === 403 && 'chatBanExpiry' in data) {
                setBanModalExpiry(data.chatBanExpiry ?? null);
            }
        } finally {
            sendingRef.current = false;
            setIsSending(false);
        }
    };

    const handleDeleteChannel = async (channelId: string) => {
        setIsDeleting(true);
        try {
            await api.delete(`/chat/channels/${channelId}`);
            setChannels(prev => prev.filter(c => c.id !== channelId));
            // Silinen sohbetin okunmamışları rozetten düşsün: Navbar 'chatRead' → fetchCounts()
            // ile /chat/unread-count'u (deletedAt IS NULL filtreli) yeniden çeker (markRead ile aynı desen).
            window.dispatchEvent(new Event('chatRead'));
            setOptionsModalChannel(null);
            if (selectedChannelId === channelId) setSelectedChannelId(null);
            setSuccessModalMessage('Sohbet başarıyla silindi.');
            setSuccessModalType('DEFAULT');
            setSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Failed to delete channel:', error);
            const message = error.response?.data?.message || 'Sohbet silinemedi. Maç saati geçmemiş olabilir.';
            alert(message);
        } finally {
            setIsDeleting(false);
        }
    };

    const fetchMatchDetailData = useCallback(async (channelId: string) => {
        try {
            const response = await api.get(`/chat/channels/${channelId}/match-details`);
            if (response.data?.error) {
                setMatchDetailData(null);
            } else {
                setMatchDetailData(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch match details:', error);
            setMatchDetailData(null);
        }
    }, []);

    // Kanal seçilince maç/işletme verisini arka planda yükle — "Seçenekler"
    // menüsündeki "Sahayı Ara" butonu, maç detay paneli hiç açılmasa da
    // güncel ownerPhone/isDeleted durumunu yansıtabilsin diye.
    useEffect(() => {
        if (!selectedChannelId || !activeChannel?.relatedMatchId) return;
        fetchMatchDetailData(selectedChannelId);
    }, [selectedChannelId, activeChannel?.relatedMatchId, fetchMatchDetailData]);

    const handleOpenMatchDetail = async () => {
        if (!selectedChannelId || !activeChannel?.relatedMatchId) return;
        if (activeChannel.type === 'JOKER_NEGOTIATION') {
            setIsJokerDMInfoOpen(true);
        } else {
            setIsMatchDetailOpen(true);
        }
        setIsMatchDetailLoading(true);
        await fetchMatchDetailData(selectedChannelId);
        setIsMatchDetailLoading(false);
    };

    const handleCancelMatch = async (reservationId: string) => {
        setConfirmTitle('Maçı İptal Et');
        setConfirmMessage('Maçı iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz ve tüm oyunculara bildirim gider.');
        setConfirmIsDangerous(true);
        setConfirmButtonText('İptal Et');
        setConfirmAction(() => async () => {
            try {
                await api.post(`/reservations/${reservationId}/cancel`, { teamId: currentUser?.team?.id });
                setSuccessModalMessage('Maç başarıyla iptal edildi.');
                setSuccessModalType('MATCH_CANCELLED');
                setSuccessModalOpen(true);
                setRefreshTrigger(prev => prev + 1);
            } catch (error: any) {
                alert(error.response?.data?.message || 'İptal işlemi başarısız.');
            }
        });
        setConfirmModalOpen(true);
    };

    const handleCancelRequest = async (reservationId: string) => {
        setConfirmTitle('İptal İsteği Gönder');
        setConfirmMessage('İşletmeye iptal isteği göndermek istediğinize emin misiniz? İşletme onaylayana kadar maçınız kesinleşmiş statüde kalacaktır.');
        setConfirmIsDangerous(true);
        setConfirmButtonText('İstek Gönder');
        setConfirmAction(() => async () => {
            try {
                await api.post(`/reservations/${reservationId}/request-cancel`, { teamId: currentUser?.team?.id, userId: currentUser?.id });
                setSuccessModalMessage('İptal isteği işletmeye gönderildi.');
                setSuccessModalType('MESSAGE_SENT');
                setSuccessModalOpen(true);
                setRefreshTrigger(prev => prev + 1);
            } catch (error: any) {
                alert(error.response?.data?.message || 'İstek gönderilemedi.');
            }
        });
        setConfirmModalOpen(true);
    };

    const handleUndoCancelRequest = async (reservationId: string) => {
        setConfirmTitle('İptal İsteğini Geri Al');
        setConfirmMessage('Gönderdiğiniz iptal isteğini geri almak istediğinize emin misiniz?');
        setConfirmIsDangerous(false);
        setConfirmButtonText('İsteği Geri Al');
        setConfirmAction(() => async () => {
            try {
                await api.post(`/reservations/${reservationId}/undo-cancel-request`, { teamId: currentUser?.team?.id, userId: currentUser?.id });
                setSuccessModalMessage('İptal isteği başarıyla geri alındı.');
                setSuccessModalType('MESSAGE_SENT');
                setSuccessModalOpen(true);
                setRefreshTrigger(prev => prev + 1);
            } catch (error: any) {
                alert(error.response?.data?.message || 'İşlem başarısız.');
            }
        });
        setConfirmModalOpen(true);
    };

    const handleAcceptProposal = async (reservationId: string) => {
        setConfirmTitle('Saat Önerisini Kabul Et');
        setConfirmMessage('Bu saat önerisini kabul etmek istediğinize emin misiniz?');
        setConfirmIsDangerous(false);
        setConfirmButtonText('Onayla');
        setConfirmAction(() => async () => {
            try {
                await api.post(`/reservations/${reservationId}/accept-proposal`, { userId: currentUser?.id });
                setSuccessModalMessage('Teklif kabul edildi! Maç saati güncellendi.');
                setSuccessModalType('MATCH_APPROVED');
                setSuccessModalOpen(true);
                setRefreshTrigger(prev => prev + 1);
            } catch (error: any) {
                console.error('Failed to accept proposal:', error);
                alert(error.response?.data?.message || 'İşlem başarısız.');
            }
        });
        setConfirmModalOpen(true);
    };

    const handleAcceptRematch = async (matchAnnouncementId: string) => {
        setConfirmTitle('Rövanş Teklifi');
        setConfirmMessage('Bu rövanş teklifini kabul etmek istediğinize emin misiniz?');
        setConfirmIsDangerous(false);
        setConfirmButtonText('Onayla');
        setConfirmAction(() => async () => {
            try {
                const result = await api.post(`/chat/channels/${selectedChannelId}/accept-rematch`, {
                    matchAnnouncementId
                });
                setSuccessModalMessage('Teklif kabul edildi! Yeni sohbet kanalı oluşturuldu.');
                setSuccessModalType('CHALLENGE_ACCEPTED');
                setSuccessModalOpen(true);
                // Yenilemeyi ball-success animasyonu (~3.27s) tamamlanana kadar ertele → yarıda kesilmez.
                setTimeout(() => {
                    if (result.data?.newChannelId) {
                        window.location.reload();
                    }
                }, 3400);
            } catch (error: any) {
                console.error('Failed to accept rematch:', error);
                setSuccessModalMessage(error.response?.data?.message || 'İşlem başarısız.');
                setSuccessModalOpen(true);
            }
        });
        setConfirmModalOpen(true);
    };

    const handleInviteJokerToMatch = async () => {
        if (!selectedChannelId) return;
        setConfirmTitle('Jokeri Maça Dahil Et');
        setConfirmMessage('Jokeri asıl maç grubuna dahil etmek istediğinize emin misiniz? Joker, takımınızın maç saatini ve sahasını görebilecek, maç sohbetine katılabilecektir.');
        setConfirmIsDangerous(false);
        setConfirmButtonText('Dahil Et');
        setConfirmAction(() => async () => {
            try {
                const result = await api.post(`/chat/channels/${selectedChannelId}/invite-joker`);
                setSuccessModalMessage('Joker maça başarıyla eklendi! Genel sohbete yönlendiriliyorsunuz.');
                setSuccessModalType('CHALLENGE_ACCEPTED');
                setSuccessModalOpen(true);
                // Yönlendirmeyi ball-success animasyonu (~3.27s) tamamlanana kadar ertele → yarıda kesilmez.
                setTimeout(() => {
                    if (result.data?.matchChannelId) {
                        setSelectedChannelId(result.data.matchChannelId);
                    } else {
                        window.location.reload();
                    }
                }, 3400);
            } catch (error: any) {
                console.error('Failed to invite joker:', error);
                alert(error.response?.data?.message || 'İşlem başarısız.');
            }
        });
        setConfirmModalOpen(true);
    };

    const handleCancelJokerNegotiation = async () => {
        if (!selectedChannelId) return;
        setConfirmTitle('Anlaşmayı İptal Et');
        setConfirmMessage('Bu joker ile olan anlaşmayı iptal etmek istediğinize emin misiniz? Sohbet kalıcı olarak silinecektir.');
        setConfirmIsDangerous(true);
        setConfirmButtonText('Anlaşmayı İptal Et');
        setConfirmAction(() => async () => {
            try {
                await api.delete(`/chat/channels/${selectedChannelId}`);
                setChannels(prev => prev.filter(c => c.id !== selectedChannelId));
                setSelectedChannelId(null);
                setSuccessModalMessage('Joker anlaşması iptal edildi.');
                setSuccessModalType('MATCH_CANCELLED');
                setSuccessModalOpen(true);
            } catch (error: any) {
                console.error('Failed to cancel joker negotiation:', error);
                alert(error.response?.data?.message || 'İşlem başarısız.');
            }
        });
        setConfirmModalOpen(true);
    };

    return {
        selectedChannelId, setSelectedChannelId,
        channels, activeChannel,
        messages, currentUser,
        input, setInput,
        isSending,
        isInviteModalOpen, setIsInviteModalOpen,
        matchDetailData, setMatchDetailData,
        isMatchDetailOpen, setIsMatchDetailOpen,
        isJokerDMInfoOpen, setIsJokerDMInfoOpen,
        isMatchDetailLoading, setIsMatchDetailLoading,
        optionsModalChannel, setOptionsModalChannel,
        isDeleting, setIsDeleting,
        isChatMenuOpen, setIsChatMenuOpen,
        isRematchModalOpen, setIsRematchModalOpen,
        isKendiAramizdaNewMatchOpen, setIsKendiAramizdaNewMatchOpen,
        isManageJokersModalOpen, setIsManageJokersModalOpen,
        confirmModalOpen, setConfirmModalOpen,
        confirmAction, setConfirmAction,
        confirmTitle, setConfirmTitle,
        confirmMessage, setConfirmMessage,
        confirmIsDangerous, setConfirmIsDangerous,
        confirmButtonText, setConfirmButtonText,
        successModalOpen, setSuccessModalOpen, successModalMessage, successModalType,
        banModalExpiry, setBanModalExpiry,
        handleSend, handleDeleteChannel, handleOpenMatchDetail,
        handleCancelMatch, handleCancelRequest, handleUndoCancelRequest,
        handleAcceptProposal, handleAcceptRematch, handleInviteJokerToMatch, handleCancelJokerNegotiation,
        hasMore, loadingMore, loadMoreMessages,
        isLoadingChannels, isLoadingMessages, channelsError,
        fetchChannels,
    };
};
