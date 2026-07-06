import React from 'react';
import { CheckCircle, AlertCircle, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';
import { PlayerDetailModal } from '../../../components/Modals/PlayerDetailModal';
import { TeamDetailModal } from '../../../components/Modals/TeamDetailModal';

import { useNotifications } from './hooks/useNotifications';
import { NotificationTabs } from './components/NotificationTabs';
import { MatchRequestsTab } from './components/MatchRequestsTab';
import { JoinRequestsTab } from './components/JoinRequestsTab';
import { AllNotificationsTab } from './components/AllNotificationsTab';

export const Notifications: React.FC = () => {
   const navigate = useNavigate();
   const {
      activeTab, setActiveTab,
      notifications, loading,
      total, hasMore, loadingMore, loadMore,
      successMessage, errorMessage,
      selectedJoinRequest, setSelectedJoinRequest,
      selectedTeamId, setSelectedTeamId,
      filteredJoinRequests, filteredMatchRequests,
      rematchProposals, jokerInvites,
      handleAcceptJoinRequest, handleRejectJoinRequest,
      handleAcceptChallenge, handleRejectChallenge,
      handleAcceptRematchFromNotif, handleAcceptJokerInvite, handleRejectJokerInvite
   } = useNotifications();

   // Infinite scroll: dibe ~600px kala sonraki sayfa (Marketplace eşiği).
   const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 600) loadMore();
   };

   return (
      <div className="fixed inset-0 bg-pitch flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
         <header className="px-4 pt-4 max-w-3xl mx-auto w-full">
            <button
               onClick={() => navigate(-1)}
               className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors mb-4 -ml-1 active:scale-95"
            >
               <ChevronLeft className="w-5 h-5" />
               <span className="text-sm font-medium">Geri</span>
            </button>
            <h1 className="font-sport font-black text-4xl text-white uppercase italic tracking-tighter">
               BİLDİRİMLER
            </h1>
            <p className="text-slate-400 text-sm mt-1">
               Katılma istekleri ve maç teklifleri
            </p>
         </header>

         <div className="px-4 max-w-3xl mx-auto w-full pt-4">
            <NotificationTabs
               activeTab={activeTab}
               setActiveTab={setActiveTab}
               notificationsCount={total ?? notifications.length}
               matchRequestsCount={filteredMatchRequests.length + rematchProposals.length + jokerInvites.length}
               joinRequestsCount={filteredJoinRequests.length}
            />
         </div>

         <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties} onScroll={handleScroll}>
            <div className="px-4 max-w-3xl mx-auto pt-4 pb-28" style={{ minHeight: 'calc(100% + 1px)' }}>
               {successMessage && (
                  <div className="mb-6 bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
                     <CheckCircle className="w-5 h-5 flex-shrink-0" />
                     <p className="font-bold text-sm">{successMessage}</p>
                  </div>
               )}
               {errorMessage && (
                  <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
                     <AlertCircle className="w-5 h-5 flex-shrink-0" />
                     <p className="font-bold text-sm">{errorMessage}</p>
                  </div>
               )}

               {loading ? (
                  <LoadingSpinner fullScreen text="Bildirimler Yükleniyor..." />
               ) : (
                  <div className="space-y-4">
                     {activeTab === 'MATCH_REQUESTS' && (
                        <MatchRequestsTab
                           matchRequests={filteredMatchRequests}
                           rematchProposals={rematchProposals}
                           jokerInvites={jokerInvites}
                           setSelectedTeamId={setSelectedTeamId}
                           handleAcceptChallenge={handleAcceptChallenge}
                           handleRejectChallenge={handleRejectChallenge}
                           handleAcceptRematchFromNotif={handleAcceptRematchFromNotif}
                           handleAcceptJokerInvite={handleAcceptJokerInvite}
                           handleRejectJokerInvite={handleRejectJokerInvite}
                        />
                     )}

                     {activeTab === 'JOIN_REQUESTS' && (
                        <JoinRequestsTab
                           joinRequests={filteredJoinRequests}
                           setSelectedJoinRequest={setSelectedJoinRequest}
                           handleAccept={handleAcceptJoinRequest}
                           handleReject={handleRejectJoinRequest}
                        />
                     )}

                     {activeTab === 'ALL' && (
                        <AllNotificationsTab
                           notifications={notifications}
                           handleAcceptRematchFromNotif={handleAcceptRematchFromNotif}
                           setActiveTab={setActiveTab}
                        />
                     )}

                     {/* Infinite-scroll alt göstergesi (Marketplace deseni) */}
                     {activeTab === 'ALL' && loadingMore && (
                        <div className="flex items-center justify-center py-4">
                           <LoadingSpinner size="sm" text="" />
                        </div>
                     )}
                  </div>
               )}
            </div>
         </div>

         <PlayerDetailModal
            isOpen={!!selectedJoinRequest}
            onClose={() => setSelectedJoinRequest(null)}
            player={selectedJoinRequest ? {
               id: selectedJoinRequest.user.id,
               name: selectedJoinRequest.user.full_name || selectedJoinRequest.user.username,
               isJoker: false,
               position: selectedJoinRequest.user.position as any,
               foot: selectedJoinRequest.user.foot,
               birthDate: selectedJoinRequest.user.birthDate,
               secondaryPosition: selectedJoinRequest.user.secondaryPosition,
               location: selectedJoinRequest.user.location ?? '',
               nationality: selectedJoinRequest.user.nationality,
               avatarUrl: selectedJoinRequest.user.avatarUrl ?? ''
            } : null}
         />

         <TeamDetailModal
            isOpen={!!selectedTeamId}
            onClose={() => setSelectedTeamId(null)}
            teamId={selectedTeamId!}
         />
      </div>
   );
};
