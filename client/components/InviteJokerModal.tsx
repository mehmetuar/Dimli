

import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Send, CheckCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

interface Props {
   isOpen: boolean;
   onClose: () => void;
   joker: any | null;
}

export const InviteJokerModal: React.FC<Props> = ({ isOpen, onClose, joker }) => {
   if (!isOpen || !joker) return null;

   const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
   const [isSent, setIsSent] = useState(false);
   const [isSending, setIsSending] = useState(false);
   const [inviteNote, setInviteNote] = useState('');
   const [myMatches, setMyMatches] = useState<any[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [sentMatchIds, setSentMatchIds] = useState<Set<string>>(new Set());

   useEffect(() => {
      if (!isOpen) return;
      setIsLoading(true);
      api.get('/chat/channels')
         .then(res => {
            const channels: any[] = res.data || [];
            // Filter MATCH_GROUP channels where reservation is APPROVED (Kesinleşti) or PENDING
            const matchChannels = channels.filter((c: any) =>
               c.type === 'MATCH_GROUP' &&
               c.relatedMatchId && // must have a match announcement
               c.reservation &&
               (c.reservation.status === 'APPROVED' || c.reservation.status === 'PENDING')
            );
            setMyMatches(matchChannels);
         })
         .catch(console.error)
         .finally(() => setIsLoading(false));
   }, [isOpen]);

   const handleSendInvite = async () => {
      if (!selectedMatchId || isSending) return;
      setIsSending(true);
      try {
         await api.post('/notifications/joker-invite', {
            jokerId: joker?.id,
            // Use the MatchAnnouncement ID, not the chat channel ID
            matchId: selectedMatchId,
            note: inviteNote
         });
         // Mark as sent so the button stays disabled
         setSentMatchIds(prev => new Set(prev).add(selectedMatchId));
         setIsSent(true);
         setTimeout(() => {
            setIsSent(false);
            onClose();
            setInviteNote('');
            setSelectedMatchId(null);
         }, 2000);
      } catch (error: any) {
         console.error('Failed to send joker invite:', error);
         alert(error.response?.data?.message || 'Davet gönderilemedi.');
      } finally {
         setIsSending(false);
      }
   };

   const jokerName = joker?.full_name || joker?.username || joker?.name || 'Joker';
   const jokerAvatar = joker?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(jokerName)}&background=1a2e35&color=4ade80&size=80`;

   return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
         <div className="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 p-6 relative shadow-2xl">
            <button
               onClick={onClose}
               className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
               <X className="w-6 h-6" />
            </button>

            {isSent ? (
               <div className="text-center py-8">
                  <div className="w-20 h-20 bg-turf-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce shadow-neon">
                     <CheckCircle className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-wide">DAVET İLETİLDİ!</h3>
                  <p className="text-slate-400 mt-2 text-sm">
                     {jokerName} daveti kabul ettiğinde bildirim alacaksın.
                  </p>
               </div>
            ) : (
               <>
                  <div className="text-center mb-6">
                     <div className="w-20 h-20 mx-auto rounded-full p-1 bg-gradient-to-r from-turf-500 to-blue-500 mb-3">
                        <img src={jokerAvatar} className="w-full h-full rounded-full object-cover border-4 border-slate-800" alt={jokerName} />
                     </div>
                     <h3 className="text-xl font-bold text-white">
                        <span className="text-turf-500">{jokerName}</span> için Maç Seç
                     </h3>
                     <p className="text-xs text-slate-400 mt-1">Hangi maç için desteğe ihtiyacın var?</p>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto mb-6 pr-1">
                     {isLoading ? (
                        <div className="flex justify-center py-4">
                           <Loader2 className="w-6 h-6 text-turf-500 animate-spin" />
                        </div>
                     ) : myMatches.length > 0 ? (
                        myMatches.map(channel => {
                           const res = channel.reservation;
                           const dateStr = res?.slotTime
                              ? new Date(res.slotTime).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })
                              : 'Tarih yok';
                           const timeStr = res?.slotTime
                              ? new Date(res.slotTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                              : '';
                           const pitchName = channel.pitch?.name || channel.name || 'Maç';
                           return (
                              <div
                                 key={channel.id}
                                 onClick={() => setSelectedMatchId(channel.relatedMatchId)}
                                 className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${selectedMatchId === channel.relatedMatchId
                                    ? 'bg-turf-900/30 border-turf-500'
                                    : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                                    }`}
                              >
                                 <div className="bg-slate-800 p-2 rounded-lg">
                                    <Calendar className={`w-5 h-5 ${selectedMatchId === channel.relatedMatchId ? 'text-turf-500' : 'text-slate-400'}`} />
                                 </div>
                                 <div className="flex-1">
                                    <div className="text-white font-bold text-sm">{dateStr}</div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                       <MapPin className="w-3 h-3" /> {pitchName}
                                    </div>
                                 </div>
                                 <div className="text-xs font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded">
                                    {timeStr}
                                 </div>
                              </div>
                           );
                        })
                     ) : (
                        <div className="text-center py-4 bg-slate-900 rounded-xl border border-dashed border-slate-700">
                           <p className="text-slate-500 text-sm">Aktif maç ilanınız bulunmuyor.</p>
                        </div>
                     )}
                  </div>

                  <div className="mb-6">
                     <textarea
                        value={inviteNote}
                        onChange={(e) => setInviteNote(e.target.value)}
                        placeholder="Davet Notu (İsteğe Bağlı)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-turf-500 transition-colors resize-none placeholder-slate-500 shadow-inner"
                        rows={2}
                     />
                  </div>

                  <button
                     onClick={handleSendInvite}
                     disabled={!selectedMatchId || isSending || (selectedMatchId !== null && sentMatchIds.has(selectedMatchId))}
                     className="w-full bg-turf-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3.5 rounded-xl hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20 flex items-center justify-center gap-2"
                  >
                     {isSending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Gönderiliyor...</>
                     ) : selectedMatchId && sentMatchIds.has(selectedMatchId) ? (
                        <><CheckCircle className="w-4 h-4" /> İstek Gönderildi</>
                     ) : (
                        <><Send className="w-4 h-4" /> Davet Gönder</>
                     )}
                  </button>
               </>
            )}
         </div>
      </div>
   );
};