

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, MapPin, Send, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { KeyboardAwareModal } from './KeyboardAwareModal';
import { getErrorMessage } from '../../utils/apiError';
import { emitTourEvent } from '../../services/tourStore';
import { isDemoId, getDemoInviteChannel } from '../../pages/customer/PitchBooking/demo/demoTourData';

interface Props {
   isOpen: boolean;
   onClose: () => void;
   joker: any | null;
}

export const InviteJokerModal: React.FC<Props> = (props) => {
   if (!props.isOpen || !props.joker) return null;
   return <InviteJokerModalContent {...props} />;
};

const InviteJokerModalContent: React.FC<Props> = ({ isOpen, onClose, joker }) => {
   // Tanıtım turu demo jokeri ("Oyuncu 1"): SUNUCUYA HİÇ GİDİLMEZ — kanal listesi
   // sahte "Dimli Halı Saha" maçıyla beslenir, davet POST'u atlanır. Not: davet
   // POST'unun gövdesindeki jokerId api.ts URL-interceptor'ına takılmaz, bu yüzden
   // bu dal zorunludur.
   const isDemo = isDemoId(joker?.id);
   const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
   const [isSent, setIsSent] = useState(false);
   const [isSending, setIsSending] = useState(false);
   const [inviteNote, setInviteNote] = useState('');
   const [myMatches, setMyMatches] = useState<any[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [sentMatchIds, setSentMatchIds] = useState<Set<string>>(new Set());
   const [me, setMe] = useState<any>(null);
   const [errorMessage, setErrorMessage] = useState('');

   // Confirmation Modal State
   const [showCancelConfirm, setShowCancelConfirm] = useState(false);

   useEffect(() => {
      if (!isOpen || !joker) return;
      setIsLoading(true);
      setErrorMessage('');
      setSelectedMatchId(null);

      if (isDemo) {
         setMyMatches([getDemoInviteChannel()]);
         setSentMatchIds(new Set());
         setIsLoading(false);
         return;
      }

      Promise.all([
         api.get('/chat/channels'),
         api.get(`/notifications/sent-joker-invites/${joker.id}`),
         api.get('/users/me')
      ])
         .then(([channelsRes, invitesRes, meRes]) => {
            const channels: any[] = channelsRes.data || [];
            const meData = meRes.data;
            setMe(meData);
            const myTeam = meData?.team;
            // Yalnız kaptanı/yardımcı kaptanı olduğum takımın maçları davet
            // gönderme yetkisi verir. Joker olarak katıldığım maçlar (isJoker) ve
            // yetkisi olmadığım maçlar listeden tamamen çıkarılır.
            const iAmLeader =
               !!myTeam &&
               (myTeam.captainId === meData?.id ||
                  (myTeam.viceCaptainIds || []).includes(meData?.id));
            const now = new Date();
            // Filter MATCH_GROUP channels where reservation is APPROVED (Kesinleşti) or PENDING
            // and the match date is in the future
            const matchChannels = channels.filter((c: any) => {
               if (
                  c.type !== 'MATCH_GROUP' ||
                  !c.relatedMatchId ||
                  !c.reservation
               ) return false;

               const isStatusValid = c.reservation.status === 'APPROVED' || c.reservation.status === 'PENDING';
               const isFutureMatch = new Date(c.reservation.slotTime) > now;

               const iLeadOneTeam =
                  !c.isJoker &&
                  iAmLeader &&
                  (myTeam.id === c.reservation.teamId ||
                     myTeam.id === c.reservation.opponentTeamId);

               return isStatusValid && isFutureMatch && iLeadOneTeam;
            });
            setMyMatches(matchChannels);

            const sentIds = invitesRes.data || [];
            setSentMatchIds(new Set(sentIds));
         })
         .catch(console.error)
         .finally(() => setIsLoading(false));
   }, [isOpen, joker]);

   // Seçili joker maçın iki takımından birinin oyuncusuysa veya zaten maç
   // sohbetindeyse o maça davet edilemez → satır soluk + neden etiketi.
   const getIneligibleReason = (channel: any): string | null => {
      const res = channel.reservation;
      if (
         joker?.teamId &&
         (joker.teamId === res?.teamId || joker.teamId === res?.opponentTeamId)
      ) {
         return joker.teamId === me?.team?.id
            ? 'Zaten takımının oyuncusu'
            : 'Rakip takımın oyuncusu';
      }
      if (
         channel.participants?.some(
            (p: any) => p.userId === joker?.id && !p.deletedAt
         )
      ) {
         return 'Zaten maç sohbetinde';
      }
      return null;
   };

   const executeCancelInvite = async () => {
      if (!selectedMatchId) return;
      setIsSending(true);
      try {
         await api.delete(`/notifications/joker-invite/${joker?.id}/${selectedMatchId}`);
         setSentMatchIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(selectedMatchId);
            return newSet;
         });
         setShowCancelConfirm(false);
      } catch (error: any) {
         console.error('Failed to cancel joker invite:', error);
         setShowCancelConfirm(false);
         setErrorMessage(getErrorMessage(error, 'İptal işlemi başarısız.'));
      } finally {
         setIsSending(false);
      }
   };

   const executeSendInvite = async () => {
      if (!selectedMatchId) return;
      // Demo: POST yok — gerçek başarı ekranı gösterilir, kapanınca tur ilerler
      if (isDemo) {
         setIsSent(true);
         setTimeout(() => {
            setIsSent(false);
            onClose();
            emitTourEvent('demo-joker-invited');
         }, 1600);
         return;
      }
      setIsSending(true);
      setErrorMessage('');
      try {
         await api.post('/notifications/joker-invite', {
            jokerId: joker?.id,
            matchId: selectedMatchId,
            note: inviteNote
         });
         setSentMatchIds(prev => new Set(prev).add(selectedMatchId));
         setIsSent(true);
         setTimeout(() => {
            setIsSent(false);
            onClose();
            setInviteNote('');
            setSelectedMatchId(null);
         }, 2000);
      } catch (error: any) {
         console.error('Failed to toggle joker invite:', error);
         setErrorMessage(getErrorMessage(error, 'İşlem başarısız.'));
      } finally {
         setIsSending(false);
      }
   };

   const handleToggleInvite = async () => {
      if (!selectedMatchId || isSending) return;

      const isCanceling = sentMatchIds.has(selectedMatchId);

      if (isCanceling) {
         setShowCancelConfirm(true);
         return;
      }

      executeSendInvite();
   };

   const jokerName = joker?.full_name || joker?.username || joker?.name || 'Joker';
   const jokerAvatar = joker?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(jokerName)}&background=1a2e35&color=4ade80&size=80`;

   return (
      <>
      <KeyboardAwareModal
         isOpen={isOpen}
         portalToBody
         zClassName="z-[80]"
         panelClassName="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 shadow-2xl"
         header={
            <div className="relative">
               <button
                  onClick={onClose}
                  className="absolute top-4 right-4 z-10 text-slate-400 hover:text-white"
               >
                  <X className="w-6 h-6" />
               </button>
            </div>
         }
      >
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

                  {errorMessage && (
                     <div className="mb-4 px-4 py-3 rounded-xl bg-red-900/40 border border-red-500/40 text-red-300 text-sm flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{errorMessage}</span>
                     </div>
                  )}

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
                           const ineligibleReason = getIneligibleReason(channel);
                           const isDisabled = !!ineligibleReason;
                           const isSelected = selectedMatchId === channel.relatedMatchId;
                           return (
                              <div
                                 key={channel.id}
                                 data-tour-id={isDemoId(channel.relatedMatchId) ? 'joker-demo-match' : undefined}
                                 onClick={() => {
                                    if (isDisabled) return;
                                    setErrorMessage('');
                                    setSelectedMatchId(channel.relatedMatchId);
                                 }}
                                 className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${isDisabled
                                    ? 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed'
                                    : isSelected
                                       ? 'bg-turf-900/30 border-turf-500 cursor-pointer'
                                       : 'bg-slate-900 border-slate-700 hover:border-slate-500 cursor-pointer'
                                    }`}
                              >
                                 <div className="bg-slate-800 p-2 rounded-lg">
                                    <Calendar className={`w-5 h-5 ${isSelected && !isDisabled ? 'text-turf-500' : 'text-slate-400'}`} />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <div className="text-white font-bold text-sm">{dateStr}</div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                       <MapPin className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{pitchName}</span>
                                    </div>
                                    {ineligibleReason && (
                                       <div className="text-[11px] text-amber-500/90 mt-0.5 flex items-center gap-1">
                                          <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {ineligibleReason}
                                       </div>
                                    )}
                                 </div>
                                 <div className="text-xs font-bold text-slate-400 bg-slate-800 px-2 py-1 rounded flex-shrink-0">
                                    {timeStr}
                                 </div>
                              </div>
                           );
                        })
                     ) : (
                        <div className="text-center py-4 bg-slate-900 rounded-xl border border-dashed border-slate-700">
                           <p className="text-slate-500 text-sm">Kaptanı veya yardımcı kaptanı olduğun takımın yaklaşan maçı yok.</p>
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
                     data-tour-id="joker-send-invite"
                     onClick={handleToggleInvite}
                     disabled={!selectedMatchId || isSending}
                     className={`w-full font-bold py-3.5 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 text-white ${selectedMatchId && sentMatchIds.has(selectedMatchId)
                        ? 'bg-slate-700 hover:bg-red-900/50 hover:text-red-400 shadow-slate-900/20 text-slate-300'
                        : 'bg-turf-600 hover:bg-turf-500 shadow-turf-600/20 disabled:bg-slate-700 disabled:text-slate-500 text-white'
                        }`}
                  >
                     {isSending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Bekleyiniz...</>
                     ) : selectedMatchId && sentMatchIds.has(selectedMatchId) ? (
                        <><X className="w-4 h-4" /> İsteği İptal Et</>
                     ) : (
                        <><Send className="w-4 h-4" /> Davet Gönder</>
                     )}
                  </button>
               </>
            )}
      </KeyboardAwareModal>

         {/* Cancel Confirmation Modal — §35: fixed overlay createPortal(document.body) */}
         {showCancelConfirm && createPortal(
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
               <div className="bg-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-700">
                  <h3 className="text-xl font-bold text-white text-center mb-2">Daveti İptal Et</h3>
                  <p className="text-slate-400 text-center text-sm mb-6">
                     Bu maça gönderdiğiniz daveti iptal etmek istediğinize emin misiniz?
                  </p>

                  <div className="flex gap-3">
                     <button
                        onClick={() => setShowCancelConfirm(false)}
                        disabled={isSending}
                        className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition disabled:opacity-50"
                     >
                        Vazgeç
                     </button>
                     <button
                        onClick={executeCancelInvite}
                        disabled={isSending}
                        className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/30 hover:bg-red-600 hover:shadow-red-600/40 transition flex items-center justify-center disabled:opacity-50"
                     >
                        {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Evet, İptal Et'}
                     </button>
                  </div>
               </div>
            </div>,
            document.body
         )}
      </>
   );
};