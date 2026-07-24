import React, { useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { Send, ChevronLeft, Users, Shield, Star, Phone, ArrowDown, Swords, MoreVertical, X, ChevronRight, Trash2, XCircle, AlertTriangle, Undo2, UserMinus, UserPlus, RefreshCw, CheckCircle, MessageCircle, Repeat } from 'lucide-react';
import { useChat } from './hooks/useChat';
import { useMessageActions } from './hooks/useMessageActions';
import { OfflineEmptyState } from '../../../components/OfflineEmptyState';
import { ChannelItem } from './components/ChannelItem';
import { MatchStatusBadge } from './components/MatchStatusBadge';
import { MessageBubble } from './components/MessageBubble';
import { MessageContextMenu } from './components/MessageContextMenu';
import { ReadInfoModal } from './components/ReadInfoModal';
import { MessageActionModal } from './components/MessageActionModal';
import { ReportNoteModal } from './components/ReportNoteModal';
import { getMatchStatusInfo, formatMessageDate, teamAvatarFallback, userAvatarFallback } from './utils/chatUtils';
import { resolveTeamChatColors } from '../../../utils/colorUtils';
import { SystemMessageRenderer } from '../../../components/UI/SystemMessageRenderer';
import api from '../../../services/api';

import { KendiAramizdaMatchModal } from './components/KendiAramizdaMatchModal';
import { InviteJokerModal } from '../../../components/Modals/InviteJokerModal';
import { MatchDetailModal } from './components/MatchDetailModal';
import { SubscriptionDetailModal } from './components/SubscriptionDetailModal';
import { RematchProposalModal } from './components/RematchProposalModal';
import { ConfirmModal } from '../../../components/Modals/ConfirmModal';
import { SuccessModal } from '../../../components/Modals/SuccessModal';
import { KendiAramizdaNewMatchModal } from './components/KendiAramizdaNewMatchModal';
import { ManageJokersModal } from './components/ManageJokersModal';
import { JokerDMChatInfoModal } from './components/JokerDMChatInfoModal';
import { useKeyboardHeight } from '../../../utils/useKeyboardHeight';
import { useModalBodyClass } from '../../../utils/useModalBodyClass';

export const Chat: React.FC = () => {
  const {
    selectedChannelId, setSelectedChannelId,
    channels, activeChannel,
    messages, currentUser,
    readStates, othersMinLastReadAt, fetchReadStates,
    input, setInput, isSending,
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
    banModalExpiry, setBanModalExpiry,
    subscriptionDetailData, isSubscriptionDetailOpen, setIsSubscriptionDetailOpen, isSubscriptionDetailLoading,
    handleSend, handleDeleteChannel, handleOpenMatchDetail,
    handleCancelMatch, handleCancelRequest, handleUndoCancelRequest,
    handleAcceptProposal, handleAcceptRematch, handleInviteJokerToMatch, handleCancelJokerNegotiation,
    hasMore, loadingMore, loadMoreMessages,
    isLoadingChannels, isLoadingMessages, channelsError,
    fetchChannels,
  } = useChat();

  const {
    selectedMessage, isActionModalOpen, isReportModalOpen, blockAndReportPending,
    actionLoading, toast: actionToast,
    isContextMenuOpen, contextMenuMsg, contextMenuPosition,
    openContextMenu, closeContextMenu, handleCopy, handleContextMenuReport,
    openActionModal, openReportModal, handleBlock, handleBlockAndReport, handleReport,
    filterMessage, closeAll, blockedUserIds,
  } = useMessageActions();

  const keyboardHeight = useKeyboardHeight();
  useModalBodyClass(!!selectedChannelId);
  // "Seçenekler" modalı açıkken de navbar/bildirim zilini gizle + body scroll kilitle
  // (reference-counted → selectedChannelId çağrısıyla çakışmaz).
  useModalBodyClass(!!optionsModalChannel);

  // Pull-to-refresh (sadece kanal listesi görünümünde)
  const listScrollRef = useRef<HTMLDivElement>(null);
  const listTouchStartY = useRef(0);
  const listTouchStartScroll = useRef(0);
  const listRefreshTriggered = useRef(false);
  const [listPullDistance, setListPullDistance] = React.useState(0);
  const [listIsRefreshing, setListIsRefreshing] = React.useState(false);
  const PULL_THRESHOLD = 70;

  const handleListTouchStart = React.useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    listTouchStartY.current = e.touches[0].clientY;
    listTouchStartScroll.current = listScrollRef.current?.scrollTop ?? 0;
    listRefreshTriggered.current = false;
  }, []);

  const handleListTouchMove = React.useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (listIsRefreshing || listTouchStartScroll.current > 4) return;
    const delta = e.touches[0].clientY - listTouchStartY.current;
    if (delta > 0) setListPullDistance(Math.min(delta * 0.45, 90));
    else setListPullDistance(0);
  }, [listIsRefreshing]);

  const handleListTouchEnd = React.useCallback(async () => {
    if (listPullDistance >= PULL_THRESHOLD && !listRefreshTriggered.current) {
      listRefreshTriggered.current = true;
      setListIsRefreshing(true);
      try { await fetchChannels(); } finally { setListIsRefreshing(false); }
    }
    setListPullDistance(0);
  }, [listPullDistance, fetchChannels]);
  const [showScrollButton, setShowScrollButton] = React.useState(false);
  // Okundu bilgisi modalı — uzun basma "Bilgi" veya kendi mesajını sola kaydırma açar
  const [readInfoMsg, setReadInfoMsg] = React.useState<any | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isUserAtBottomRef = useRef(true);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const lastScrollStateRef = useRef(false);
  // Append/prepend ayrımı: son mesaj id'si değiştiyse append (dibe kaydırma
  // adayı), yalnız baştaki değiştiyse prepend (kaydırma yok, anchor düzeltir).
  const lastMsgIdRef = useRef<string | null>(null);
  // Prepend öncesi scroll durumu — eski sayfa eklenince görsel konumu korumak için
  // (iOS WebKit overflow-anchor desteklemez, elle telafi edilir).
  const prependAnchorRef = useRef<{ scrollHeight: number; scrollTop: number; firstId: string | null } | null>(null);

  const opponentTeam = null; // Simplification as in original
  const opponentJoker = null; // Simplification as in original

  // Rakipli MATCH_GROUP + rakipli SUBSCRIPTION chatlerinde ev/misafir takım
  // renkleri — "kendi aramızda" (opponentTeamId yok), tek takımlı abonelik,
  // TEAM_INTERNAL, DM, JOKER_NEGOTIATION kanallarında null kalır.
  const teamChatColors = useMemo(() => {
    const res = activeChannel?.reservation as any;
    const ad = activeChannel?.avatarData as any;
    // Abone kanalı: takım id'leri rezervasyondan değil avatarData.subscription'dan
    const homeTeamId = activeChannel?.type === 'SUBSCRIPTION'
      ? ad?.subscription?.homeTeamId
      : activeChannel?.type === 'MATCH_GROUP' ? res?.teamId : null;
    const awayTeamId = activeChannel?.type === 'SUBSCRIPTION'
      ? ad?.subscription?.awayTeamId
      : activeChannel?.type === 'MATCH_GROUP' ? res?.opponentTeamId : null;
    if (!homeTeamId || !awayTeamId) {
      return null;
    }
    const { home, away } = resolveTeamChatColors(
      ad?.homeTeamColor, ad?.awayTeamColor,
      ad?.homeTeamSecondaryColor, ad?.awayTeamSecondaryColor,
      homeTeamId, awayTeamId,
    );
    return {
      homeTeamId,
      awayTeamId,
      homeAccent: home,
      awayAccent: away,
      homeLogo: ad?.homeTeamLogo,
      awayLogo: ad?.awayTeamLogo,
      homeName: ad?.homeTeamName,
      awayName: ad?.awayTeamName,
    };
  }, [activeChannel]);

  // Başlığa/logoya dokunma: abone kanalında abonelik detayı, diğerlerinde maç
  // detayı açılır — ayrım handleOpenMatchDetail içinde (useChat).
  const handleHeaderTap = () => {
    handleOpenMatchDetail();
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    endRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = () => {
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      if (!scrollContainerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 150;
      isUserAtBottomRef.current = isAtBottom;
      if (lastScrollStateRef.current !== isAtBottom) {
        lastScrollStateRef.current = isAtBottom;
        setShowScrollButton(!isAtBottom);
      }
      if (scrollTop < 80 && hasMore && !loadingMore) {
        triggerLoadMore();
      }
    });
  };

  // loadMore'u anchor yakalayarak sarar: prepend sonrası useLayoutEffect
  // scroll farkını telafi eder, bakılan mesaj yerinde kalır.
  const triggerLoadMore = () => {
    const el = scrollContainerRef.current;
    if (el) {
      prependAnchorRef.current = {
        scrollHeight: el.scrollHeight,
        scrollTop: el.scrollTop,
        firstId: messages[0]?.id ?? null,
      };
    }
    loadMoreMessages();
  };

  // Prepend anchor telafisi — paint'ten ÖNCE (titreme olmasın). firstId guard'ı
  // anchor'ın saf append'e (yeni mesaj) yanlışlıkla uygulanmasını önler.
  useLayoutEffect(() => {
    const anchor = prependAnchorRef.current;
    const el = scrollContainerRef.current;
    if (!anchor || !el) return;
    if (messages[0]?.id !== anchor.firstId) {
      el.scrollTop = anchor.scrollTop + (el.scrollHeight - anchor.scrollHeight);
      prependAnchorRef.current = null;
    }
  }, [messages]);

  // Append-farkındalıklı auto-scroll: yalnız SONA yeni mesaj eklenince kaydırma
  // adayı olur. Prepend (eski sayfa) ve merge no-op'ları dibe kaydırmaz — derin
  // geçmiş okuyan kullanıcının konumu bozulmaz.
  useEffect(() => {
    const last = messages[messages.length - 1] ?? null;
    const lastId = last?.id ?? null;
    if (lastId === lastMsgIdRef.current) return;
    const isInitialLoad = lastMsgIdRef.current === null && lastId !== null;
    lastMsgIdRef.current = lastId;
    if (!last) return;
    // Kendi mesajım → nerede olursam olayım dibe in (beklenen davranış).
    if (last.isMe) isUserAtBottomRef.current = true;
    if (isInitialLoad || last.isMe || isUserAtBottomRef.current) {
      scrollToBottom(isInitialLoad ? 'instant' : 'smooth');
    }
  }, [messages]);

  useEffect(() => {
    setIsChatMenuOpen(false);
    isUserAtBottomRef.current = true;
    setShowScrollButton(false);
    lastMsgIdRef.current = null;
    prependAnchorRef.current = null;
    setTimeout(() => scrollToBottom('instant'), 100);
  }, [selectedChannelId]);

  // Klavye açıldığında en alttaysa son mesajı görünür tut
  useEffect(() => {
    if (keyboardHeight > 0 && isUserAtBottomRef.current) {
      setTimeout(() => scrollToBottom('instant'), 50);
    }
  }, [keyboardHeight]);

  // Ban modalı açılınca klavyeyi kapat
  useEffect(() => {
    if (banModalExpiry !== undefined) {
      (document.activeElement as HTMLElement)?.blur();
    }
  }, [banModalExpiry]);


  if (!selectedChannelId) {
    return (
      <div
        className="fixed inset-0 bg-pitch text-white flex flex-col overflow-hidden"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        {/* Sabit başlık */}
        <div className="px-4 pt-3 pb-3 shrink-0">
          <h1
            className="font-sport font-black text-white uppercase italic tracking-tighter leading-none"
            style={{ fontSize: 'clamp(2rem, 9vw, 3rem)' }}
          >
            OPERASYON <span className="text-turf-500">MERKEZİ</span>
          </h1>
          <p className="text-slate-400 font-medium text-sm mt-1">Maçlarını planla, taktik al, kazan.</p>
        </div>

        {/* Elastic içerik — pull-to-refresh ile */}
        <div
          ref={listScrollRef}
          className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
          onTouchStart={handleListTouchStart}
          onTouchMove={handleListTouchMove}
          onTouchEnd={handleListTouchEnd}
        >
          {/* Pull-to-refresh indicator */}
          <div
            className="flex items-center justify-center overflow-hidden"
            style={{ height: listIsRefreshing ? 56 : listPullDistance, transition: listIsRefreshing ? 'none' : 'height 0.2s ease' }}
          >
            {(listPullDistance > 0 || listIsRefreshing) && (
              <RefreshCw
                className={`w-5 h-5 text-turf-400 ${listIsRefreshing ? 'animate-spin' : ''}`}
                style={listIsRefreshing ? undefined : { transform: `rotate(${Math.min(listPullDistance * 3, 360)}deg)` }}
              />
            )}
          </div>

          <div className="px-4 pb-4 space-y-2" style={{ minHeight: 'calc(100% + 1px)' }}>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Aktif Sohbetler</h3>

            {isLoadingChannels ? (
              // Profesyonel skeleton (spinner yerine) — satır düzeni ChannelItem ile aynı hissi verir
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-slate-800/60 px-4 py-3 rounded-2xl border border-slate-700/40 flex gap-3 items-center animate-pulse"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-700/60 flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-3.5 bg-slate-700/60 rounded w-2/5" />
                      <div className="h-3 bg-slate-700/40 rounded w-3/5" />
                    </div>
                    <div className="w-8 h-3 bg-slate-700/40 rounded flex-shrink-0 self-start mt-1" />
                  </div>
                ))}
              </div>
            ) : channels.length === 0 && channelsError === 'network' ? (
              // Ağ hatasıyla boş kalan liste ≠ "Henüz sohbetin yok" — sebep + retry.
              <OfflineEmptyState onRetry={fetchChannels} />
            ) : channels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700/50 flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-slate-600" />
                </div>
                <div>
                  <p className="text-slate-300 font-semibold">Henüz sohbetin yok</p>
                  <p className="text-slate-500 text-sm mt-1">
                    Bir maç kurduğunda veya bir maça katıldığında sohbetlerin burada görünür.
                  </p>
                </div>
              </div>
            ) : (
              channels.map(channel => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  currentUserId={currentUser?.id}
                  blockedUserIds={blockedUserIds}
                  onClick={() => setSelectedChannelId(channel.id)}
                  onLongPress={() => setOptionsModalChannel(channel)}
                />
              ))
            )}
          </div>
        </div>

        <SuccessModal
          isOpen={successModalOpen}
          onClose={() => setSuccessModalOpen(false)}
          message={successModalMessage}
          type={successModalType}
        />

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

        {/* CHAT OPTIONS MODAL */}
        {optionsModalChannel && (() => {
          const modalStatusInfo = getMatchStatusInfo(optionsModalChannel.reservation);
          const canDelete = modalStatusInfo?.type === 'played' || modalStatusInfo?.type === 'unplayed';
          return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <div
                className="bg-slate-800 w-full max-w-sm rounded-3xl border border-slate-700 p-6 relative select-none"
                style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' } as React.CSSProperties}
              >
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
                      onClick={() => {
                        const channelToDelete = optionsModalChannel;
                        setOptionsModalChannel(null);
                        setConfirmTitle('Sohbeti Sil');
                        setConfirmMessage('Bu sohbeti silmek istediğinize emin misiniz? Bu işlem geri alınamaz.');
                        setConfirmIsDangerous(true);
                        setConfirmButtonText('Sil');
                        setConfirmAction(() => () => handleDeleteChannel(channelToDelete.id));
                        setConfirmModalOpen(true);
                      }}
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
    <div
      // Kök #0f172a (koyu lacivert) — input footer (bg-slate-900) ve mesaj listesi (bg-pitch)
      // ile aynı. Klavye açıkken paddingBottom:keyboardHeight boşluğu artık input'la aynı koyu
      // tonu gösterir (eski bg-pitch-surface #1e293b açık şeridi/renk geçişini bitirir).
      className="fixed inset-0 z-[60] flex flex-col bg-slate-900"
      style={keyboardHeight > 0 ? { paddingBottom: keyboardHeight } : undefined}
    >
      {/* Action toast */}
      {actionToast && (
        <div className={`fixed top-16 left-4 right-4 z-[120] px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl border animate-fade-in
          ${actionToast.type === 'success'
            ? 'bg-green-900/90 border-green-500/40 text-green-300'
            : 'bg-red-900/90 border-red-500/40 text-red-300'}`}
        >
          <CheckCircle className="w-5 h-5 shrink-0" />
          <p className="font-semibold text-sm">{actionToast.text}</p>
        </div>
      )}
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

      {/* Abone kanalı detay modalı — sunucu verisi + avatarData.subscription yedeği */}
      <SubscriptionDetailModal
        isOpen={isSubscriptionDetailOpen}
        onClose={() => setIsSubscriptionDetailOpen(false)}
        data={subscriptionDetailData}
        fallback={(activeChannel?.avatarData as any)?.subscription ?? null}
        loading={isSubscriptionDetailLoading}
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
            if (activeChannel?.type === 'SUBSCRIPTION') {
              if (ad?.subscription?.awayTeamId) {
                return (
                  <div
                    className="relative w-10 h-10 bg-slate-900 rounded-xl border border-slate-700 flex-shrink-0 cursor-pointer active:scale-90 transition-transform overflow-visible"
                    onClick={handleHeaderTap}
                  >
                    <img src={ad.homeTeamLogo || teamAvatarFallback(ad.homeTeamName || '')} className="w-[22px] h-[22px] rounded-md object-cover absolute top-0.5 left-0.5 z-10" />
                    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                      <span className="text-[6px] font-black text-emerald-500 bg-slate-950/90 px-0.5 rounded leading-none">VS</span>
                    </div>
                    <img src={ad.awayTeamLogo || teamAvatarFallback(ad.awayTeamName || '')} className="w-[22px] h-[22px] rounded-md object-cover absolute bottom-0.5 right-0.5 z-10 border border-slate-900" />
                  </div>
                );
              }
              return (
                <img
                  src={ad?.homeTeamLogo || teamAvatarFallback(ad?.homeTeamName || activeChannel?.name || '')}
                  className="w-10 h-10 rounded-xl bg-slate-800 object-cover cursor-pointer active:scale-90 transition-transform"
                  onClick={handleHeaderTap}
                />
              );
            }
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
          <div className="flex-1 min-w-0" onClick={handleHeaderTap} style={{ cursor: (activeChannel?.relatedMatchId || activeChannel?.type === 'SUBSCRIPTION') ? 'pointer' : 'default' }}>
            <h2 className="text-white font-bold leading-tight text-sm sm:text-base md:text-lg truncate">{activeChannel?.name}</h2>
            <div className="flex flex-col text-[10px] sm:text-xs text-slate-400 mt-0.5">
              {activeChannel?.type === 'SUBSCRIPTION' ? (
                <span className="flex items-center gap-1 text-emerald-400 font-medium mt-0.5">
                  <Repeat className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  Sabit Rezervasyon Aboneliği
                </span>
              ) : activeChannel?.type === 'MATCH_GROUP' ? (
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

        {teamChatColors && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 min-w-fit">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundImage: `linear-gradient(135deg, ${teamChatColors.homeAccent.base} 50%, ${teamChatColors.homeAccent.secondaryBase} 50%)` }} />
              <span className="text-[11px] text-slate-300 font-medium truncate max-w-[110px]">{teamChatColors.homeName}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 min-w-fit">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundImage: `linear-gradient(135deg, ${teamChatColors.awayAccent.base} 50%, ${teamChatColors.awayAccent.secondaryBase} 50%)` }} />
              <span className="text-[11px] text-slate-300 font-medium truncate max-w-[110px]">{teamChatColors.awayName}</span>
            </div>
          </div>
        )}

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
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-6 bg-pitch relative chat-scroll-container"
      >
        <div className="flex justify-center">
          <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide mt-6">
            {activeChannel?.type === 'MATCH_GROUP' ? 'Maç Grubu Oluşturuldu' : 'Sohbet Başlatıldı'}
          </span>
        </div>

        {(() => {
          const res = activeChannel?.reservation as any;
          if (activeChannel?.type !== 'MATCH_GROUP') return null;
          if (!res || res.status !== 'PENDING' || !res.requiredPlayerCount) return null;
          if (res.slotTime && new Date(res.slotTime) < new Date()) return null;
          const required = res.requiredPlayerCount;
          const isKendiAramizda = !res.opponentTeamId;
          const warnings: string[] = [];

          if (isKendiAramizda) {
            // Kendi aramızda: tüm oyuncular aynı takımda, required * 2 oyuncu gerekli
            const totalRequired = required * 2;
            const myCount = res.homeTeamPlayerCount;
            if (myCount !== undefined && myCount < totalRequired) {
              warnings.push(`Takımınızda ${totalRequired} oyuncu bulunmuyor lütfen oyuncu sayılarınızın eksiksiz olduğundan emin olun`);
            }
          } else {
            const myTeamId = (currentUser as any)?.teamId;
            const isHomeTeam = myTeamId === res.teamId;
            const myCount = isHomeTeam ? res.homeTeamPlayerCount : res.awayTeamPlayerCount;
            const oppCount = isHomeTeam ? res.awayTeamPlayerCount : res.homeTeamPlayerCount;

            if (myCount !== undefined && myCount < required) {
              warnings.push(`Takımınızda ${required} oyuncu bulunmuyor lütfen oyuncu sayınızın eksiksiz olduğundan emin olun`);
            }
            if (oppCount !== undefined && oppCount < required) {
              warnings.push(`Eşleştiğiniz takımın kadrosunda ${required} oyuncu bulunmuyor lütfen oyuncu sayılarını teyit ettirin`);
            }
          }

          if (warnings.length === 0) return null;

          return (
            <div className="space-y-1 -mt-2">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/30 rounded-xl px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-200">{w}</p>
                </div>
              ))}
            </div>
          );
        })()}

        {isLoadingMessages ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20 gap-3">
            <div className="w-8 h-8 border-2 border-turf-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-500 text-sm">Mesajlar yükleniyor...</span>
          </div>
        ) : (
          <>
            {loadingMore && (
              <div className="flex justify-center py-2">
                <span className="text-xs text-slate-400">Eski mesajlar yükleniyor...</span>
              </div>
            )}
            {!loadingMore && hasMore && (
              <div className="flex justify-center py-2">
                <button
                  onClick={triggerLoadMore}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Daha eski mesajları göster
                </button>
              </div>
            )}
          </>
        )}

        {!isLoadingMessages && messages.filter(filterMessage).map((msg, index, arr) => (
          <MessageBubble
            key={msg.id}
            msg={msg as any}
            prevMsg={(arr[index - 1] ?? null) as any}
            nextMsg={(arr[index + 1] ?? null) as any}
            currentUser={currentUser}
            onLongPress={openContextMenu as any}
            onAvatarClick={openActionModal as any}
            onAcceptProposal={handleAcceptProposal}
            onAcceptRematch={handleAcceptRematch}
            teamColors={teamChatColors}
            // Okundu tiki: pending → tek gri; herkes okuduysa (min-watermark) mavi;
            // aksi çift gri. readStates null (eski sunucu) → tik hiç çizilmez.
            tickState={
              msg.isMe && !msg.isSystem
                ? msg.pending
                  ? 'sending'
                  : othersMinLastReadAt == null
                    ? (readStates ? 'delivered' : null)
                    : new Date(msg.rawCreatedAt).getTime() <= othersMinLastReadAt
                      ? 'read'
                      : 'delivered'
                : null
            }
            onInfo={readStates ? (m) => setReadInfoMsg(m) : undefined}
          />
        ))}

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
          <div className={`flex flex-col bg-slate-900 border-t border-slate-800 ${keyboardHeight > 0 ? '' : 'pb-safe-bottom'}`}>
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
            <div className={keyboardHeight > 0 ? 'px-3 pt-3 pb-0' : 'p-3'}>
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
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSend();
                          inputRef.current?.focus();
                        }
                      }}
                      placeholder="Mesaj yaz..."
                      className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onPointerDown={(e) => e.preventDefault()}
                    disabled={isSending || !input.trim()}
                    onClick={() => {
                      handleSend();
                      inputRef.current?.focus();
                    }}
                    className={`p-3 rounded-xl transition-all ${input.trim() && !isSending ? 'bg-turf-600 text-white shadow-lg shadow-turf-600/20 scale-100' : 'bg-slate-800 text-slate-500 scale-95 opacity-60'}`}
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
              {(() => {
                const ownerPhone = matchDetailData?.pitch?.business?.ownerPhone;
                const businessClosed = !!matchDetailData?.pitch?.business?.isDeleted;
                if (ownerPhone && !businessClosed) {
                  return (
                    <a
                      href={`tel:${ownerPhone}`}
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
                  );
                }
                return (
                  <button
                    type="button"
                    disabled
                    className="w-full text-left p-4 rounded-2xl text-md font-bold text-white flex items-center justify-between transition-colors shadow-sm opacity-40 cursor-not-allowed"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-turf-500/10 flex items-center justify-center text-turf-500 border border-turf-500/20">
                        <Phone className="w-6 h-6" />
                      </div>
                      <span>Sahayı Ara</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                  </button>
                );
              })()}

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

      <MessageContextMenu
        visible={isContextMenuOpen}
        msg={contextMenuMsg}
        position={contextMenuPosition}
        onCopy={handleCopy}
        onReport={handleContextMenuReport}
        onInfo={readStates ? () => {
          const m = contextMenuMsg;
          closeContextMenu();
          if (m) setReadInfoMsg(m);
        } : undefined}
        onClose={closeContextMenu}
      />

      <ReadInfoModal
        isOpen={!!readInfoMsg}
        onClose={() => setReadInfoMsg(null)}
        message={readInfoMsg}
        channelType={activeChannel?.type}
        channelId={selectedChannelId}
        currentUserId={currentUser?.id}
        readStates={readStates}
        refreshReadStates={fetchReadStates}
        teamColors={teamChatColors}
      />

      <MessageActionModal
        visible={isActionModalOpen}
        senderName={selectedMessage?.senderName ?? ''}
        loading={actionLoading}
        onClose={closeAll}
        onBlock={handleBlock}
        onReport={openReportModal}
        onBlockAndReport={handleBlockAndReport}
      />

      <ReportNoteModal
        visible={isReportModalOpen}
        loading={actionLoading}
        isBlockAndReport={blockAndReportPending}
        onClose={closeAll}
        onSubmit={(note) => handleReport(activeChannel?.id, note)}
      />

      {/* Chat ban modal */}
      {banModalExpiry !== undefined && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-6">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center gap-4">
            {/* Özel chat-ban ikonu */}
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6C6 4.34 7.34 3 9 3H27C28.66 3 30 4.34 30 6V21C30 22.66 28.66 24 27 24H21L17 29L13 24H9C7.34 24 6 22.66 6 21V6Z" fill="#EF444420" stroke="#EF4444" strokeWidth="1.5" strokeLinejoin="round"/>
                <line x1="11" y1="8" x2="25" y2="19" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
                <line x1="25" y1="8" x2="11" y2="19" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-white font-black text-base">Sohbet Yasağınız Var</p>
              <p className="text-slate-400 text-sm leading-relaxed">
                {banModalExpiry
                  ? (() => {
                      const diff = new Date(banModalExpiry).getTime() - Date.now();
                      if (diff <= 0) return 'Yasak süreniz dolmuş, lütfen tekrar deneyin.';
                      const h = Math.floor(diff / 3_600_000);
                      const m = Math.floor((diff % 3_600_000) / 60_000);
                      const label = h >= 24
                        ? `${Math.floor(h / 24)} gün ${h % 24} saat`
                        : h > 0 ? `${h} saat ${m} dakika` : `${m} dakika`;
                      return `Hesabınıza sohbet yasağı uygulandı. Yasağınızın bitmesine ${label} kaldı.`;
                    })()
                  : 'Hesabınıza süresiz sohbet yasağı uygulandı. Lütfen destek ile iletişime geçin.'}
              </p>
            </div>
            <button
              onClick={() => setBanModalExpiry(undefined)}
              className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-colors"
            >
              Anladım
            </button>
          </div>
        </div>
      )}
    </div>
  );
};