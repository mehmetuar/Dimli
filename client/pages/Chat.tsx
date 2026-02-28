
import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, ChevronLeft, Users, Shield, Star, Phone, MessageSquare, UserPlus, ArrowDown, Swords, MoreVertical, X, ChevronRight, Trash2, XCircle, AlertTriangle } from 'lucide-react';
import { getTacticalAdvice } from '../services/geminiService';
import { SkillLevel, ChatChannel, Team } from '../types';
import { MOCK_CHANNELS, MOCK_MESSAGES, MOCK_TEAMS, CURRENT_USER, MOCK_JOKERS } from '../constants';
import { useLocation, useNavigate } from 'react-router-dom';
import { KendiAramizdaMatchModal } from '../components/KendiAramizdaMatchModal';
import { InviteJokerModal } from '../components/InviteJokerModal';
import { MatchDetailModal } from '../components/MatchDetailModal';
import { RematchProposalModal } from '../components/RematchProposalModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { SuccessModal } from '../components/SuccessModal';
import { SystemMessageRenderer, stripSystemMessageMarkers } from '../components/SystemMessageRenderer';
import { KendiAramizdaNewMatchModal } from '../components/KendiAramizdaNewMatchModal';
import api from '../services/api';

// Utility Hook for Long Press
const useLongPress = (callback: () => void, ms = 500) => {
  const [startLongPress, setStartLongPress] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (startLongPress) {
      timerRef.current = setTimeout(callback, ms);
    } else {
      clearTimeout(timerRef.current);
    }

    return () => {
      clearTimeout(timerRef.current);
    };
  }, [startLongPress, callback, ms]);

  return {
    onMouseDown: () => setStartLongPress(true),
    onMouseUp: () => setStartLongPress(false),
    onMouseLeave: () => setStartLongPress(false),
    onTouchStart: () => setStartLongPress(true),
    onTouchEnd: () => setStartLongPress(false),
  };
};

// Date Formatting Helper (WhatsApp Style)
const formatMessageDate = (dateString: string | Date) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  // Check if today
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }

  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Dün';
  }

  // Check if within last week
  // Check if within last week
  if (diff < 7 * oneDay) {
    return date.toLocaleDateString('tr-TR', { weekday: 'long' });
  }

  // Older
  return date.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

// Match Status Data Helper
const getMatchStatusInfo = (reservation?: { status: string; slotTime: string }): {
  label: string;
  borderColor: string;
  badgeColor: string;
  textColor: string;
  bgTint: string;
  type: 'pending' | 'confirmed' | 'played' | 'unplayed';
} | null => {
  if (!reservation) return null;

  const now = new Date();
  const slotDate = new Date(reservation.slotTime);
  const matchEndTime = new Date(slotDate.getTime() + 60 * 60 * 1000);

  // REJECTED veya CANCELLED: her zaman Oynanmamış Maç (zaman bağımsız)
  if (reservation.status === 'REJECTED' || reservation.status === 'CANCELLED') {
    return { label: 'Oynanmamış Maç', borderColor: 'border-red-500/60', badgeColor: '#ef4444', textColor: 'text-red-400', bgTint: 'bg-red-500/5', type: 'unplayed' };
  }
  if (now > slotDate && reservation.status !== 'APPROVED') {
    return { label: 'Oynanmamış Maç', borderColor: 'border-red-500/60', badgeColor: '#ef4444', textColor: 'text-red-400', bgTint: 'bg-red-500/5', type: 'unplayed' };
  }
  if (reservation.status === 'PENDING') {
    return { label: 'Onay Bekliyor', borderColor: 'border-orange-500/60', badgeColor: '#f97316', textColor: 'text-orange-400', bgTint: 'bg-orange-500/5', type: 'pending' };
  }
  if (reservation.status === 'APPROVED' && now <= matchEndTime) {
    return { label: 'Kesinleşti', borderColor: 'border-green-500/60', badgeColor: '#22c55e', textColor: 'text-green-400', bgTint: 'bg-green-500/5', type: 'confirmed' };
  }
  if (reservation.status === 'APPROVED' && now > matchEndTime) {
    return { label: 'Oynanmış Maç', borderColor: 'border-blue-500/60', badgeColor: '#3b82f6', textColor: 'text-blue-400', bgTint: 'bg-blue-500/5', type: 'played' };
  }
  return null;
};

// Inline Badge SVG Component
const MatchStatusBadge: React.FC<{ reservation?: { status: string; slotTime: string }, size?: 'sm' | 'md' }> = ({ reservation, size = 'sm' }) => {
  const info = getMatchStatusInfo(reservation);
  if (!info) return null;
  const s = size === 'sm' ? 14 : 16;

  if (info.type === 'pending') {
    return (
      <span className="inline-flex items-center ml-1.5 shrink-0" title={info.label}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" fill={info.badgeColor} />
          <circle cx="12" cy="12" r="8" fill="none" stroke="white" strokeWidth="1.5" />
          <path d="M12 7.5v4.5l2.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (info.type === 'unplayed') {
    return (
      <span className="inline-flex items-center ml-1.5 shrink-0" title={info.label}>
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" fill={info.badgeColor} />
          <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  // confirmed or played → checkmark
  return (
    <span className="inline-flex items-center ml-1.5 shrink-0" title={info.label}>
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" fill={info.badgeColor} />
        <path d="M7.5 12.5l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
};

export const Chat: React.FC = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [showTactic, setShowTactic] = useState(false);
  const [tactic, setTactic] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [matchDetailData, setMatchDetailData] = useState<any>(null);
  const [isMatchDetailOpen, setIsMatchDetailOpen] = useState(false);
  const [isMatchDetailLoading, setIsMatchDetailLoading] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);

  // Chat Options Modal State
  const [optionsModalChannel, setOptionsModalChannel] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);

  // Rematch Proposal Modal State
  const [isRematchModalOpen, setIsRematchModalOpen] = useState(false);

  // Kendi Aramızda Yeni Maç Modal State
  const [isKendiAramizdaNewMatchOpen, setIsKendiAramizdaNewMatchOpen] = useState(false);

  // Confirm & Success Modal States
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState('Onay');
  const [confirmMessage, setConfirmMessage] = useState('Bu işlemi onaylıyor musunuz?');
  const [confirmIsDangerous, setConfirmIsDangerous] = useState(false);
  const [confirmButtonText, setConfirmButtonText] = useState('Onayla');

  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState('');

  // Refresh Trigger State for Auto-reloading data
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Scroll State
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isUserAtBottomRef = useRef(true); // Default to true so it scrolls on first load
  const endRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Fetch Current User
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

  // Fetch Channels
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

    // Poll for new channels every 10 seconds
    const interval = setInterval(fetchChannels, 10000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  // Auto-open channel from navigation state
  useEffect(() => {
    if (location.state?.channelId) {
      setSelectedChannelId(location.state.channelId);
      // Clear state so it doesn't stick if we navigate back
      window.history.replaceState({}, document.title);
    }
  }, [location, channels]); // Add channels dependency to ensure we can find it

  // Fetch Messages for Selected Channel
  useEffect(() => {
    if (!selectedChannelId) return;

    const fetchMessages = async () => {
      try {
        const response = await api.get(`/chat/channels/${selectedChannelId}/messages`);
        // Map backend messages to frontend format
        const mappedMessages = response.data.map((msg: any) => ({
          id: msg.id,
          senderId: msg.senderId,
          senderName: msg.sender?.full_name || msg.sender?.username || 'Unknown',
          text: msg.content,
          timestamp: formatMessageDate(msg.createdAt), // Use format helper
          isMe: msg.senderId === currentUser?.id,
          isSystem: msg.isSystemMessage,
          metadata: msg.metadata // Map metadata
        }));
        setMessages(mappedMessages);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };

    fetchMessages();

    // Mark as read immediately when entering channel
    const markRead = async () => {
      try {
        await api.post(`/chat/channels/${selectedChannelId}/read`);
        // Refresh channels to update unread counts in the list
        const response = await api.get('/chat/channels');
        setChannels(response.data);
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    };
    markRead();

    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedChannelId, currentUser, refreshTrigger]);

  // Get current active channel object
  const activeChannel = channels.find(c => c.id === selectedChannelId);

  // Identify Opponents (Team or Joker) - Simplified for now
  const opponentTeam = null; // To be implemented if needed for specific UI logic
  const opponentJoker = null;

  const handleSend = async () => {
    if (!input.trim() || !selectedChannelId) return;

    try {
      await api.post(`/chat/channels/${selectedChannelId}/messages`, { content: input });
      setInput('');
      // Optimistic update or wait for poll
      // For now, let's just re-fetch immediately
      const response = await api.get(`/chat/channels/${selectedChannelId}/messages`);
      const mappedMessages = response.data.map((msg: any) => ({
        id: msg.id,
        senderId: msg.senderId,
        senderName: msg.sender?.full_name || msg.sender?.username || 'Unknown',
        text: msg.content,
        timestamp: formatMessageDate(msg.createdAt), // Use format helper
        isMe: msg.senderId === currentUser?.id,
        isSystem: msg.isSystemMessage
      }));
      setMessages(mappedMessages);

      // Mark as read
      await api.post(`/chat/channels/${selectedChannelId}/read`);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleGetTactics = async () => {
    if (!activeChannel) return;

    setTactic('Koç analiz yapıyor...');
    setShowTactic(true);

    // Context-aware prompt simulation
    const contextLevel = activeChannel.type === 'MATCH_GROUP' ? SkillLevel.ADVANCED : SkillLevel.INTERMEDIATE;
    const advice = await getTacticalAdvice(contextLevel, SkillLevel.INTERMEDIATE);
    setTactic(advice);
  };

  const handleDeleteChannel = async () => {
    if (!optionsModalChannel) return;

    setIsDeleting(true);
    try {
      await api.delete(`/chat/channels/${optionsModalChannel.id}`);
      // Remove from list locally
      setChannels(prev => prev.filter(c => c.id !== optionsModalChannel.id));
      setOptionsModalChannel(null); // Close modal
    } catch (error: any) {
      console.error('Failed to delete channel:', error);
      // Extract message from error response if available
      const message = error.response?.data?.message || 'Sohbet silinemedi. Maç saati geçmemiş olabilir.';
      alert(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    endRef.current?.scrollIntoView({ behavior });
  };

  const handleOpenMatchDetail = async () => {
    if (!selectedChannelId || !activeChannel?.relatedMatchId) return;
    setIsMatchDetailOpen(true);
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

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // Check if user is near bottom (within 100px)
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;
    isUserAtBottomRef.current = isAtBottom;
    setShowScrollButton(!isAtBottom);
  };

  // Scroll effect on new messages
  useEffect(() => {
    // Only scroll if user was already at bottom
    if (isUserAtBottomRef.current) {
      scrollToBottom();
    }
  }, [messages, tactic]);

  // Reset scroll and menu on channel change
  useEffect(() => {
    setIsChatMenuOpen(false);
    isUserAtBottomRef.current = true;
    setShowScrollButton(false);
    // Use timeout to ensure content is rendered before scrolling
    setTimeout(() => scrollToBottom('instant'), 100);
  }, [selectedChannelId]);

  // --- COMPONENT: CHANNEL LIST ---
  if (!selectedChannelId) {
    return (
      <div className="pb-24 pt-20 px-4 max-w-3xl mx-auto min-h-screen bg-pitch">
        <header className="mb-6">
          <h1 className="font-sport font-black text-4xl text-white uppercase italic tracking-tighter">
            OPERASYON <span className="text-turf-500">MERKEZİ</span>
          </h1>
          <p className="text-slate-400 text-sm">Maçlarını planla, taktik al, kazan.</p>
        </header>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Aktif Sohbetler</h3>

          {channels.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              Henüz aktif sohbet yok.
            </div>
          ) : (
            channels.map(channel => {
              // We need a way to pass the channel to the long press callback
              // Wrapper component or inline logic? Inline logic with closure is tricky for hook.
              // Let's implement the handlers directly on the div without the generic hook for simplicity in map loop
              // actually, we can't call hooks inside callback.

              // Better approach: Create a sub-component for ChannelItem? 
              // Or just use simple native events.

              return (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  onClick={() => setSelectedChannelId(channel.id)}
                  onLongPress={() => setOptionsModalChannel(channel)}
                />
              );
            })
          )}
        </div>

        {/* --- CHAT OPTIONS MODAL --- */}
        {optionsModalChannel && (() => {
          const modalStatusInfo = getMatchStatusInfo(optionsModalChannel.reservation);
          const canDelete = modalStatusInfo?.type === 'played' || modalStatusInfo?.type === 'unplayed';
          return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-slate-800 w-full max-w-sm rounded-3xl border border-slate-700 p-6 relative">
                <button
                  onClick={() => setOptionsModalChannel(null)}
                  className="absolute top-4 right-4 text-slate-500 hover:text-white"
                >
                  <ChevronLeft className="w-6 h-6 rotate-180" />
                </button>

                <h3 className="text-xl font-bold text-white mb-2 text-center">{optionsModalChannel.name}</h3>
                <p className="text-slate-400 text-sm text-center mb-6">Bu sohbet için ne yapmak istersin?</p>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setOptionsModalChannel(null);
                    }}
                    className="w-full bg-slate-700 text-white font-bold py-3 rounded-xl hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                  >
                    Vazgeç
                  </button>

                  {canDelete && (
                    <button
                      onClick={handleDeleteChannel}
                      disabled={isDeleting}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-900/50 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      {isDeleting ? 'Siliniyor...' : (
                        <><Shield className="w-5 h-5" /> Sohbeti Sil</>
                      )}
                    </button>
                  )}
                </div>

                {!canDelete && (
                  <p className="text-[10px] text-slate-600 text-center mt-4">
                    Not: Sadece oynanmış veya oynanmamış maç sohbetleri silinebilir.
                  </p>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // --- ACTION HANDLERS ---
  const handleCancelMatch = async (reservationId: string) => {
    setConfirmTitle('Maçı İptal Et');
    setConfirmMessage('Maçı iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz ve tüm oyunculara bildirim gider.');
    setConfirmIsDangerous(true);
    setConfirmButtonText('İptal Et');
    setConfirmAction(() => async () => {
      try {
        await api.post(`/reservations/${reservationId}/cancel`, { teamId: currentUser?.team?.id });
        setSuccessModalMessage('Maç başarıyla iptal edildi.');
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
        await api.post(`/reservations/${reservationId}/request-cancel`, { teamId: currentUser?.team?.id });
        setSuccessModalMessage('İptal isteği işletmeye gönderildi.');
        setSuccessModalOpen(true);
        setRefreshTrigger(prev => prev + 1);
      } catch (error: any) {
        alert(error.response?.data?.message || 'İstek gönderilemedi.');
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

  // --- COMPONENT: ACTIVE CHAT VIEW ---
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-pitch-surface">
      <InviteJokerModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        joker={opponentJoker}
      />

      <RematchProposalModal
        isOpen={isRematchModalOpen}
        onClose={() => setIsRematchModalOpen(false)}
        channelId={selectedChannelId || ''}
        matchType={getMatchStatusInfo(activeChannel?.reservation)?.type === 'played' ? 'played' : 'unplayed'}
        previousPitchId={activeChannel?.pitch?.id}
        previousPlayerCount={activeChannel?.match?.playerCount}
      />

      {/* Kendi Aramızda — Yeni Maç Ayarla */}
      <KendiAramizdaNewMatchModal
        isOpen={isKendiAramizdaNewMatchOpen}
        onClose={() => setIsKendiAramizdaNewMatchOpen(false)}
        channelId={selectedChannelId || ''}
        previousPitchId={activeChannel?.pitch?.id}
      />

      {matchDetailData?.match?.matchType === 'kendi_aramizda' ? (
        <KendiAramizdaMatchModal
          isOpen={isMatchDetailOpen}
          onClose={() => setIsMatchDetailOpen(false)}
          data={matchDetailData}
          loading={isMatchDetailLoading}
        />
      ) : (
        <MatchDetailModal
          isOpen={isMatchDetailOpen}
          onClose={() => setIsMatchDetailOpen(false)}
          data={matchDetailData}
          loading={isMatchDetailLoading}
        />
      )}

      {/* Safe-area spacer — status bar arka planını header rengiyle örtüyor */}
      <div className="bg-slate-900 w-full flex-shrink-0" style={{ height: 'env(safe-area-inset-top, 0px)' }} />

      {/* Custom Header */}
      <div className="bg-slate-900/90 backdrop-blur p-4 border-b border-slate-800 flex flex-col gap-3 sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedChannelId(null)}
            className="p-2 -ml-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <img
            src={activeChannel?.avatarUrl || 'https://picsum.photos/200'}
            className="w-10 h-10 rounded-full bg-slate-800 object-cover cursor-pointer active:scale-90 transition-transform"
            onClick={handleOpenMatchDetail}
          />
          <div className="flex-1" onClick={handleOpenMatchDetail} style={{ cursor: activeChannel?.relatedMatchId ? 'pointer' : 'default' }}>
            <h2 className="text-white font-bold leading-tight flex items-center">{activeChannel?.name}<MatchStatusBadge reservation={activeChannel?.reservation} size="md" /></h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {activeChannel?.type === 'MATCH_GROUP' ? (
                <div className="flex flex-col">
                  <span className="flex items-center gap-1 text-turf-500"><Users className="w-3 h-3" /> {activeChannel.participants?.length || 14} Oyuncu Aktif</span>
                  {(() => {
                    const info = getMatchStatusInfo(activeChannel?.reservation);
                    if (info) return <span className={`text-[10px] font-semibold ${info.textColor}`}>{info.label}</span>;
                    return null;
                  })()}
                </div>
              ) : (
                <span className="flex items-center gap-1 text-green-500"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Çevrimiçi</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {/* Show Invite Button ONLY if chatting with a Joker */}
            {opponentJoker && (
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="bg-gradient-to-r from-turf-600 to-green-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-turf-500/20 animate-pulse-slow"
              >
                <UserPlus className="w-4 h-4" />
                <span className="text-xs font-bold hidden sm:inline">Maça Davet Et</span>
              </button>
            )}

            {/* Chat Menu Options */}
            <div className="relative">
              <button
                onClick={() => setIsChatMenuOpen(true)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                title="Seçenekler"
              >
                <MoreVertical className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Captain Quick Actions (Only for DM with Team) */}
        {activeChannel?.type === 'DM' && opponentTeam && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 min-w-fit">
              <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                <span className="font-black text-[10px] text-yellow-900">C</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase font-bold leading-none">Kaptan</span>
                <span className="text-xs text-white font-bold leading-none">Ulaşılabilir</span>
              </div>
            </div>

            {opponentTeam.viceCaptainIds && opponentTeam.viceCaptainIds.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 min-w-fit opacity-75 hover:opacity-100">
                <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center border border-slate-500">
                  <span className="font-black text-[10px] text-white">2.K</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 uppercase font-bold leading-none">2. Kaptan</span>
                  <span className="text-xs text-white font-bold leading-none">Müsait</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-6 bg-pitch relative"
      >
        {/* System Welcome Message */}
        <div className="flex justify-center">
          <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide mt-6">
            {activeChannel?.type === 'MATCH_GROUP' ? 'Maç Grubu Oluşturuldu' : 'Sohbet Başlatıldı'}
          </span>
        </div>

        {messages.map((msg, index) => {
          const isNextSameTime = messages[index + 1]?.timestamp === msg.timestamp;
          const prevMsg = messages[index - 1];
          const nextMsg = messages[index + 1];
          // WhatsApp-style grouping: hide avatar/name if previous non-system message is from same sender
          const isPrevSameSender = prevMsg && !prevMsg.isSystem && !msg.isSystem && prevMsg.senderId === msg.senderId;
          const isNextSameSender = nextMsg && !nextMsg.isSystem && !msg.isSystem && nextMsg.senderId === msg.senderId;

          return msg.isSystem ? (
            <div key={msg.id} className="flex justify-center my-4 animate-fade-in px-4 w-full">
              <div className="bg-slate-800/95 border border-slate-700 text-slate-200 text-sm font-medium px-6 py-4 rounded-xl text-center w-full shadow-lg whitespace-pre-wrap">
                <SystemMessageRenderer text={msg.text} />

                {/* Action Button for Time Proposals */}
                {msg.metadata?.type === 'PROPOSAL_ACTION' && (
                  <button
                    onClick={() => handleAcceptProposal(msg.metadata.reservationId)}
                    className="mt-3 bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-4 rounded-full text-xs transition-colors flex items-center gap-1 mx-auto"
                  >
                    <span>✅</span>
                    <span>Teklifi Kabul Et</span>
                  </button>
                )}

                {/* Accept Button for Rematch Proposals */}
                {msg.metadata?.type === 'REMATCH_PROPOSAL' && msg.metadata?.matchAnnouncementId && (() => {
                  // Show accept button only to opponent team's captain/vice-captain
                  const userTeamId = currentUser?.team?.id;
                  const isCaptain = currentUser?.team?.captainId === currentUser?.id;
                  const isViceCaptain = currentUser?.team?.viceCaptainIds?.includes(currentUser?.id);
                  const isProposerTeam = msg.senderId === currentUser?.id; // Don't show to sender

                  if ((isCaptain || isViceCaptain) && !isProposerTeam) {
                    return (
                      <button
                        onClick={() => handleAcceptRematch(msg.metadata.matchAnnouncementId)}
                        className="mt-3 bg-turf-600 hover:bg-turf-700 text-white font-bold py-2 px-5 rounded-full text-xs transition-colors flex items-center gap-2 mx-auto"
                      >
                        <Swords className="w-4 h-4" />
                        <span>Teklifi Onayla</span>
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          ) : (
            <div key={msg.id} className={`flex items-end gap-2 ${msg.isMe ? 'justify-end' : 'justify-start'} ${isPrevSameSender ? '!mt-0.5' : ''}`}>
              {!msg.isMe && (
                <div style={{ width: 28, flexShrink: 0 }}>
                  {!isNextSameSender ? (
                    <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden">
                      {msg.senderName.charAt(0)}
                    </div>
                  ) : null}
                </div>
              )}

              <div className={`max-w-[75%]`}>
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm relative ${msg.isMe
                  ? `bg-turf-600 text-white ${!isNextSameSender ? 'rounded-br-sm' : ''}`
                  : `bg-slate-800 text-slate-200 border border-slate-700 ${!isNextSameSender ? 'rounded-bl-sm' : ''}`
                  }`}>
                  {!msg.isMe && !isPrevSameSender && (
                    <span className="text-[11px] font-semibold text-turf-400 block mb-0.5">{msg.senderName}</span>
                  )}
                  {msg.text}
                </div>
                {!isNextSameTime && !isNextSameSender && (
                  <span className={`text-[10px] block mt-1 ${msg.isMe ? 'text-right text-slate-500' : 'text-left text-slate-500'}`}>
                    {msg.timestamp}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* AI Coach Advice Bubble */}
        {showTactic && (
          <div className="flex justify-center my-6 animate-fade-in-up">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/30 p-5 rounded-2xl max-w-[90%] shadow-2xl shadow-purple-900/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
              <div className="flex items-center gap-2 mb-3 text-purple-400 font-sport font-bold text-lg uppercase tracking-wide">
                <Bot className="w-5 h-5" /> Koç'un Tavsiyesi
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed font-medium">
                {tactic}
              </p>
              <div className="mt-3 flex justify-end">
                <button className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-1 rounded hover:bg-purple-500/20 transition-colors">
                  Teşekkür Et
                </button>
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />

        {/* Floating Scroll to Bottom Button */}
        {showScrollButton && (
          <button
            onClick={() => {
              isUserAtBottomRef.current = true; // Force flag update
              scrollToBottom();
            }}
            className="fixed bottom-24 right-4 bg-slate-800 text-turf-500 p-3 rounded-full shadow-xl border border-slate-700 animate-bounce cursor-pointer z-50 hover:bg-slate-700 transition-colors"
          >
            <ArrowDown className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Input Area */}
      {(() => {
        const activeStatusInfo = getMatchStatusInfo(activeChannel?.reservation);
        const isMatchFinished = activeStatusInfo?.type === 'played' || activeStatusInfo?.type === 'unplayed';

        return (
          <div className="p-3 bg-slate-900 border-t border-slate-800 pb-safe-bottom">
            {isMatchFinished ? (
              <div className="flex flex-col items-center py-3 gap-3">
                <div className="flex items-center text-slate-500 text-sm font-medium">
                  <Shield className="w-4 h-4 mr-2" />
                  Bu sohbette artık mesaj gönderilemez.
                </div>
                {/* Rövanş / Yeni Maç butonu: sadece kaptan ve yardımcılara */}
                {(() => {
                  const isCaptain = currentUser?.team?.captainId === currentUser?.id;
                  const isViceCaptain = currentUser?.team?.viceCaptainIds?.includes(currentUser?.id);
                  const isKendiAramizda = activeChannel?.name?.includes('(Kendi Aramızda)');
                  if (isCaptain || isViceCaptain) {
                    if (isKendiAramizda) {
                      // Kendi Aramızda: doğrudan yeni maç oluştur (teklif yok)
                      return (
                        <button
                          onClick={() => setIsKendiAramizdaNewMatchOpen(true)}
                          className="bg-turf-600 hover:bg-turf-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-turf-600/20 hover:scale-[1.02] active:scale-95"
                        >
                          <Swords className="w-4 h-4" />
                          Yeni Maç Ayarla
                        </button>
                      );
                    } else {
                      // Normal maç: rövanş teklifi gönder
                      return (
                        <button
                          onClick={() => setIsRematchModalOpen(true)}
                          className="bg-turf-600 hover:bg-turf-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-turf-600/20 hover:scale-[1.02] active:scale-95"
                        >
                          <Swords className="w-4 h-4" />
                          {activeStatusInfo?.type === 'played' ? 'Rövanş İste' : 'Yeni Maç Ayarla'}
                        </button>
                      );
                    }
                  }
                  return null;
                })()}
              </div>
            ) : (
              <div className="flex gap-2 items-end">
                <div className="flex-1 bg-slate-800 rounded-xl flex items-center border border-slate-700 focus-within:border-turf-500 transition-colors">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Mesaj yaz..."
                    className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleSend}
                  className={`p-3 rounded-xl transition-all ${input.trim() ? 'bg-turf-600 text-white shadow-lg shadow-turf-600/20 scale-100' : 'bg-slate-800 text-slate-500 scale-95'}`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Chat Options Modal */}
      {isChatMenuOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-800 w-full max-w-sm rounded-3xl border border-slate-700 shadow-2xl overflow-hidden animate-scale-in flex flex-col relative">
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-slate-700/50 bg-slate-800/80">
              <h3 className="text-white font-bold text-xl">Seçenekler</h3>
              <button
                onClick={() => setIsChatMenuOpen(false)}
                className="bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full p-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action List */}
            <div className="flex flex-col p-3 gap-2">
              <a
                href={`tel:${activeChannel?.reservation?.pitch?.business?.phone || activeChannel?.pitch?.business?.phone || '05555555555'}`}
                className="w-full text-left p-4 rounded-2xl text-md font-bold text-white hover:bg-slate-700 flex items-center justify-between transition-colors shadow-sm"
                onClick={() => setIsChatMenuOpen(false)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-turf-500/10 flex items-center justify-center text-turf-500 border border-turf-500/20">
                    <Phone className="w-6 h-6" />
                  </div>
                  <span>Sahayı Ara</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </a>

              {(() => {
                const isCaptain = currentUser?.team?.captainId === currentUser?.id;
                const isViceCaptain = currentUser?.team?.viceCaptainIds?.includes(currentUser?.id);
                if (!isCaptain && !isViceCaptain) return null;

                const statusInfo = getMatchStatusInfo(activeChannel?.reservation);
                if (statusInfo?.type === 'pending') {
                  return (
                    <button
                      onClick={() => {
                        setIsChatMenuOpen(false);
                        handleCancelMatch(activeChannel.reservation.id);
                      }}
                      className="w-full text-left p-4 rounded-2xl text-md font-bold text-red-500 hover:bg-red-500/10 flex items-center justify-between transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                          <Trash2 className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col">
                          <span>Maçı İptal Et</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 opacity-50" />
                    </button>
                  );
                } else if (statusInfo?.type === 'confirmed') {
                  const isCancelRequested = activeChannel?.reservation?.cancelRequested;
                  return (
                    <button
                      onClick={() => {
                        if (isCancelRequested) return;
                        setIsChatMenuOpen(false);
                        handleCancelRequest(activeChannel.reservation.id);
                      }}
                      disabled={isCancelRequested}
                      className={`w-full text-left p-4 rounded-2xl text-md font-bold flex items-center justify-between transition-colors shadow-sm ${isCancelRequested ? 'text-slate-500 cursor-not-allowed bg-slate-800/50' : 'text-orange-500 hover:bg-orange-500/10'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${isCancelRequested ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-500'}`}>
                          {isCancelRequested ? <XCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                        </div>
                        <div className="flex flex-col">
                          <span>{isCancelRequested ? 'İptal İsteği Gönderildi' : 'İptal Etme İsteği Gönder'}</span>
                          {!isCancelRequested && <span className="text-xs font-normal text-orange-500/70 mt-0.5">İşletme onayı gerektirir</span>}
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 ${isCancelRequested ? 'opacity-0' : 'opacity-50'}`} />
                    </button>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Generic Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => {
          setConfirmModalOpen(false);
          if (confirmAction) confirmAction();
        }}
        title={confirmTitle}
        message={confirmMessage}
        confirmText={confirmButtonText}
        cancelText="İptal"
        isDangerous={confirmIsDangerous}
      />

      {/* Success/Error Modal */}
      <SuccessModal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        message={successModalMessage}
        type="CHALLENGE_ACCEPTED"
      />
    </div>
  );
};

// Extracted Component to handle hooks per item
interface ChannelItemProps {
  channel: any;
  onClick: () => void;
  onLongPress: () => void;
}

const ChannelItem: React.FC<ChannelItemProps> = ({ channel, onClick, onLongPress }) => {
  const [startLongPress, setStartLongPress] = useState(false);
  const [isLongPressTriggered, setIsLongPressTriggered] = useState(false);
  const timerRef = useRef<any>();

  useEffect(() => {
    if (startLongPress) {
      timerRef.current = setTimeout(() => {
        onLongPress();
        setIsLongPressTriggered(true);
      }, 500);
    } else {
      clearTimeout(timerRef.current);
    }

    return () => clearTimeout(timerRef.current);
  }, [startLongPress, onLongPress]);

  const handleMouseDown = () => {
    setStartLongPress(true);
    setIsLongPressTriggered(false);
  };

  const handleMouseUp = () => {
    setStartLongPress(false);
  };

  const handleMouseLeave = () => {
    setStartLongPress(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressTriggered) {
      // Prevent click if long press triggered
      e.stopPropagation();
      return;
    }
    onClick();
  };

  const statusInfo = getMatchStatusInfo(channel.reservation);
  const borderClass = statusInfo ? statusInfo.borderColor : 'border-slate-700';
  const bgClass = statusInfo ? statusInfo.bgTint : '';

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      onClick={handleClick}
      className={`bg-slate-800 ${bgClass} p-4 rounded-2xl border border-slate-700/50 flex gap-4 items-center hover:bg-slate-750 active:scale-95 transition-all cursor-pointer select-none`}
    >
      <div className="relative">
        <img src={channel.avatarUrl || 'https://picsum.photos/200'} alt={channel.name} className={`w-14 h-14 object-cover ${channel.type === 'MATCH_GROUP' ? 'rounded-2xl' : 'rounded-full'}`} />
        {channel.type === 'MATCH_GROUP' && (
          <div className="absolute -bottom-1 -right-1 bg-turf-600 p-1 rounded-lg border border-slate-800">
            <Users className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h4 className="text-white font-bold truncate pr-2 flex items-center">{channel.name}<MatchStatusBadge reservation={channel.reservation} /></h4>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-[10px] whitespace-nowrap ${channel.unreadCount > 0 ? 'text-blue-500 font-bold' : 'text-slate-500'}`}>
              {formatMessageDate(channel.lastActivityAt)}
            </span>
            {channel.unreadCount > 0 && (
              <div className="bg-blue-500 text-white text-[10px] font-bold min-w-[1.25rem] h-5 px-1.5 rounded-full flex items-center justify-center">
                {channel.unreadCount}
              </div>
            )}
          </div>
        </div>
        <p className="text-sm truncate mt-0.5 text-slate-400">
          {channel.type === 'MATCH_GROUP' && <span className="text-turf-500 font-bold mr-1">Takım:</span>}
          {startLongPress ? 'Seçenekler...' : (
            channel.lastMessage?.content ? stripSystemMessageMarkers(channel.lastMessage.content) : 'Sohbete girmek için tıkla'
          )}
        </p>
        {statusInfo && (
          <span className={`text-[10px] font-semibold mt-1 inline-block ${statusInfo.textColor}`}>
            {statusInfo.label}
          </span>
        )}
      </div>
    </div>
  );
};