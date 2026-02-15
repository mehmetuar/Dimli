

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, ChevronLeft, Users, Shield, Star, Phone, MessageSquare, UserPlus } from 'lucide-react';
import { getTacticalAdvice } from '../services/geminiService';
import { SkillLevel, ChatChannel, Team } from '../types';
import { MOCK_CHANNELS, MOCK_MESSAGES, MOCK_TEAMS, CURRENT_USER, MOCK_JOKERS } from '../constants';
import { useLocation } from 'react-router-dom';
import { InviteJokerModal } from '../components/InviteJokerModal';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

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
  if (diff < 7 * oneDay) {
    return date.toLocaleDateString('tr-TR', { weekday: 'long' });
  }

  // Older
  return date.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

export const Chat: React.FC = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [showTactic, setShowTactic] = useState(false);
  const [tactic, setTactic] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);

  // Chat Options Modal State
  const [optionsModalChannel, setOptionsModalChannel] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
  }, []);

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
  }, [selectedChannelId, currentUser]);

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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, tactic, selectedChannelId]);

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
        {optionsModalChannel && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 w-full max-w-sm rounded-3xl border border-slate-700 p-6 relative">
              <button
                onClick={() => setOptionsModalChannel(null)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white"
              >
                <ChevronLeft className="w-6 h-6 rotate-180" /> {/* Or X icon */}
              </button>

              <h3 className="text-xl font-bold text-white mb-2 text-center">{optionsModalChannel.name}</h3>
              <p className="text-slate-400 text-sm text-center mb-6">Bu sohbet için ne yapmak istersin?</p>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    // setSelectedChannelId(optionsModalChannel.id); // No "Go to chat" button needed inside options if normal click works
                    // But maybe keep it? The user asked for "options".
                    // Request: "Sohbete tıkladığım zaman direk gir. Eğer basılı tutarsam sohbeti sil modalını aç"
                    // So the modal is predominantly for deleting.
                    setOptionsModalChannel(null); // Close modal
                  }}
                  className="w-full bg-slate-700 text-white font-bold py-3 rounded-xl hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                >
                  Vazgeç
                </button>

                <button
                  onClick={handleDeleteChannel}
                  disabled={isDeleting}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-900/50 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {isDeleting ? 'Siliniyor...' : (
                    <><Shield className="w-5 h-5" /> Sohbeti Sil (Temizle)</>
                  )}
                </button>
              </div>

              <p className="text-[10px] text-slate-600 text-center mt-4">
                Not: Maç saati geçmeyen sohbetler silinemez.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- ACTION HANDLERS ---
  const handleAcceptProposal = async (reservationId: string) => {
    if (!window.confirm('Bu saat önerisini kabul etmek istediğinize emin misiniz?')) return;

    try {
      await api.post(`/reservations/${reservationId}/accept-proposal`, { userId: currentUser?.id });
      alert('Teklif kabul edildi! Maç saati güncellendi.');
      // Polling will update the messages
    } catch (error: any) {
      console.error('Failed to accept proposal:', error);
      alert(error.response?.data?.message || 'İşlem başarısız.');
    }
  };

  // --- COMPONENT: ACTIVE CHAT VIEW ---
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-pitch-surface">
      <InviteJokerModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        joker={opponentJoker}
      />

      {/* Custom Header */}
      <div className="bg-slate-900/90 backdrop-blur pt-safe-top top-safe-top p-4 border-b border-slate-800 flex flex-col gap-3 sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedChannelId(null)}
            className="p-2 -ml-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <img src={activeChannel?.avatarUrl || 'https://picsum.photos/200'} className="w-10 h-10 rounded-full bg-slate-800 object-cover" />
          <div className="flex-1">
            <h2 className="text-white font-bold leading-tight">{activeChannel?.name}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {activeChannel?.type === 'MATCH_GROUP' ? (
                <span className="flex items-center gap-1 text-turf-500"><Users className="w-3 h-3" /> {activeChannel.participants?.length || 14} Oyuncu Aktif</span>
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

            {/* <button
              onClick={handleGetTactics}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-purple-500/20"
            >
              <Bot className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">Koç'a Sor</span>
            </button> */}

            <a
              href="tel:05555555555"
              className="bg-turf-600 hover:bg-turf-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-turf-600/20 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">Sahayı Ara</span>
            </a>
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
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-pitch">
        {/* System Welcome Message */}
        <div className="flex justify-center">
          <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide mt-6">
            {activeChannel?.type === 'MATCH_GROUP' ? 'Maç Grubu Oluşturuldu' : 'Sohbet Başlatıldı'}
          </span>
        </div>

        {messages.map((msg) => (
          msg.isSystem ? (
            <div key={msg.id} className="flex justify-center my-4 animate-fade-in px-4">
              <div className="bg-slate-800/90 border border-slate-700 text-slate-300 text-xs px-4 py-3 rounded-2xl text-center max-w-[90%] shadow-lg whitespace-pre-wrap">
                {msg.text}

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
              </div>
            </div>
          ) : (
            <div key={msg.id} className={`flex gap-3 ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
              {!msg.isMe && (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                    {msg.senderName.charAt(0)}
                  </div>
                </div>
              )}

              <div className={`max-w-[75%] space-y-1`}>
                {!msg.isMe && activeChannel?.type === 'MATCH_GROUP' && (
                  <span className="text-[10px] text-slate-400 ml-1 block">{msg.senderName}</span>
                )}
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm relative ${msg.isMe
                  ? 'bg-turf-600 text-white rounded-tr-none'
                  : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                  }`}>
                  {msg.text}
                  {/* Message Tail */}
                  <div className={`absolute top-0 w-3 h-3 ${msg.isMe ? '-right-1.5 bg-turf-600 [clip-path:polygon(0_0,100%_0,0_100%)]' : '-left-1.5 bg-slate-800 [clip-path:polygon(0_0,100%_0,100%_100%)] border-t border-l border-slate-700'}`}></div>
                </div>
                <span className={`text-[10px] block ${msg.isMe ? 'text-right text-slate-500' : 'text-left text-slate-500'}`}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          )
        ))}

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
      </div>

      {/* Input Area */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 pb-safe-bottom">
        <div className="flex gap-2 items-end">
          {/* Phone button removed */}
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
      </div>
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

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      onClick={handleClick}
      className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex gap-4 items-center hover:bg-slate-750 active:scale-95 transition-all cursor-pointer select-none"
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
          <h4 className="text-white font-bold truncate pr-2">{channel.name}</h4>
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
          {channel.lastMessage?.content || 'Sohbete gitmek için tıkla'}
        </p>
      </div>
    </div>
  );
};