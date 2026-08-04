import { useState, useEffect, useRef, useCallback, useMemo, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import { subscribe, getCurrentUserSnapshot, fetchCurrentUser } from '../../../../services/currentUserStore';
import { formatMessageDate, mergeMessages } from '../utils/chatUtils';
import { useSocket } from '../../../../contexts/SocketContext';
import { isNetworkError } from '../../../../utils/apiError';
import { readListCache, writeListCache, CHANNELS_CACHE_KEY } from '../../../../utils/listCache';
import { useOnReconnect } from '../../../../hooks/useOnReconnect';

const mapMsg = (msg: any, currentUserId?: string) => ({
    id: msg.id,
    senderId: msg.senderId,
    senderName: msg.sender?.full_name || msg.sender?.username || 'Unknown',
    senderTeamId: msg.sender?.team?.id ?? null,
    senderAvatarUrl: msg.sender?.avatarUrl ?? null,
    text: msg.content,
    timestamp: formatMessageDate(msg.createdAt),
    rawCreatedAt: msg.createdAt,
    isMe: msg.senderId === currentUserId,
    isSystem: msg.isSystemMessage,
    metadata: msg.metadata,
    // Sunucunun kompakt replyTo önizlemesi (id, senderId, senderName, content).
    // Eski sunucuda alan yok → null, alıntı bloğu çizilmez.
    replyTo: msg.replyTo
        ? {
            id: msg.replyTo.id,
            senderId: msg.replyTo.senderId ?? null,
            senderName: msg.replyTo.senderName ?? 'Bilinmeyen',
            text: msg.replyTo.content ?? '',
        }
        : null,
});

export const useChat = () => {
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    // Stale-while-revalidate: önbellekli kanal listesi (ilk 30) anında basılır —
    // çevrimdışı açılışta "Henüz sohbetin yok" yerine son bilinen sohbetler görünür.
    const [channels, setChannels] = useState<any[]>(() => readListCache(CHANNELS_CACHE_KEY));
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    // Cevaplanmakta olan mesaj (WhatsApp tarzı) — input üstündeki banner'ı besler,
    // handleSend POST body'sine replyToId olarak gider.
    const [replyingTo, setReplyingTo] = useState<any | null>(null);
    // Anketler: pollId → PollView haritası. Duyuru mesajındaki metadata.pollId
    // render'da buradan join'lenir; pollUpdated socket olayı tek girdi merge eder.
    const [polls, setPolls] = useState<Record<string, any>>({});
    const pollsRef = useRef<Record<string, any>>({});
    pollsRef.current = polls;
    const pollVoteBusyRef = useRef<Set<string>>(new Set()); // poll-başına çift dokunuş guard'ı
    const [isPollCreateOpen, setIsPollCreateOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const sendingRef = useRef(false); // çift gönderim guard'ı (hızlı 2 dokunuş)
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [matchDetailData, setMatchDetailData] = useState<any>(null);
    const [isMatchDetailOpen, setIsMatchDetailOpen] = useState(false);
    const [isJokerDMInfoOpen, setIsJokerDMInfoOpen] = useState(false);
    const [isMatchDetailLoading, setIsMatchDetailLoading] = useState(false);
    // Abone (sabit rezervasyon) kanalı detay modalı
    const [subscriptionDetailData, setSubscriptionDetailData] = useState<any>(null);
    const [isSubscriptionDetailOpen, setIsSubscriptionDetailOpen] = useState(false);
    const [isSubscriptionDetailLoading, setIsSubscriptionDetailLoading] = useState(false);

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

    // Ağ geri gelince kanal listesini + açık kanalın mesajlarını tazele
    // (60sn fallback interval'ini beklemeden). Mesaj tarafı merge ile senkronlanır
    // — yüklenmiş eski sayfalar korunur (ref, mesaj efektinde set edilir).
    const resyncMessagesRef = useRef<(() => void) | null>(null);
    const resyncPollsRef = useRef<(() => void) | null>(null);
    useOnReconnect(useCallback(() => {
        fetchChannels();
        resyncMessagesRef.current?.();
        resyncPollsRef.current?.(); // kopuklukta kaçan pollUpdated'ler telafi edilir
    }, [fetchChannels]));

    useEffect(() => {
        fetchChannels();
        // 60s fallback — socket koptuğunda liste güncel kalır
        const interval = setInterval(fetchChannels, 60000);

        if (socket) {
            let debounceTimer: ReturnType<typeof setTimeout> | null = null;
            const onChannelCreated = () => fetchChannels();
            // Kanal kaldırıldı (abonelik sonlandı / takımdan çıkarıldı): açık olan
            // kanal buysa listeye dön, listeyi tazele. Eski client'lar bu olayı
            // dinlemez — 60sn polling ile yakalar.
            const onChannelRemoved = (payload?: { channelId?: string }) => {
                if (payload?.channelId) {
                    setSelectedChannelId((prev) => (prev === payload.channelId ? null : prev));
                }
                fetchChannels();
            };
            const onNewMessage = () => {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    debounceTimer = null;
                    fetchChannels();
                }, 1500);
            };
            socket.on('channelCreated', onChannelCreated);
            socket.on('channelRemoved', onChannelRemoved);
            socket.on('newMessage', onNewMessage);
            return () => {
                clearInterval(interval);
                if (debounceTimer) clearTimeout(debounceTimer);
                socket.off('channelCreated', onChannelCreated);
                socket.off('channelRemoved', onChannelRemoved);
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
        setReplyingTo(null); // kanal değişti — önceki kanalın cevap hedefi taşınmasın
        setPolls({}); // önceki kanalın anketleri taşınmasın
    }, [selectedChannelId]);

    // ── Okundu bilgisi (watermark modeli) ────────────────────────────────────
    // userId → {name, avatarUrl, teamId, lastReadAt}. null = bilinmiyor/eski
    // sunucu (404) → tikler ve "Bilgi" aksiyonu hiç çizilmez (feature-detect).
    const [readStates, setReadStates] = useState<Record<string, any> | null>(null);

    const fetchReadStates = useCallback(async (channelId: string) => {
        try {
            const res = await api.get(`/chat/channels/${channelId}/read-states`);
            setReadStates(Object.fromEntries(res.data.map((p: any) => [p.userId, p])));
        } catch {
            // 404 = eski sunucu → readStates null kalır, tik gizli
        }
    }, []);

    useEffect(() => {
        setReadStates(null);
        if (!selectedChannelId) return;
        fetchReadStates(selectedChannelId);

        // Karşı taraf sohbeti açıp okuyunca canlı tik güncellemesi — tek girdi
        // güncellenir, refetch yok (§89 merge disiplini).
        const onMessagesRead = (data: any) => {
            if (data?.channelId !== selectedChannelId || !data?.userId) return;
            setReadStates(prev => prev
                ? { ...prev, [data.userId]: { ...(prev[data.userId] ?? {}), userId: data.userId, lastReadAt: data.lastReadAt } }
                : prev);
        };
        // Gönderen otomatik okumuş sayılır (sunucu sendMessage auto-read) — ayrı
        // messagesRead yayını yok; newMessage'dan çıkarsanır.
        const onNewMessageBumpRead = (data: any) => {
            if (data?.channelId !== selectedChannelId) return;
            const m = data.message;
            if (m?.senderId && !m.isSystemMessage && m.createdAt) {
                setReadStates(prev => (prev && prev[m.senderId])
                    ? { ...prev, [m.senderId]: { ...prev[m.senderId], lastReadAt: m.createdAt } }
                    : prev);
            }
        };
        if (socket) {
            socket.on('messagesRead', onMessagesRead);
            socket.on('newMessage', onNewMessageBumpRead);
        }
        return () => {
            if (socket) {
                socket.off('messagesRead', onMessagesRead);
                socket.off('newMessage', onNewMessageBumpRead);
            }
        };
    }, [selectedChannelId, socket, fetchReadStates]);

    // ── Anketler (kendi aramızda maç sohbetleri, §96) ────────────────────────
    const fetchPolls = useCallback(async (channelId: string) => {
        try {
            const res = await api.get(`/chat/channels/${channelId}/polls`);
            setPolls(Object.fromEntries(res.data.map((p: any) => [p.id, p])));
        } catch {
            // 404 = eski sunucu → harita boş kalır, duyurular düz metin görünür (feature-detect)
        }
    }, []);

    useEffect(() => {
        if (!selectedChannelId) return;
        fetchPolls(selectedChannelId);
        resyncPollsRef.current = () => fetchPolls(selectedChannelId);

        // Canlı oy/kapatma güncellemesi — tek girdi merge, refetch yok (§89 disiplini)
        const onPollUpdated = (data: any) => {
            if (data?.channelId !== selectedChannelId || !data?.poll?.id) return;
            setPolls(prev => ({ ...prev, [data.poll.id]: data.poll }));
        };
        // pollUpdated/newMessage sıralama yarışı + reconnect boşluğu: anket
        // duyurusu gelir de anket haritada yoksa listeyi çek.
        const onNewPollMessage = (data: any) => {
            if (data?.channelId !== selectedChannelId) return;
            const meta = data?.message?.metadata;
            if (meta?.type === 'POLL' && meta.pollId && !pollsRef.current[meta.pollId]) {
                fetchPolls(selectedChannelId);
            }
        };
        if (socket) {
            socket.on('pollUpdated', onPollUpdated);
            socket.on('newMessage', onNewPollMessage);
        }
        return () => {
            resyncPollsRef.current = null;
            if (socket) {
                socket.off('pollUpdated', onPollUpdated);
                socket.off('newMessage', onNewPollMessage);
            }
        };
    }, [selectedChannelId, socket, fetchPolls]);

    // Deklaratif oy: istenen TAM seçim gönderilir ([] = geri çekme). Sunucu
    // diff'i uygular; yanıt otoriter PollView'dur, haritaya merge edilir.
    const handleVote = async (pollId: string, optionIds: string[]) => {
        if (pollVoteBusyRef.current.has(pollId)) return;
        pollVoteBusyRef.current.add(pollId);
        try {
            const res = await api.post(`/chat/polls/${pollId}/votes`, { optionIds });
            setPolls(prev => ({ ...prev, [res.data.id]: res.data }));
        } catch (error: any) {
            if (error.response?.status === 400 && selectedChannelId) {
                // Anket altımızdan kapanmış/değişmiş olabilir — güncel hali çek
                fetchPolls(selectedChannelId);
            } else {
                alert(error.response?.data?.message || 'Oy verilemedi.');
            }
        } finally {
            pollVoteBusyRef.current.delete(pollId);
        }
    };

    const handleClosePoll = (pollId: string) => {
        setConfirmTitle('Anketi Sonlandır');
        setConfirmMessage('Anketi sonlandırmak istediğinize emin misiniz? Oylama kapanacak ve sonuçlar sabitlenecek.');
        setConfirmIsDangerous(true);
        setConfirmButtonText('Sonlandır');
        setConfirmAction(() => async () => {
            try {
                const res = await api.post(`/chat/polls/${pollId}/close`);
                setPolls(prev => ({ ...prev, [res.data.id]: res.data }));
            } catch (error: any) {
                alert(error.response?.data?.message || 'Anket sonlandırılamadı.');
            }
        });
        setConfirmModalOpen(true);
    };

    // Oluşturma POST'u PollCreateModal'ın içinde — modal onCreated ile haritaya merge eder
    const handlePollCreated = (poll: any) => {
        if (poll?.id) setPolls(prev => ({ ...prev, [poll.id]: poll }));
    };

    // Diğer aktif katılımcıların en KÜÇÜK watermark'ı — bir mesaj bundan eskiyse
    // HERKES okumuştur (balon başına tek Date karşılaştırması, O(n+m)).
    const othersMinLastReadAt = useMemo(() => {
        if (!readStates || !currentUser?.id) return null;
        const others = Object.values(readStates).filter((p: any) => p.userId !== currentUser.id);
        if (others.length === 0) return null; // tek kalınan kanal → hep gri
        return others.reduce(
            (min: number, p: any) => Math.min(min, p.lastReadAt ? new Date(p.lastReadAt).getTime() : 0),
            Infinity,
        );
    }, [readStates, currentUser?.id]);

    useEffect(() => {
        if (!selectedChannelId) return;

        const PAGE_SIZE = 50;

        // initial=true: kanal açılışı/refreshTrigger → tam yenileme (replace).
        // initial=false: interval/socket-fallback/reconnect → merge — yukarı
        // kaydırmayla yüklenmiş eski sayfalar KORUNUR, tam replace yapılmaz.
        const fetchLatest = async (initial: boolean) => {
            try {
                const response = await api.get(`/chat/channels/${selectedChannelId}/messages`, {
                    params: { limit: PAGE_SIZE },
                });
                const mapped = response.data.map((msg: any) => mapMsg(msg, currentUser?.id));
                setMessages(prev => (initial ? mapped : mergeMessages(prev, mapped)));
                if (initial) setHasMore(response.data.length === PAGE_SIZE);
            } catch (error) {
                console.error('Failed to fetch messages:', error);
            } finally {
                if (initial) setIsLoadingMessages(false);
            }
        };

        fetchLatest(true);
        resyncMessagesRef.current = () => fetchLatest(false);

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

        // 60s fallback — socket koptuğunda mesajlar güncel kalır (merge: sayfalar korunur)
        const interval = setInterval(() => fetchLatest(false), 60000);

        const onNewMessage = (data: any) => {
            if (data?.channelId !== channelIdAtMount) return;
            const raw = data.message;
            // Zengin payload (sender var / sistem mesajı / kendi mesajım) → doğrudan
            // merge, refetch yok. İnce payload (eski sunucu) + gönderen başkası →
            // merge-fetch fallback ("Unknown" balonu görünmesin).
            if (raw?.id && (raw.sender || raw.isSystemMessage || (raw.senderId && raw.senderId === currentUser?.id))) {
                // Kendi mesajımın socket yankısı POST yanıtından önce gelirse
                // uçuştaki pending temp balonu düşür (id'ler farklı — merge
                // tekilleştiremez, açıkça filtrelenir).
                setMessages(prev => mergeMessages(
                    raw.senderId === currentUser?.id
                        ? prev.filter(m => !(m.pending && m.text === raw.content))
                        : prev,
                    [mapMsg(raw, currentUser?.id)],
                ));
            } else {
                fetchLatest(false);
            }
        };
        if (socket) socket.on('newMessage', onNewMessage);

        // Kanaldan çıkılırken de oku — kanalda görülen sistem mesajları okunmuş sayılsın
        return () => {
            clearInterval(interval);
            resyncMessagesRef.current = null;
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
            // merge: socket ile yarışta sınır mesajları tekilleşir, sıra bozulmaz
            setMessages(prev => mergeMessages(prev, older));
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
        // Cevap hedefini yakala ve banner'ı hemen kapat (input ile aynı yaşam döngüsü).
        const reply = replyingTo;
        setReplyingTo(null);
        // Optimistic balon: tek gri tik ('sending') POST uçuştayken görünür.
        // Temp id ≠ gerçek id — merge tekilleştiremez, başarı VE hatada AÇIKÇA
        // filtrelenmeli (yoksa hayalet balon kalır; merge asla silmez).
        const tempId = `tmp-${Date.now()}`;
        const nowIso = new Date().toISOString();
        setMessages(prev => [...prev, {
            id: tempId,
            senderId: currentUser?.id,
            senderName: currentUser?.full_name || currentUser?.username || '',
            senderTeamId: currentUser?.team?.id ?? null,
            senderAvatarUrl: currentUser?.avatarUrl ?? null,
            text,
            timestamp: formatMessageDate(nowIso),
            rawCreatedAt: nowIso,
            isMe: true,
            isSystem: false,
            pending: true,
            // Optimistik alıntı önizlemesi — sunucu yankısı otoriter halini getirir.
            replyTo: reply
                ? { id: reply.id, senderId: reply.senderId, senderName: reply.senderName, text: reply.text }
                : null,
        }]);
        try {
            // POST yanıtı sanitize edilmiş sender+team taşır → refetch'siz merge.
            // Yüklenmiş eski sayfalar korunur; socket yankısı merge'de no-op olur.
            // replyToId undefined ise axios key'i düşürür — eski sunucu yalnız
            // content okuduğundan cevap düz mesaj olarak gider (graceful degradation).
            const response = await api.post(`/chat/channels/${selectedChannelId}/messages`, {
                content: text,
                replyToId: reply?.id,
            });
            setMessages(prev => mergeMessages(
                prev.filter(m => m.id !== tempId),
                [mapMsg(response.data, currentUser?.id)],
            ));
            await api.post(`/chat/channels/${selectedChannelId}/read`);
        } catch (error: any) {
            setMessages(prev => prev.filter(m => m.id !== tempId)); // başarısız → balonu kaldır
            setInput(text); // hata → metni geri yükle ki kullanıcı tekrar gönderebilsin
            setReplyingTo(reply); // cevap hedefi de geri gelsin
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

    // Abone (SUBSCRIPTION) kanalının detayı — maç detayının ikizi. Kanalın
    // relatedMatchId'si olmadığı için ayrı uçtan çekilir; hata/eski sunucu
    // durumunda modal avatarData.subscription yedeğiyle render olur.
    const fetchSubscriptionDetailData = useCallback(async (channelId: string) => {
        try {
            const response = await api.get(`/chat/channels/${channelId}/subscription-details`);
            setSubscriptionDetailData(response.data?.error ? null : response.data);
        } catch (error) {
            console.error('Failed to fetch subscription details:', error);
            setSubscriptionDetailData(null);
        }
    }, []);

    const handleOpenMatchDetail = async () => {
        if (!selectedChannelId) return;
        // Abone kanalı: maç yok, abonelik detay modalı açılır.
        if (activeChannel?.type === 'SUBSCRIPTION') {
            setIsSubscriptionDetailOpen(true);
            setIsSubscriptionDetailLoading(true);
            await fetchSubscriptionDetailData(selectedChannelId);
            setIsSubscriptionDetailLoading(false);
            return;
        }
        if (!activeChannel?.relatedMatchId) return;
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
        readStates, othersMinLastReadAt, fetchReadStates,
        input, setInput,
        replyingTo, setReplyingTo,
        polls, handleVote, handleClosePoll, handlePollCreated,
        isPollCreateOpen, setIsPollCreateOpen,
        isSending,
        isInviteModalOpen, setIsInviteModalOpen,
        matchDetailData, setMatchDetailData,
        isMatchDetailOpen, setIsMatchDetailOpen,
        isJokerDMInfoOpen, setIsJokerDMInfoOpen,
        isMatchDetailLoading, setIsMatchDetailLoading,
        subscriptionDetailData,
        isSubscriptionDetailOpen, setIsSubscriptionDetailOpen,
        isSubscriptionDetailLoading,
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
