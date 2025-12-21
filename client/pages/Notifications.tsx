
import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Calendar, Shield, Info, ChevronRight, UserPlus, CheckCircle, AlertCircle, MessageSquare, MapPin, Handshake } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PlayerDetailModal } from '../components/PlayerDetailModal';
import { Position, Player } from '../types';

interface JoinRequest {
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
      avatarUrl?: string;
   };
   teamId: string;
   message?: string;
   status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
   createdAt: string;
}

interface Notification {
   id: string;
   type: 'JOIN_REQUEST' | 'CHALLENGE' | 'MATCH_RESULT';
   relatedId: string;
   metadata: any;
   read: boolean;
   createdAt: string;
   title?: string;
   message?: string;
}

export const Notifications: React.FC = () => {
   const [activeTab, setActiveTab] = useState<'ALL' | 'JOIN_REQUESTS'>('ALL');
   const [notifications, setNotifications] = useState<Notification[]>([]);
   const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
   const [loading, setLoading] = useState(true);
   const [successMessage, setSuccessMessage] = useState('');
   const [errorMessage, setErrorMessage] = useState('');
   const navigate = useNavigate();
   const [selectedJoinRequest, setSelectedJoinRequest] = useState<JoinRequest | null>(null);


   useEffect(() => {
      fetchData();
   }, []);

   useEffect(() => {
      // Auto-hide success/error messages after 3 seconds
      if (successMessage || errorMessage) {
         const timer = setTimeout(() => {
            setSuccessMessage('');
            setErrorMessage('');
         }, 3000);
         return () => clearTimeout(timer);
      }
   }, [successMessage, errorMessage]);

   const fetchData = async () => {
      try {
         setLoading(true);

         // Fetch notifications
         const notifResponse = await api.get('/notifications');
         const fetchedNotifications = notifResponse.data;
         setNotifications(fetchedNotifications);

         // Mark unread notifications as read
         const unreadIds = fetchedNotifications.filter((n: any) => !n.read).map((n: any) => n.id);
         if (unreadIds.length > 0) {
            // We can iterate or add a bulk endpoint. For now, iterate (simpler for quick fix)
            // Or better, just mark them as read in the UI and let user click individually? 
            // User request: "bildirim kutusuna tıklanana kadar yeni bildirimler kaç adetse sayısı yazmalı"
            // This implies once they click the box (visit page), it should clear? 
            // Usually visiting the page clears the "unread count" badge.
            // Let's mark them as read in backend.
            await Promise.all(unreadIds.map((id: string) => api.patch(`/notifications/${id}/read`)));
         }

         // Fetch join requests for user's teams (assuming user is captain)
         // We'll need to get user's teams first
         const teamsResponse = await api.get('/teams'); // Get all teams where user is captain
         const myTeams = teamsResponse.data.filter((team: any) =>
            team.captainId === getCurrentUserId() ||
            team.captain?.id === getCurrentUserId()
         );

         // Fetch join requests for each team
         const allJoinRequests: JoinRequest[] = [];
         for (const team of myTeams) {
            const reqResponse = await api.get(`/join-requests/team/${team.id}`);
            allJoinRequests.push(...reqResponse.data);
         }
         setJoinRequests(allJoinRequests);
      } catch (error) {
         console.error('Failed to fetch notifications:', error);
      } finally {
         setLoading(false);
      }
   };

   const getCurrentUserId = () => {
      // Get from local storage or context
      const token = localStorage.getItem('token');
      if (!token) return null;
      try {
         const payload = JSON.parse(atob(token.split('.')[1]));
         return payload.sub || payload.id || payload.userId;
      } catch {
         return null;
      }
   };

   const handleAcceptJoinRequest = async (requestId: string) => {
      try {
         await api.patch(`/join-requests/${requestId}/accept`);
         // Refresh data
         await fetchData();
         setSuccessMessage('Katılma isteği kabul edildi! Oyuncu takıma eklendi.');
      } catch (error: any) {
         console.error('Failed to accept join request:', error);
         setErrorMessage(error.response?.data?.message || 'Kabul edilemedi.');
      }
   };

   const handleRejectJoinRequest = async (requestId: string) => {
      try {
         await api.patch(`/join-requests/${requestId}/reject`);
         // Refresh data
         await fetchData();
         setSuccessMessage('Katılma isteği reddedildi.');
      } catch (error: any) {
         console.error('Failed to reject join request:', error);
         setErrorMessage(error.response?.data?.message || 'Reddedilemedi.');
      }
   };

   const handleAcceptChallenge = async (challengeId: string) => {
      try {
         const response = await api.patch(`/challenges/${challengeId}/accept`);
         // If response contains channelId (from backend logic), navigate to chat
         // Note: Backend might not return channelId directly in the challenge object, 
         // but we know a notification with 'isChatRedirect' metadata will be created for the challenger.
         // For the acceptor (host), we should also probably redirect or just show success.
         // Let's check if the backend returns the updated challenge.

         await fetchData();
         setSuccessMessage('Meydan okuma kabul edildi! Sohbet kanalı oluşturuluyor...');

         // Optional: Redirect to chat immediately if we can get the channel ID
         // For now, let's just refresh. The user will see the new chat in the Chat tab.
         setTimeout(() => navigate('/chat'), 1500);
      } catch (error: any) {
         console.error('Failed to accept challenge:', error);
         setErrorMessage(error.response?.data?.message || 'Kabul edilemedi.');
      }
   };

   const handleRejectChallenge = async (challengeId: string) => {
      try {
         await api.patch(`/challenges/${challengeId}/reject`);
         await fetchData();
         setSuccessMessage('Meydan okuma reddedildi.');
      } catch (error: any) {
         console.error('Failed to reject challenge:', error);
         setErrorMessage(error.response?.data?.message || 'Reddedilemedi.');
      }
   };

   const filteredJoinRequests = joinRequests.filter(r => r.status === 'PENDING');

   return (
      <div className="pb-28 pt-20 pt-safe-top px-4 max-w-3xl mx-auto min-h-screen bg-pitch">
         <header className="mb-6">
            <h1 className="font-sport font-black text-4xl text-white uppercase italic tracking-tighter">
               BİLDİRİMLER
            </h1>
            <p className="text-slate-400 text-sm mt-1">
               Katılma istekleri ve diğer bildirimler
            </p>
         </header>

         {/* Success Message */}
         {successMessage && (
            <div className="mb-6 bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
               <CheckCircle className="w-5 h-5 flex-shrink-0" />
               <p className="font-bold text-sm">{successMessage}</p>
            </div>
         )}

         {/* Error Message */}
         {errorMessage && (
            <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
               <AlertCircle className="w-5 h-5 flex-shrink-0" />
               <p className="font-bold text-sm">{errorMessage}</p>
            </div>
         )}

         {/* Tab Switcher */}
         <div className="flex p-1 bg-slate-800 rounded-xl mb-6 border border-slate-700">
            <button
               onClick={() => setActiveTab('ALL')}
               className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'ALL'
                  ? 'bg-turf-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
                  }`}
            >
               HEPSİ ({notifications.length})
            </button>
            <button
               onClick={() => setActiveTab('JOIN_REQUESTS')}
               className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'JOIN_REQUESTS'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
                  }`}
            >
               KATILMA İSTEKLERİ ({filteredJoinRequests.length})
            </button>
         </div>

         {loading ? (
            <LoadingSpinner fullScreen text="Bildirimler Yükleniyor..." />
         ) : (
            <div className="space-y-4">
               {/* JOIN REQUESTS TAB */}
               {activeTab === 'JOIN_REQUESTS' && (
                  <>
                     {filteredJoinRequests.length === 0 ? (
                        <div className="text-center py-12 opacity-50">
                           <UserPlus className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                           <p className="text-slate-400 text-sm">Bekleyen katılma isteği yok.</p>
                        </div>
                     ) : (
                        filteredJoinRequests.map(request => (
                           <div
                              key={request.id}
                              className="p-4 rounded-2xl border flex gap-4 items-center transition-all cursor-pointer group relative overflow-hidden bg-slate-800 border-slate-700 hover:border-turf-500/50 hover:bg-slate-800/80"
                              onClick={() => {
                                 setSelectedJoinRequest(request);
                              }}
                           >
                              {/* Highlight Effect */}
                              <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-black/20 to-transparent pointer-events-none"></div>

                              <div className="relative">
                                 <img
                                    src={`https://ui-avatars.com/api/?name=${request.user.full_name || request.user.username}&background=0D8ABC&color=fff`}
                                    alt={request.user.username}
                                    className="w-16 h-16 rounded-full object-cover border-2 border-slate-600 group-hover:border-turf-500 transition-colors"
                                 />
                              </div>
                              <div className="flex-1 min-w-0 relative z-10">
                                 <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-white text-lg truncate group-hover:text-turf-400 transition-colors">
                                       {request.user.full_name || request.user.username}
                                    </h3>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                                       {new Date(request.createdAt).toLocaleDateString('tr-TR')}
                                    </span>
                                 </div>

                                 <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5 mb-2">
                                    <MapPin className="w-3 h-3 text-turf-600" /> İstanbul
                                 </div>

                                 {request.message && (
                                    <p className="text-xs text-slate-300 italic mb-2 line-clamp-1">"{request.message}"</p>
                                 )}

                                 <div className="flex gap-2 mt-2">
                                    <button
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          handleAcceptJoinRequest(request.id);
                                       }}
                                       className="flex-1 py-1.5 bg-turf-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20"
                                    >
                                       <Check className="w-3 h-3" /> Kabul Et
                                    </button>
                                    <button
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          handleRejectJoinRequest(request.id);
                                       }}
                                       className="flex-1 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-red-900/50 hover:text-red-400 transition-colors"
                                    >
                                       <X className="w-3 h-3" /> Reddet
                                    </button>
                                 </div>
                              </div>
                           </div>
                        ))
                     )}
                  </>
               )}

               {/* ALL TAB */}
               {activeTab === 'ALL' && (
                  <>
                     {notifications.length === 0 ? (
                        <div className="text-center py-12 opacity-50">
                           <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                           <p className="text-slate-400 text-sm">Şu an yeni bildirim yok.</p>
                        </div>
                     ) : (
                        notifications.map(notif => (
                           <div
                              key={notif.id}
                              className={`relative bg-slate-800 rounded-2xl border overflow-hidden transition-all ${!notif.read
                                 ? 'border-turf-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                                 : 'border-slate-700 opacity-90'
                                 }`}
                           >
                              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${notif.type === 'JOIN_REQUEST' ? 'bg-blue-500' :
                                 notif.type === 'CHALLENGE' ? 'bg-turf-500' :
                                    'bg-yellow-500'
                                 }`}></div>

                              <div className="p-4 pl-6">
                                 <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-white text-lg">
                                       {notif.type === 'JOIN_REQUEST' && 'Yeni Katılma İsteği'}
                                       {notif.type === 'CHALLENGE' && 'Yeni Meydan Okuma'}
                                       {notif.type === 'MATCH_RESULT' && 'Maç Sonucu'}
                                    </h3>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                                       {new Date(notif.createdAt).toLocaleDateString('tr-TR')}
                                    </span>
                                 </div>

                                 <p className="text-sm text-slate-300 mb-3 leading-relaxed">
                                    {/* Use title/message if available, fallback to generic */}
                                    {(notif as any).title && <span className="block font-bold text-white mb-1">{(notif as any).title}</span>}
                                    {(notif as any).message || 'Bildirim detayları'}
                                 </p>

                                 {/* Challenge Actions */}
                                 {notif.type === 'CHALLENGE' && (notif.metadata?.challengeId || notif.relatedId) && !notif.metadata?.isChatRedirect && (
                                    (() => {
                                       const date = notif.metadata?.matchDate;
                                       const time = notif.metadata?.matchTime;
                                       let isExpired = false;

                                       if (date && time) {
                                          // Handle Date object or string from backend
                                          const dateStr = typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0];
                                          const matchDate = new Date(`${dateStr}T${time}`);
                                          if (!isNaN(matchDate.getTime())) {
                                             isExpired = new Date() > matchDate;
                                          }
                                       }

                                       if (isExpired) {
                                          return (
                                             <div className="mt-2 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                                                <p className="text-xs text-slate-500 italic">
                                                   Bu maç teklifinin süresi doldu. (Maç saati geçti)
                                                </p>
                                             </div>
                                          );
                                       }

                                       return (
                                          <div className="flex gap-2 mt-3">
                                             <button
                                                onClick={() => handleRejectChallenge(notif.metadata?.challengeId || notif.relatedId)}
                                                className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-red-900/50 hover:text-red-400 transition-colors"
                                             >
                                                <X className="w-3 h-3" /> Reddet
                                             </button>
                                             <button
                                                onClick={() => handleAcceptChallenge(notif.metadata?.challengeId || notif.relatedId)}
                                                className="flex-1 py-2 bg-turf-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20"
                                             >
                                                <Check className="w-3 h-3" /> Kabul Et
                                             </button>
                                          </div>
                                       );
                                    })()
                                 )}

                                 {/* Chat Redirect Action */}
                                 {notif.metadata?.isChatRedirect && (
                                    (() => {
                                       const date = notif.metadata?.matchDate;
                                       const time = notif.metadata?.matchTime;
                                       let isExpired = false;

                                       if (date && time) {
                                          // Handle Date object or string from backend
                                          const dateStr = typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0];
                                          const matchDate = new Date(`${dateStr}T${time}`);

                                          // Add 1 hour (plus allowance) for "Match End"
                                          const matchEndDate = new Date(matchDate.getTime() + 65 * 60 * 1000);

                                          if (!isNaN(matchDate.getTime())) {
                                             isExpired = new Date() > matchEndDate;
                                          }
                                       }

                                       return (
                                          <div className="mt-3">
                                             <button
                                                onClick={() => !isExpired && navigate('/chat', { state: { channelId: notif.metadata.channelId } })}
                                                disabled={isExpired}
                                                className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-lg ${isExpired
                                                   ? 'bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                                                   : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/20'
                                                   }`}
                                             >
                                                <MessageSquare className="w-3 h-3" /> {isExpired ? 'Maç Sona Erdi' : 'Sohbete Git'}
                                             </button>
                                          </div>
                                       );
                                    })()
                                 )}
                              </div>
                           </div>
                        ))
                     )}
                  </>
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
               position: (selectedJoinRequest.user.position === 'Forvet' ? Position.FWD : selectedJoinRequest.user.position as Position) || Position.FWD,
               avatarUrl: selectedJoinRequest.user.avatarUrl || `https://ui-avatars.com/api/?name=${selectedJoinRequest.user.full_name || selectedJoinRequest.user.username}&background=0D8ABC&color=fff`,
               location: selectedJoinRequest.user.location || 'İstanbul',
               birthDate: selectedJoinRequest.user.birthDate,
               foot: selectedJoinRequest.user.foot,
               secondaryPosition: selectedJoinRequest.user.secondaryPosition,
               isJoker: true,
               sharesFee: false,
               form: ['W', 'D', 'W', 'W', 'L']
            } : null}
            onAccept={() => selectedJoinRequest && handleAcceptJoinRequest(selectedJoinRequest.id)}
            onReject={() => selectedJoinRequest && handleRejectJoinRequest(selectedJoinRequest.id)}
         />
      </div>
   );
};
