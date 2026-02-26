
import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Calendar, UserPlus, CheckCircle, AlertCircle, MessageSquare, MapPin, Handshake, Swords } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PlayerDetailModal } from '../components/PlayerDetailModal';
import { TeamDetailModal } from '../components/TeamDetailModal';
import { Position, Challenge } from '../types';

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
   type: 'JOIN_REQUEST' | 'CHALLENGE' | 'MATCH_RESULT' | 'REMATCH_PROPOSAL' | 'SYSTEM' | 'MATCH_REMINDER' | 'RESERVATION_REQUEST';
   relatedId: string;
   metadata: any;
   read: boolean;
   createdAt: string;
   title?: string;
   message?: string;
}

export const Notifications: React.FC = () => {
   const [activeTab, setActiveTab] = useState<'ALL' | 'JOIN_REQUESTS' | 'MATCH_REQUESTS'>('ALL');
   const [notifications, setNotifications] = useState<Notification[]>([]);
   const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
   const [matchRequests, setMatchRequests] = useState<Challenge[]>([]);
   const [loading, setLoading] = useState(true);
   const [successMessage, setSuccessMessage] = useState('');
   const [errorMessage, setErrorMessage] = useState('');
   const navigate = useNavigate();
   const [selectedJoinRequest, setSelectedJoinRequest] = useState<JoinRequest | null>(null);
   const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

   // ✅ KRİTİK DÜZELTME: useEffect ile fetchData çağrılıyor
   // Eski kodda bu useEffect tamamen eksikti - sayfa her zaman loading'de kalıyordu
   useEffect(() => {
      fetchData();

      // Socket.io gerçek zamanlı bildirim dinleyici
      const socket = (window as any).__socket;
      if (socket) {
         const handleRefresh = () => fetchData();
         socket.on('notification', handleRefresh);
         socket.on('newChallenge', handleRefresh);
         socket.on('joinRequest', handleRefresh);

         return () => {
            socket.off('notification', handleRefresh);
            socket.off('newChallenge', handleRefresh);
            socket.off('joinRequest', handleRefresh);
         };
      }
   }, []);

   const getCurrentUserId = () => {
      const token = localStorage.getItem('token');
      if (!token) return null;
      try {
         const payload = JSON.parse(atob(token.split('.')[1]));
         return payload.sub || payload.id || payload.userId;
      } catch {
         return null;
      }
   };

   const fetchData = async () => {
      try {
         setLoading(true);

         // Bildirimleri getir
         const notifResponse = await api.get('/notifications');
         const fetchedNotifications = notifResponse.data;
         setNotifications(fetchedNotifications);

         // Okunmamışları okundu olarak işaretle
         const unreadIds = fetchedNotifications.filter((n: any) => !n.read).map((n: any) => n.id);
         if (unreadIds.length > 0) {
            await Promise.all(unreadIds.map((id: string) => api.patch(`/notifications/${id}/read`)));
         }

         // Kullanıcının takımlarını getir
         const teamsResponse = await api.get('/teams');
         const myTeams = teamsResponse.data.filter((team: any) =>
            team.captainId === getCurrentUserId() ||
            team.captain?.id === getCurrentUserId()
         );

         // Her takım için katılma ve maç isteklerini getir
         const allJoinRequests: JoinRequest[] = [];
         const allMatchRequests: Challenge[] = [];

         for (const team of myTeams) {
            // Katılma istekleri
            try {
               const joinRes = await api.get(`/join-requests/team/${team.id}`);
               allJoinRequests.push(...joinRes.data);
            } catch (err) {
               console.error(`Katılma istekleri alınamadı (takım: ${team.id})`, err);
            }

            // Maç istekleri (gelen challenge'lar)
            try {
               const matchRes = await api.get(`/challenges/team/${team.id}/incoming`);
               allMatchRequests.push(...matchRes.data);
            } catch (err) {
               console.error(`Maç istekleri alınamadı (takım: ${team.id})`, err);
            }
         }

         setJoinRequests(allJoinRequests);
         setMatchRequests(allMatchRequests);

      } catch (error) {
         console.error('Bildirimler alınamadı:', error);
      } finally {
         setLoading(false);
      }
   };

   const handleAcceptJoinRequest = async (requestId: string) => {
      try {
         await api.patch(`/join-requests/${requestId}/accept`);
         await fetchData();
         setSuccessMessage('Katılma isteği kabul edildi! Oyuncu takıma eklendi.');
         setErrorMessage('');
      } catch (error: any) {
         console.error('Katılma isteği kabul edilemedi:', error);
         setErrorMessage(error.response?.data?.message || 'Kabul edilemedi.');
      }
   };

   const handleRejectJoinRequest = async (requestId: string) => {
      try {
         await api.patch(`/join-requests/${requestId}/reject`);
         await fetchData();
         setSuccessMessage('Katılma isteği reddedildi.');
         setErrorMessage('');
      } catch (error: any) {
         console.error('Katılma isteği reddedilemedi:', error);
         setErrorMessage(error.response?.data?.message || 'Reddedilemedi.');
      }
   };

   const handleAcceptChallenge = async (challengeId: string) => {
      try {
         await api.patch(`/challenges/${challengeId}/accept`);
         await fetchData();
         setSuccessMessage('Meydan okuma kabul edildi! Sohbet kanalı oluşturuluyor...');
         setErrorMessage('');
         setTimeout(() => navigate('/chat'), 1500);
      } catch (error: any) {
         console.error('Meydan okuma kabul edilemedi:', error);
         setErrorMessage(error.response?.data?.message || 'Kabul edilemedi.');
      }
   };

   const handleRejectChallenge = async (challengeId: string) => {
      try {
         await api.patch(`/challenges/${challengeId}/reject`);
         await fetchData();
         setSuccessMessage('Meydan okuma reddedildi.');
         setErrorMessage('');
      } catch (error: any) {
         console.error('Meydan okuma reddedilemedi:', error);
         setErrorMessage(error.response?.data?.message || 'Reddedilemedi.');
      }
   };

   const filteredJoinRequests = joinRequests.filter(r => r.status === 'PENDING');
   const filteredMatchRequests = matchRequests.filter(r => r.status === 'PENDING');

   // Filter REMATCH_PROPOSAL notifications (PENDING ones)
   const rematchProposals = notifications.filter(n => n.type === 'REMATCH_PROPOSAL');

   const handleAcceptRematchFromNotif = async (notification: Notification) => {
      const channelId = notification.metadata?.channelId;
      const matchAnnouncementId = notification.metadata?.matchAnnouncementId;
      if (!channelId || !matchAnnouncementId) {
         setErrorMessage('Teklif bilgileri eksik.');
         return;
      }
      try {
         const result = await api.post(`/chat/channels/${channelId}/accept-rematch`, {
            matchAnnouncementId
         });
         setSuccessMessage('Rövanş teklifi kabul edildi! Yeni sohbet kanalı oluşturuldu.');
         setErrorMessage('');
         setTimeout(() => navigate('/chat'), 1500);
      } catch (error: any) {
         console.error('Rövanş teklifi kabul edilemedi:', error);
         setErrorMessage(error.response?.data?.message || 'Kabul edilemedi.');
      }
   };

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

         {/* Tab Switcher - hepsi tek satırda */}
         <div className="flex p-1 bg-slate-800 rounded-xl mb-6 border border-slate-700">
            <button
               onClick={() => setActiveTab('ALL')}
               className={`flex-1 py-2.5 text-[10px] font-bold rounded-lg transition-all leading-tight ${activeTab === 'ALL'
                  ? 'bg-slate-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
                  }`}
            >
               HEPSİ{`\n(${notifications.length})`}
            </button>
            <button
               onClick={() => setActiveTab('MATCH_REQUESTS')}
               className={`flex-1 py-2.5 text-[10px] font-bold rounded-lg transition-all leading-tight ${activeTab === 'MATCH_REQUESTS'
                  ? 'bg-turf-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
                  }`}
            >
               MAÇ{`\nİSTEKLERİ (${filteredMatchRequests.length + rematchProposals.length})`}
            </button>
            <button
               onClick={() => setActiveTab('JOIN_REQUESTS')}
               className={`flex-1 py-2.5 text-[10px] font-bold rounded-lg transition-all leading-tight ${activeTab === 'JOIN_REQUESTS'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
                  }`}
            >
               KATILMA{`\nİSTEKLERİ (${filteredJoinRequests.length})`}
            </button>
         </div>

         {loading ? (
            <LoadingSpinner fullScreen text="Bildirimler Yükleniyor..." />
         ) : (
            <div className="space-y-4">

               {/* MAÇ İSTEKLERİ TAB */}
               {activeTab === 'MATCH_REQUESTS' && (
                  <>
                     {filteredMatchRequests.length === 0 && rematchProposals.length === 0 ? (
                        <div className="text-center py-12 opacity-50">
                           <Handshake className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                           <p className="text-slate-400 text-sm">Bekleyen maç isteği yok.</p>
                        </div>
                     ) : (
                        filteredMatchRequests.map(request => (
                           <div
                              key={request.id}
                              className="p-4 rounded-2xl border flex gap-4 items-center transition-all cursor-pointer group relative overflow-hidden bg-slate-800 border-slate-700 hover:border-turf-500/50 hover:bg-slate-800/80"
                           >
                              <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-turf-600/10 to-transparent pointer-events-none"></div>

                              <div
                                 className="relative cursor-pointer hover:scale-105 transition-transform"
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    if (request.fromTeamId) setSelectedTeamId(request.fromTeamId);
                                 }}
                              >
                                 <img
                                    src={request.fromTeam?.logoUrl || '/default-team-logo.png'}
                                    alt={request.fromTeam?.name || 'Rakip Takım'}
                                    className="w-16 h-16 rounded-full object-cover border-2 border-slate-600 group-hover:border-turf-500 transition-colors bg-slate-900"
                                 />
                              </div>
                              <div className="flex-1 min-w-0 relative z-10">
                                 <div className="flex justify-between items-start">
                                    <h3
                                       className="font-bold text-white text-lg truncate group-hover:text-turf-400 transition-colors cursor-pointer"
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          if (request.fromTeamId) setSelectedTeamId(request.fromTeamId);
                                       }}
                                    >
                                       {request.fromTeam?.name || 'Rakip Takım'}
                                    </h3>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                                       {new Date(request.createdAt).toLocaleDateString('tr-TR')}
                                    </span>
                                 </div>

                                 <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                    <Calendar className="w-3 h-3 text-turf-500" />
                                    <span className="text-white font-bold">
                                       {request.match ? `${new Date(request.match.date).toLocaleDateString('tr-TR')} ${request.match.time}` : 'Tarih Bilinmiyor'}
                                    </span>
                                 </div>

                                 {/* Saha ve işletme bilgisi */}
                                 {(request.match as any)?.pitch && (
                                    <div className="flex items-center gap-1 text-xs text-turf-400 mt-1 mb-1">
                                       <MapPin className="w-3 h-3 flex-shrink-0" />
                                       <span className="font-semibold truncate">
                                          {(request.match as any).pitch.business?.name
                                             ? `${(request.match as any).pitch.business.name} · ${(request.match as any).pitch.name}`
                                             : (request.match as any).pitch.name}
                                       </span>
                                    </div>
                                 )}

                                 {request.note && (
                                    <p className="text-xs text-slate-300 italic mb-1 line-clamp-1">"{request.note}"</p>
                                 )}

                                 <div className="flex gap-2">
                                    <button
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          handleAcceptChallenge(request.id);
                                       }}
                                       className="flex-1 py-2 bg-turf-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20"
                                    >
                                       <Check className="w-3 h-3" /> Kabul Et
                                    </button>
                                    <button
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          handleRejectChallenge(request.id);
                                       }}
                                       className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-red-900/50 hover:text-red-400 transition-colors"
                                    >
                                       <X className="w-3 h-3" /> Reddet
                                    </button>
                                 </div>
                              </div>
                           </div>
                        ))
                     )}

                      {/* Rövanş Teklifleri */}
                      {rematchProposals.length > 0 && (
                         <>
                            {filteredMatchRequests.length > 0 && (
                               <div className="border-t border-slate-700 my-4 pt-2">
                                  <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                     <Swords className="w-4 h-4 text-turf-500" /> Rövanş Teklifleri
                                  </p>
                               </div>
                            )}
                            {rematchProposals.map(notif => (
                               <div key={notif.id} className="p-4 rounded-2xl border flex gap-4 items-start transition-all relative overflow-hidden bg-slate-800 border-slate-700 hover:border-turf-500/50">
                                  <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-turf-600/10 to-transparent pointer-events-none"></div>
                                  <div className="w-12 h-12 rounded-full bg-turf-500/20 flex items-center justify-center flex-shrink-0">
                                     <Swords className="w-6 h-6 text-turf-500" />
                                  </div>
                                  <div className="flex-1 min-w-0 relative z-10">
                                     <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-white text-base">{notif.metadata?.proposerTeamName || 'Rövanş Teklifi'}</h3>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{new Date(notif.createdAt).toLocaleDateString('tr-TR')}</span>
                                     </div>
                                     <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                        <Calendar className="w-3 h-3 text-turf-500" />
                                        <span className="text-white font-bold">
                                           {notif.metadata?.matchDate && notif.metadata?.matchTime
                                              ? `${new Date(notif.metadata.matchDate).toLocaleDateString('tr-TR')} ${notif.metadata.matchTime}`
                                              : 'Tarih Bilinmiyor'}
                                        </span>
                                     </div>
                                     {(notif.metadata?.businessName || notif.metadata?.pitchName) && (
                                        <div className="flex items-center gap-1 text-xs text-turf-400 mt-1 mb-2">
                                           <MapPin className="w-3 h-3 flex-shrink-0" />
                                           <span className="font-semibold truncate">{notif.metadata.businessName} · {notif.metadata.pitchName}</span>
                                        </div>
                                     )}
                                     <div className="flex gap-2 mt-2">
                                        <button onClick={() => handleAcceptRematchFromNotif(notif)} className="flex-1 py-2 bg-turf-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20">
                                           <Check className="w-3 h-3" /> Kabul Et
                                        </button>
                                        <button onClick={() => navigate('/chat', { state: { channelId: notif.metadata?.channelId } })} className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-900/50 hover:text-blue-400 transition-colors">
                                           <MessageSquare className="w-3 h-3" /> Sohbete Git
                                        </button>
                                     </div>
                                  </div>
                               </div>
                            ))}
                         </>
                      )}
                  </>
               )}

               {/* KATILMA İSTEKLERİ TAB */}
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
                              <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-blue-600/10 to-transparent pointer-events-none"></div>

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

               {/* HEPSİ TAB */}
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
                                    notif.type === 'REMATCH_PROPOSAL' ? 'bg-purple-500' :
                                       'bg-yellow-500'
                                 }`}></div>

                              <div className="p-4 pl-6">
                                 <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-white text-lg">
                                       {notif.type === 'JOIN_REQUEST' && 'Yeni Katılma İsteği'}
                                       {notif.type === 'CHALLENGE' && 'Yeni Meydan Okuma'}
                                       {notif.type === 'MATCH_RESULT' && 'Maç Sonucu'}
                                       {notif.type === 'REMATCH_PROPOSAL' && '📩 Yeni Maç Teklifi!'}
                                       {notif.type === 'SYSTEM' && (notif as any).title}
                                       {notif.type === 'MATCH_REMINDER' && (notif as any).title}
                                       {notif.type === 'RESERVATION_REQUEST' && (notif as any).title}
                                    </h3>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                                       {new Date(notif.createdAt).toLocaleDateString('tr-TR')}
                                    </span>
                                 </div>

                                 <p className="text-sm text-slate-300 mb-3 leading-relaxed">
                                    {(notif as any).title && <span className="block font-bold text-white mb-1">{(notif as any).title}</span>}
                                    {(notif as any).message || 'Bildirim detayları'}
                                 </p>

                                 {/* Challenge Aksiyonları */}
                                 {notif.type === 'CHALLENGE' && (notif.metadata?.challengeId || notif.relatedId) && !notif.metadata?.isChatRedirect && (
                                    (() => {
                                       const date = notif.metadata?.matchDate;
                                       const time = notif.metadata?.matchTime;
                                       let isExpired = false;

                                       if (date && time) {
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

                                 {/* Rematch Proposal Actions */}
                                 {notif.type === 'REMATCH_PROPOSAL' && notif.metadata?.matchAnnouncementId && (
                                    <div className="flex gap-2 mt-3">
                                       <button
                                          onClick={() => handleAcceptRematchFromNotif(notif)}
                                          className="flex-1 py-2 bg-turf-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20"
                                       >
                                          <Check className="w-3 h-3" /> Kabul Et
                                       </button>
                                       <button
                                          onClick={() => navigate('/chat', { state: { channelId: notif.metadata?.channelId } })}
                                          className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
                                       >
                                          <MessageSquare className="w-3 h-3" /> Sohbete Git
                                       </button>
                                    </div>
                                 )}

                                 {/* Sohbet Yönlendirme */}
                                 {notif.metadata?.isChatRedirect && (
                                    (() => {
                                       const date = notif.metadata?.matchDate;
                                       const time = notif.metadata?.matchTime;
                                       let isExpired = false;

                                       if (date && time) {
                                          const dateStr = typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0];
                                          const matchDate = new Date(`${dateStr}T${time}`);
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

         {/* Maç İstekleri için Takım Detay Modal */}
         {selectedTeamId && (
            <TeamDetailModal
               isOpen={!!selectedTeamId}
               onClose={() => setSelectedTeamId(null)}
               teamId={selectedTeamId}
               currentUserId={getCurrentUserId()}
            />
         )}

      </div>
   );
};
