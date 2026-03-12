import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../../../services/api';
import { getTacticalAdvice } from '../../../../services/geminiService';
import { SkillLevel } from '../../../../types';
import { formatMessageDate } from '../utils/chatUtils';

export const useChat = () => {
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    const [channels, setChannels] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [showTactic, setShowTactic] = useState(false);
    const [tactic, setTactic] = useState('');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [matchDetailData, setMatchDetailData] = useState<any>(null);
    const [isMatchDetailOpen, setIsMatchDetailOpen] = useState(false);
    const [isJokerDMInfoOpen, setIsJokerDMInfoOpen] = useState(false);
    const [isMatchDetailLoading, setIsMatchDetailLoading] = useState(false);

    const [currentUser, setCurrentUser] = useState<any>(null);

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

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/users/me');
                setCurrentUser(response.data);
            } catch (error) {
                console.error('Failed to fetch user:', error);
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        const fetchChannels = async () => {
            try {
                const response = await api.get('/chat/channels');
                setChannels(response.data);
            } catch (error) {
                console.error('Failed to fetch channels:', error);
            }
        };
        fetchChannels();
        const interval = setInterval(fetchChannels, 10000);
        return () => clearInterval(interval);
    }, [refreshTrigger]);

    useEffect(() => {
        if (location.state?.channelId) {
            setSelectedChannelId(location.state.channelId);
            window.history.replaceState({}, document.title);
        }
    }, [location, channels]);

    useEffect(() => {
        if (!selectedChannelId) return;

        const fetchMessages = async () => {
            try {
                const response = await api.get(`/chat/channels/${selectedChannelId}/messages`);
                const mappedMessages = response.data.map((msg: any) => ({
                    id: msg.id,
                    senderId: msg.senderId,
                    senderName: msg.sender?.full_name || msg.sender?.username || 'Unknown',
                    text: msg.content,
                    timestamp: formatMessageDate(msg.createdAt),
                    isMe: msg.senderId === currentUser?.id,
                    isSystem: msg.isSystemMessage,
                    metadata: msg.metadata
                }));
                setMessages(mappedMessages);
            } catch (error) {
                console.error('Failed to fetch messages:', error);
            }
        };

        fetchMessages();

        const markRead = async () => {
            try {
                await api.post(`/chat/channels/${selectedChannelId}/read`);
                const response = await api.get('/chat/channels');
                setChannels(response.data);
            } catch (error) {
                console.error('Failed to mark as read:', error);
            }
        };
        markRead();

        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [selectedChannelId, currentUser, refreshTrigger]);

    const activeChannel = channels.find(c => c.id === selectedChannelId);

    const handleSend = async () => {
        if (!input.trim() || !selectedChannelId) return;
        try {
            await api.post(`/chat/channels/${selectedChannelId}/messages`, { content: input });
            setInput('');
            const response = await api.get(`/chat/channels/${selectedChannelId}/messages`);
            const mappedMessages = response.data.map((msg: any) => ({
                id: msg.id,
                senderId: msg.senderId,
                senderName: msg.sender?.full_name || msg.sender?.username || 'Unknown',
                text: msg.content,
                timestamp: formatMessageDate(msg.createdAt),
                isMe: msg.senderId === currentUser?.id,
                isSystem: msg.isSystemMessage
            }));
            setMessages(mappedMessages);
            await api.post(`/chat/channels/${selectedChannelId}/read`);
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const handleGetTactics = async () => {
        if (!activeChannel) return;
        setTactic('Koç analiz yapıyor...');
        setShowTactic(true);
        const contextLevel = activeChannel.type === 'MATCH_GROUP' ? SkillLevel.ADVANCED : SkillLevel.INTERMEDIATE;
        const advice = await getTacticalAdvice(contextLevel, SkillLevel.INTERMEDIATE);
        setTactic(advice);
    };

    const handleDeleteChannel = async (channelId: string) => {
        setIsDeleting(true);
        try {
            await api.delete(`/chat/channels/${channelId}`);
            setChannels(prev => prev.filter(c => c.id !== channelId));
            setOptionsModalChannel(null);
            if (selectedChannelId === channelId) setSelectedChannelId(null);
            setSuccessModalMessage('Sohbet başarıyla silindi.');
            setSuccessModalType('MATCH_CANCELLED');
            setSuccessModalOpen(true);
        } catch (error: any) {
            console.error('Failed to delete channel:', error);
            const message = error.response?.data?.message || 'Sohbet silinemedi. Maç saati geçmemiş olabilir.';
            alert(message);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleOpenMatchDetail = async () => {
        if (!selectedChannelId || !activeChannel?.relatedMatchId) return;
        if (activeChannel.type === 'JOKER_NEGOTIATION') {
            setIsJokerDMInfoOpen(true);
        } else {
            setIsMatchDetailOpen(true);
        }
        setIsMatchDetailLoading(true);
        try {
            const response = await api.get(`/chat/channels/${selectedChannelId}/match-details`);
            if (response.data?.error) {
                setMatchDetailData(null);
            } else {
                setMatchDetailData(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch match details:', error);
            setMatchDetailData(null);
        } finally {
            setIsMatchDetailLoading(false);
        }
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
                setTimeout(() => {
                    if (result.data?.newChannelId) {
                        window.location.reload();
                    }
                }, 1500);
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
                setTimeout(() => {
                    if (result.data?.matchChannelId) {
                        setSelectedChannelId(result.data.matchChannelId);
                    } else {
                        window.location.reload();
                    }
                }, 1500);
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
        showTactic, setShowTactic,
        tactic, setTactic,
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
        handleSend, handleGetTactics, handleDeleteChannel, handleOpenMatchDetail,
        handleCancelMatch, handleCancelRequest, handleUndoCancelRequest,
        handleAcceptProposal, handleAcceptRematch, handleInviteJokerToMatch, handleCancelJokerNegotiation
    };
};
