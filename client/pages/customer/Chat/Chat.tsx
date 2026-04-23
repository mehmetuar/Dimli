import React, { useRef, useEffect } from 'react';
import { Send, Bot, ChevronLeft, Users, Shield, Star, Phone, ArrowDown, Swords, MoreVertical, X, ChevronRight, Trash2, XCircle, AlertTriangle, Undo2, UserMinus, UserPlus } from 'lucide-react';
import { useChat } from './hooks/useChat';
import { ChannelItem } from './components/ChannelItem';
import { MatchStatusBadge } from './components/MatchStatusBadge';
import { getMatchStatusInfo, formatMessageDate, teamAvatarFallback, userAvatarFallback } from './utils/chatUtils';
import { SystemMessageRenderer } from '../../../components/UI/SystemMessageRenderer';
import api from '../../../services/api';

import { KendiAramizdaMatchModal } from '../../../components/Modals/KendiAramizdaMatchModal';
import { InviteJokerModal } from '../../../components/Modals/InviteJokerModal';
import { MatchDetailModal } from '../../../components/Modals/MatchDetailModal';
import { RematchProposalModal } from '../../../components/Modals/RematchProposalModal';
import { ConfirmModal } from '../../../components/Modals/ConfirmModal';
import { SuccessModal } from '../../../components/Modals/SuccessModal';
import { KendiAramizdaNewMatchModal } from '../../../components/Modals/KendiAramizdaNewMatchModal';
import { ManageJokersModal } from '../../../components/Modals/ManageJokersModal';
import { JokerDMChatInfoModal } from '../../../components/Modals/JokerDMChatInfoModal';

export const Chat: React.FC = () => {
  const {
    selectedChannelId, setSelectedChannelId,
    channels, activeChannel,
    messages, currentUser,
    input, setInput,
    showTactic, tactic,
    isInviteModalOpen, setIsInviteModalOpen,
    matchDetailData,
    isMatchDetailOpen, setIsMatchDetailOpen,
    isJokerDMInfoOpen, setIsJokerDMInfoOpen,
    isMatchDetailLoading,
    optionsModalChannel, setOptionsModalChannel,
    isDeleting, setIsDeleting,
    isChatMenuOpen, setIsChatMenuOpen,
    isRematchModalOpen, setIsRematchModalOpen,
    isKendiAramizdaNewMatchOpen, setIsKendiAramizdaNewMatchOpen,
    isManageJokersModalOpen, setIsManageJokersModalOpen,
    confirmModalOpen, setConfirmModalOpen,
    confirmAction, confirmTitle, confirmMessage, confirmIsDangerous, confirmButtonText,
    setConfirmAction, setConfirmTitle, setConfirmMessage, setConfirmIsDangerous, setConfirmButtonText,
    successModalOpen, setSuccessModalOpen, successModalMessage, successModalType,
    handleSend, handleGetTactics, handleDeleteChannel, handleOpenMatchDetail,
    handleCancelMatch, handleCancelRequest, handleUndoCancelRequest,
    handleAcceptProposal, handleAcceptRematch, handleInviteJokerToMatch, handleCancelJokerNegotiation
  } = useChat();

  const [showScrollButton, setShowScrollButton] = React.useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isUserAtBottomRef = useRef(true);
  const endRef = useRef<HTMLDivElement>(null);

  const opponentTeam = null; // Simplification as in original
  const opponentJoker = null; // Simplification as in original

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    endRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;
    isUserAtBottomRef.current = isAtBottom;
    setShowScrollButton(!isAtBottom);
  };

  useEffect(() => {
    if (isUserAtBottomRef.current) {
      scrollToBottom();
    }
  }, [messages, tactic]);

  useEffect(() => {
    setIsChatMenuOpen(false);
    isUserAtBottomRef.current = true;
    setShowScrollButton(false);
    setTimeout(() => scrollToBottom('instant'), 100);
  }, [selectedChannelId]);


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
            channels.map(channel => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                onClick={() => setSelectedChannelId(channel.id)}
                onLongPress={() => setOptionsModalChannel(channel)}
              />
            ))
          )}
        </div>

        {/* CHAT OPTIONS MODAL */}
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
                    onClick={() => setOptionsModalChannel(null)}
                    className="w-full bg-slate-700 text-white font-bold py-3 rounded-xl hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                  >
                    Vazgeç
                  </button>

                  {canDelete && (
                    <button
                      onClick={() => handleDeleteChannel(optionsModalChannel.id)}
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

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-pitch-surface">
      <InviteJokerModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        joker={opponentJoker as any}
      />

      <RematchProposalModal
        isOpen={isRematchModalOpen}
        onClose={() => setIsRematchModalOpen(false)}
        channelId={selectedChannelId || ''}
        matchType={getMatchStatusInfo(activeChannel?.reservation)?.type === 'played' ? 'played' : 'unplayed'}
        previousPitchId={activeChannel?.pitch?.id}
        previousPlayerCount={activeChannel?.match?.playerCount}
      />

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

      <JokerDMChatInfoModal
        isOpen={isJokerDMInfoOpen}
        onClose={() => setIsJokerDMInfoOpen(false)}
        channel={activeChannel}
        matchData={matchDetailData}
        currentUser={currentUser}
      />

      {/* Spacer */}
      <div className="bg-slate-900 w-full flex-shrink-0 pt-safe-top" />

      {/* HEADER */}
      <div className="bg-slate-900/90 backdrop-blur p-4 border-b border-slate-800 flex flex-col gap-3 sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedChannelId(null)}
            className="p-2 -ml-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {(() => {
            const ad = activeChannel?.avatarData;
            if (
              activeChannel?.type === 'MATCH_GROUP' &&
              ad?.matchType !== 'kendi_aramizda' &&
              ad?.awayTeamLogo != null
            ) {
              return (
                <div
                  className="relative w-10 h-10 bg-slate-900 rounded-xl border border-slate-700 flex-shrink-0 cursor-pointer active:scale-90 transition-transform overflow-visible"
                  onClick={handleOpenMatchDetail}
                >
                  <img src={ad.homeTeamLogo || teamAvatarFallback(ad.homeTeamName || '')} className="w-[22px] h-[22px] rounded-md object-cover absolute top-0.5 left-0.5 z-10" />
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <span className="text-[6px] font-black text-orange-500 bg-slate-950/90 px-0.5 rounded leading-none">VS</span>
                  </div>
                  <img src={ad.awayTeamLogo || teamAvatarFallback(ad.awayTeamName || '')} className="w-[22px] h-[22px] rounded-md object-cover absolute bottom-0.5 right-0.5 z-10 border border-slate-900" />
                </div>
              );
            }
            if (activeChannel?.type === 'MATCH_GROUP') {
              return (
                <img
                  src={ad?.homeTeamLogo || teamAvatarFallback(ad?.homeTeamName || activeChannel?.name || '')}
                  className="w-10 h-10 rounded-xl bg-slate-800 object-cover cursor-pointer active:scale-90 transition-transform"
                  onClick={handleOpenMatchDetail}
                />
              );
            }
            if (activeChannel?.type === 'JOKER_NEGOTIATION') {
              return (
                <img
                  src={ad?.otherUserAvatar || userAvatarFallback(ad?.otherUserName || activeChannel?.name || '')}
                  className="w-10 h-10 rounded-full bg-slate-800 object-cover cursor-pointer active:scale-90 transition-transform"
                  onClick={handleOpenMatchDetail}
                />
              );
            }
            return (
              <img
                src={activeChannel?.avatarUrl || 'https://picsum.photos/200'}
                className="w-10 h-10 rounded-full bg-slate-800 object-cover cursor-pointer active:scale-90 transition-transform"
                onClick={handleOpenMatchDetail}
              />
            );
          })()}
          <div className="flex-1 min-w-0" onClick={handleOpenMatchDetail} style={{ cursor: activeChannel?.relatedMatchId ? 'pointer' : 'default' }}>
            <h2 className="text-white font-bold leading-tight text-sm sm:text-base md:text-lg truncate">{activeChannel?.name}</h2>
            <div className="flex flex-col text-[10px] sm:text-xs text-slate-400 mt-0.5">
              {activeChannel?.type === 'MATCH_GROUP' ? (
                <>
                  <span className="flex items-center gap-1 text-turf-500 font-medium">
                    <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    {activeChannel.participants?.length || 14} Oyuncu Aktif
                  </span>
                  {(() => {
                    const info = getMatchStatusInfo(activeChannel?.reservation);
                    if (info) return <span className={`font-semibold ${info.textColor} leading-none mt-0.5`}>{info.label}</span>;
                    return null;
                  })()}
                </>
              ) : activeChannel?.type === 'JOKER_NEGOTIATION' ? (
                <span className="flex items-center gap-1 text-yellow-500 font-medium mt-0.5">
                  <Star className="w-2.5 h-2.5 fill-yellow-500" />
                  Müzakere Odası
                </span>
              ) : (
                <span className="flex items-center gap-1 text-green-500 font-medium mt-0.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  Çevrimiçi
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <MatchStatusBadge reservation={activeChannel?.reservation} size="md" />

            {opponentJoker && (
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="bg-gradient-to-r from-turf-600 to-green-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-turf-500/20 animate-pulse-slow"
              >
                <UserPlus className="w-4 h-4" />
                <span className="text-xs font-bold hidden sm:inline">Maça Davet Et</span>
              </button>
            )}

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsChatMenuOpen(true);
                }}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                title="Seçenekler"
              >
                <MoreVertical className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

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
          </div>
        )}
      </div>

      {/* MESSAGES */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-6 bg-pitch relative"
      >
        <div className="flex justify-center">
          <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide mt-6">
            {activeChannel?.type === 'MATCH_GROUP' ? 'Maç Grubu Oluşturuldu' : 'Sohbet Başlatıldı'}
          </span>
        </div>

        {messages.map((msg, index) => {
          const isNextSameTime = messages[index + 1]?.timestamp === msg.timestamp;
          const prevMsg = messages[index - 1];
          const nextMsg = messages[index + 1];
          const isPrevSameSender = prevMsg && !prevMsg.isSystem && !msg.isSystem && prevMsg.senderId === msg.senderId;
          const isNextSameSender = nextMsg && !nextMsg.isSystem && !msg.isSystem && nextMsg.senderId === msg.senderId;

          return msg.isSystem ? (
            <div key={msg.id} className="flex justify-center my-4 animate-fade-in px-4 w-full">
              <div className="bg-slate-800/95 border border-slate-700 text-slate-200 text-sm font-medium px-6 py-4 rounded-xl text-center w-full shadow-lg whitespace-pre-wrap">
                <SystemMessageRenderer text={msg.text} />

                {msg.metadata?.type === 'PROPOSAL_ACTION' && (
                  <button
                    onClick={() => handleAcceptProposal(msg.metadata.reservationId)}
                    className="mt-3 bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-4 rounded-full text-xs transition-colors flex items-center gap-1 mx-auto"
                  >
                    <span>✅</span>
                    <span>Teklifi Kabul Et</span>
                  </button>
                )}

                {msg.metadata?.type === 'REMATCH_PROPOSAL' && msg.metadata?.matchAnnouncementId && (() => {
                  const isCaptain = currentUser?.team?.captainId === currentUser?.id;
                  const isViceCaptain = currentUser?.team?.viceCaptainIds?.includes(currentUser?.id);
                  const isProposerTeam = msg.senderId === currentUser?.id;

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
            </div>
          </div>
        )}
        <div ref={endRef} />

        {showScrollButton && (
          <button
            onClick={() => {
              isUserAtBottomRef.current = true;
              scrollToBottom();
            }}
            className="fixed bottom-24 right-4 bg-slate-800 text-turf-500 p-3 rounded-full shadow-xl border border-slate-700 animate-bounce cursor-pointer z-50 hover:bg-slate-700 transition-colors"
          >
            <ArrowDown className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* INPUT */}
      {(() => {
        const activeStatusInfo = getMatchStatusInfo(activeChannel?.reservation);
        const isMatchFinished = activeStatusInfo?.type === 'played' || activeStatusInfo?.type === 'unplayed';
        const isJokerNegotiation = activeChannel?.type === 'JOKER_NEGOTIATION';
        const startMsg = messages.find(m => m.metadata?.type === 'JOKER_NEGOTIATION_STARTED');
        const isInviter = startMsg?.metadata?.jokerId && startMsg?.metadata?.jokerId !== currentUser?.id;
        const isJokerAddedToMatch = messages.some(m => m.metadata?.type === 'JOKER_ADDED_TO_MATCH');

        return (
          <div className="flex flex-col bg-slate-900 border-t border-slate-800 pb-safe-bottom">
            {isJokerNegotiation && !isMatchFinished && !isJokerAddedToMatch && (
              <div className="p-3 bg-slate-800/50 flex gap-2 justify-center shadow-inner">
                {isInviter && (
                  <button
                    onClick={handleInviteJokerToMatch}
                    className="bg-turf-600 font-bold text-white text-xs py-2.5 px-4 rounded-xl flex-1 flex justify-center items-center gap-2 hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20"
                  >
                    <UserPlus className="w-4 h-4" /> Maça Dahil Et
                  </button>
                )}
                <button
                  onClick={handleCancelJokerNegotiation}
                  className="bg-slate-700 font-bold text-slate-300 text-xs py-2.5 px-4 rounded-xl flex-1 flex justify-center items-center gap-2 hover:bg-red-900/50 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" /> Anlaşmayı İptal Et
                </button>
              </div>
            )}
            <div className="p-3">
              {isMatchFinished ? (
                <div className="flex flex-col items-center py-3 gap-3">
                  <div className="flex items-center text-slate-500 text-sm font-medium">
                    <Shield className="w-4 h-4 mr-2" /> Bu sohbette artık mesaj gönderilemez.
                  </div>
                  {(() => {
                    const isCaptain = currentUser?.team?.captainId === currentUser?.id;
                    const isViceCaptain = currentUser?.team?.viceCaptainIds?.includes(currentUser?.id);
                    const isKendiAramizda = activeChannel?.name?.includes('(Kendi Aramızda)');

                    if ((isCaptain || isViceCaptain) && !isJokerNegotiation) {
                      if (isKendiAramizda) {
                        return (
                          <button
                            onClick={() => setIsKendiAramizdaNewMatchOpen(true)}
                            className="bg-turf-600 hover:bg-turf-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-turf-600/20 hover:scale-[1.02] active:scale-95"
                          >
                            <Swords className="w-4 h-4" /> Yeni Maç Ayarla
                          </button>
                        );
                      } else {
                        return (
                          <button
                            onClick={() => setIsRematchModalOpen(true)}
                            className="bg-turf-600 hover:bg-turf-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-turf-600/20 hover:scale-[1.02] active:scale-95"
                          >
                            <Swords className="w-4 h-4" /> {activeStatusInfo?.type === 'played' ? 'Rövanş İste' : 'Yeni Maç Ayarla'}
                          </button>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>
              ) : isJokerNegotiation && isJokerAddedToMatch ? (
                <div className="p-4 flex items-center justify-center gap-2 text-slate-500 text-sm font-medium">
                  <Shield className="w-4 h-4" /> Joker maça dahil edildi. Sohbet kapatıldı.
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
          </div>
        );
      })()}

      {/* CHAT OPTIONS MODAL IN ACTIVE CHAT */}
      {isChatMenuOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-800 w-full max-w-sm rounded-3xl border border-slate-700 shadow-2xl overflow-hidden animate-scale-in flex flex-col relative">
            <div className="flex justify-between items-center p-5 border-b border-slate-700/50 bg-slate-800/80">
              <h3 className="text-white font-bold text-xl">Seçenekler</h3>
              <button
                onClick={() => setIsChatMenuOpen(false)}
                className="bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full p-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
                const statusInfo = getMatchStatusInfo(activeChannel?.reservation);
                const isMatchFinished = statusInfo?.type === 'played' || statusInfo?.type === 'unplayed';
                const isCaptain = currentUser?.team?.captainId === currentUser?.id;
                const isViceCaptain = currentUser?.team?.viceCaptainIds?.includes(currentUser?.id);
                const isJokerInMatch = activeChannel?.isJoker;
                const isCaptainOfPlayingTeam = (isCaptain || isViceCaptain) &&
                  activeChannel?.reservation &&
                  (currentUser?.team?.id === activeChannel.reservation.teamId || currentUser?.team?.id === activeChannel.reservation.opponentTeamId);
                const isJokerNegotiation = activeChannel?.type === 'JOKER_NEGOTIATION';
                const isJokerAddedToMatch = messages.some(m => m.metadata?.type === 'JOKER_ADDED_TO_MATCH');
                const isJokerNegotiationBlocked = isJokerNegotiation && isJokerAddedToMatch;

                return (
                  <>
                    {/* LEAVE MATCH FOR JOKER */}
                    {isJokerInMatch && !isMatchFinished && (
                      <button
                        onClick={() => {
                          setIsChatMenuOpen(false);
                          setConfirmTitle('Maçtan Ayrıl');
                          setConfirmMessage('Joker olarak katıldığınız bu maçtan ayrılmak istediğinize emin misiniz? Sohbetten çıkarılacaksınız.');
                          setConfirmIsDangerous(true);
                          setConfirmButtonText('Ayrıl');
                          setConfirmAction(() => async () => {
                            try {
                              await api.delete(`/chat/channels/${activeChannel.id}/jokers/${currentUser.id}`);
                              window.location.reload();
                            } catch (err: any) {
                              alert(err.response?.data?.message || 'Çıkış başarısız.');
                            }
                          });
                          setConfirmModalOpen(true);
                        }}
                        className="w-full text-left p-4 rounded-2xl text-md font-bold text-red-500 hover:bg-red-500/10 flex items-center justify-between transition-colors shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                            <UserMinus className="w-6 h-6" />
                          </div>
                          <span>Maçtan Ayrıl</span>
                        </div>
                        <ChevronRight className="w-5 h-5 opacity-50" />
                      </button>
                    )}

                    {/* JOKER MANAGEMENT FOR CAPTAIN/VICE OF PLAYING TEAMS */}
                    {isCaptainOfPlayingTeam && activeChannel?.type === 'MATCH_GROUP' && !isMatchFinished && (
                      <button
                        onClick={() => {
                          setIsChatMenuOpen(false);
                          setIsManageJokersModalOpen(true);
                        }}
                        className="w-full text-left p-4 rounded-2xl text-md font-bold text-white hover:bg-slate-700 flex items-center justify-between transition-colors shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                            <Shield className="w-6 h-6" />
                          </div>
                          <div className="flex flex-col">
                            <span>Jokerleri Yönet</span>
                            <span className="text-xs font-normal text-purple-400/70 mt-0.5">Maç kadrosunu düzenle</span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 opacity-50" />
                      </button>
                    )}

                    {/* MATCH REFUSAL / CANCELLATION */}
                    {(isCaptain || isViceCaptain) && statusInfo?.type === 'pending' && !isJokerNegotiation && !isJokerInMatch && (
                      <button
                        onClick={() => {
                          if (isJokerNegotiationBlocked) return;
                          setIsChatMenuOpen(false);
                          handleCancelMatch(activeChannel.reservation.id);
                        }}
                        disabled={isJokerNegotiationBlocked}
                        className={`w-full text-left p-4 rounded-2xl text-md font-bold flex items-center justify-between transition-colors shadow-sm ${isJokerNegotiationBlocked
                          ? 'text-slate-500 bg-slate-800/30 cursor-not-allowed opacity-50'
                          : 'text-red-500 hover:bg-red-500/10'
                          }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${isJokerNegotiationBlocked ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                            <Trash2 className="w-6 h-6" />
                          </div>
                          <div className="flex flex-col">
                            <span>Maçı İptal Et</span>
                            {isJokerNegotiationBlocked && <span className="text-[10px] font-normal text-slate-500 mt-1">Sohbet kapalı</span>}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 opacity-50" />
                      </button>
                    )}

                    {(isCaptain || isViceCaptain) && statusInfo?.type === 'confirmed' && !isJokerNegotiation && !isJokerInMatch && (() => {
                      const isCancelRequested = activeChannel?.reservation?.cancelRequested;
                      const isDisabled = isJokerNegotiationBlocked;

                      return (
                        <button
                          onClick={() => {
                            if (isDisabled) return;
                            setIsChatMenuOpen(false);
                            if (isCancelRequested) {
                              handleUndoCancelRequest(activeChannel.reservation.id);
                            } else {
                              handleCancelRequest(activeChannel.reservation.id);
                            }
                          }}
                          disabled={isDisabled}
                          className={`w-full text-left p-4 rounded-2xl text-md font-bold flex items-center justify-between transition-colors shadow-sm ${isDisabled ? 'text-slate-500 bg-slate-800/30 cursor-not-allowed opacity-50' : isCancelRequested ? 'text-blue-500 hover:bg-blue-500/10' : 'text-orange-500 hover:bg-orange-500/10'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${isDisabled ? 'bg-slate-800 border-slate-700 text-slate-500' : isCancelRequested ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-orange-500/10 border-orange-500/20 text-orange-500'}`}>
                              {isCancelRequested ? <Undo2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                            </div>
                            <div className="flex flex-col">
                              <span>{isCancelRequested ? 'İptal İsteğini Geri Al' : 'İptal Etme İsteği Gönder'}</span>
                              {!isCancelRequested && !isDisabled && <span className="text-xs font-normal text-orange-500/70 mt-0.5">İşletme onayı gerektirir</span>}
                              {isDisabled && <span className="text-[10px] font-normal text-slate-500 mt-1">Sohbet kapalı</span>}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 opacity-50" />
                        </button>
                      );
                    })()}

                    {/* Delete Chat Button for Played/Unplayed matches */}
                    {(statusInfo?.type === 'played' || statusInfo?.type === 'unplayed') && !isJokerInMatch && (
                      <button
                        onClick={() => {
                          if (!activeChannel) return;
                          setIsChatMenuOpen(false);
                          setConfirmTitle('Sohbeti Sil');
                          setConfirmMessage('Bu sohbeti silmek istediğinize emin misiniz? Bu işlem geri alınamaz.');
                          setConfirmIsDangerous(true);
                          setConfirmButtonText('Sil');
                          setConfirmAction(() => () => handleDeleteChannel(activeChannel.id));
                          setConfirmModalOpen(true);
                        }}
                        disabled={isDeleting}
                        className="w-full text-left p-4 rounded-2xl text-md font-bold text-slate-400 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-between transition-colors shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                            <Trash2 className="w-6 h-6" />
                          </div>
                          <div className="flex flex-col">
                            <span>{isDeleting ? 'Siliniyor...' : 'Sohbeti Sil'}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 opacity-50" />
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
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
        cancelText="Vazgeç"
        isDangerous={confirmIsDangerous}
      />

      <SuccessModal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        message={successModalMessage}
        type={successModalType}
      />

      <ManageJokersModal
        isOpen={isManageJokersModalOpen}
        onClose={() => setIsManageJokersModalOpen(false)}
        channelId={activeChannel?.id}
      />
    </div>
  );
};