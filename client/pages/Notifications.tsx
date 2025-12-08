
import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Calendar, Shield, Info, ChevronRight, UserPlus, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface JoinRequest {
   id: string;
   user: {
      id: string;
      username: string;
      full_name?: string;
      position?: string;
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
                              className="relative bg-slate-800 rounded-2xl border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)] overflow-hidden"
                           >
                              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>

                              <div className="p-4 pl-6">
                                 <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                       <UserPlus className="w-5 h-5 text-blue-500" />
                                       Katılma İsteği
                                    </h3>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                                       {new Date(request.createdAt).toLocaleDateString('tr-TR')}
                                    </span>
                                 </div>

                                 <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                                    <div className="flex items-center gap-3 mb-2">
                                       <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
                                          {request.user.full_name?.[0] || request.user.username[0]}
                                       </div>
                                       <div>
                                          <div className="text-white font-bold">
                                             {request.user.full_name || request.user.username}
                                          </div>
                                          <div className="text-xs text-slate-400">
                                             {request.user.position || 'Oyuncu'}
                                          </div>
                                       </div>
                                    </div>

                                    {request.message && (
                                       <p className="text-xs text-slate-300 italic mb-3">"{request.message}"</p>
                                    )}

                                    <div className="flex gap-2">
                                       <button
                                          onClick={() => handleRejectJoinRequest(request.id)}
                                          className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-red-900/50 hover:text-red-400 transition-colors"
                                       >
                                          <X className="w-3 h-3" /> Reddet
                                       </button>
                                       <button
                                          onClick={() => handleAcceptJoinRequest(request.id)}
                                          className="flex-1 py-2 bg-turf-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20"
                                       >
                                          <Check className="w-3 h-3" /> Kabul Et
                                       </button>
                                    </div>
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
                                 )}

                                 {/* Chat Redirect Action */}
                                 {notif.metadata?.isChatRedirect && (
                                    <div className="mt-3">
                                       <button
                                          onClick={() => navigate('/chat', { state: { channelId: notif.metadata.channelId } })}
                                          className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
                                       >
                                          <MessageSquare className="w-3 h-3" /> Sohbete Git
                                       </button>
                                    </div>
                                 )}
                              </div>
                           </div>
                        ))
                     )}
                  </>
               )}
            </div>
         )}
      </div>
   );
};
