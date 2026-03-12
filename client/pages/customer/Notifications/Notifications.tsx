import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';
import { PlayerDetailModal } from '../../../components/Modals/PlayerDetailModal';
import { TeamDetailModal } from '../../../components/Modals/TeamDetailModal';

import { useNotifications } from './hooks/useNotifications';
import { NotificationTabs } from './components/NotificationTabs';
import { MatchRequestsTab } from './components/MatchRequestsTab';
import { JoinRequestsTab } from './components/JoinRequestsTab';
import { AllNotificationsTab } from './components/AllNotificationsTab';

export const Notifications: React.FC = () => {
   const {
      activeTab, setActiveTab,
      notifications, loading,
      successMessage, errorMessage,
      selectedJoinRequest, setSelectedJoinRequest,
      selectedTeamId, setSelectedTeamId,
      filteredJoinRequests, filteredMatchRequests,
      rematchProposals, jokerInvites,
      handleAcceptJoinRequest, handleRejectJoinRequest,
      handleAcceptChallenge, handleRejectChallenge,
      handleAcceptRematchFromNotif, handleAcceptJokerInvite, handleRejectJokerInvite
   } = useNotifications();

   return (
      <div className="pb-28 pt-20 pt-safe-top px-4 max-w-3xl mx-auto min-h-screen bg-pitch">
         <header className="mb-6">
            <h1 className="font-sport font-black text-4xl text-white uppercase italic tracking-tighter">
               BİLDİRİMLER
            </h1>
            <p className="text-slate-400 text-sm mt-1">
               Katılma istekleri ve maç teklifleri
            </p>
         </header>

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

         <NotificationTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            notificationsCount={notifications.length}
            matchRequestsCount={filteredMatchRequests.length + rematchProposals.length + jokerInvites.length}
            joinRequestsCount={filteredJoinRequests.length}
         />

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
                     handleAcceptChallenge={handleAcceptChallenge}
                     handleRejectChallenge={handleRejectChallenge}
                     handleAcceptRematchFromNotif={handleAcceptRematchFromNotif}
                  />
               )}
            </div>
         )}

         <PlayerDetailModal
            isOpen={!!selectedJoinRequest}
            onClose={() => setSelectedJoinRequest(null)}
            player={selectedJoinRequest ? {
               id: selectedJoinRequest.user.id,
               name: selectedJoinRequest.user.full_name || selectedJoinRequest.user.username,
               username: selectedJoinRequest.user.username,
               position: selectedJoinRequest.user.position,
               foot: selectedJoinRequest.user.foot,
               birthDate: selectedJoinRequest.user.birthDate,
               secondaryPosition: selectedJoinRequest.user.secondaryPosition,
               location: selectedJoinRequest.user.location,
               avatarUrl: selectedJoinRequest.user.avatarUrl
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
