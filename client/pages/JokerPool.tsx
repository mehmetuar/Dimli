

import React, { useState } from 'react';
import { MOCK_JOKERS, MOCK_PITCHES, CURRENT_USER, MOCK_CHANNELS } from '../constants';
import { Position, Player, ChatChannel } from '../types';
import { MapPin, MessageCircle, X, TrendingUp, Star, Shield, UserPlus, Zap, Handshake, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InviteJokerModal } from '../components/InviteJokerModal';
import { JokerProfileModal } from '../components/JokerProfileModal';

export const JokerPool: React.FC = () => {
   const [selectedJoker, setSelectedJoker] = useState<Player | null>(null);
   const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
   const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

   // Local state to simulate live updates for the current user in this session
   const [currentUserData, setCurrentUserData] = useState<Player>(CURRENT_USER);

   const navigate = useNavigate();

   const handleSendMessage = (joker: Player) => {
      // 1. Check if a channel with this Joker already exists
      let channel = MOCK_CHANNELS.find(c => c.type === 'DM' && c.participantId === joker.id);

      // 2. If not, simulate creating one (in memory)
      if (!channel) {
         channel = {
            id: `dm-joker-${joker.id}`,
            type: 'DM',
            name: joker.name,
            avatarUrl: joker.avatarUrl,
            lastMessage: 'Sohbet başlatıldı',
            timestamp: 'Şimdi',
            unreadCount: 0,
            participantId: joker.id
         };
         MOCK_CHANNELS.unshift(channel); // Add to top
      }

      // 3. Navigate to Chat page with the channel ID in state
      navigate('/chat', { state: { channelId: channel.id } });
   };

   const openInviteModal = () => {
      setIsInviteModalOpen(true);
   };

   const handleSaveProfile = (data: any) => {
      // Simulate API update
      const updatedUser = {
         ...currentUserData,
         ...data
      };
      setCurrentUserData(updatedUser);
      // Update global mock for consistency in this session
      Object.assign(CURRENT_USER, updatedUser);

      setIsProfileModalOpen(false);
   };

   // Combine Mock Jokers with Current User if they are active
   const allJokers = [...MOCK_JOKERS];

   // Check if current user is already in the list (mock prevention)
   const isUserInList = allJokers.some(j => j.id === currentUserData.id);

   // If user is active and not in list, add them temporarily for display
   if (currentUserData.isJoker && !isUserInList) {
      allJokers.unshift(currentUserData);
   } else if (!currentUserData.isJoker && isUserInList) {
      // If user turned off joker mode, ensure they are removed from display list
      // (For this mock we just filter below)
   }

   // Filter: Only show Active Jokers
   const visibleJokers = allJokers.filter(j => j.isJoker);

   // --- SUB-COMPONENT: JOKER DETAIL MODAL (FUT CARD STYLE) ---
   const JokerDetailModal = () => {
      if (!selectedJoker) return null;

      // Resolve favorite pitches
      const favoritePitches = selectedJoker.favoritePitchIds?.map(id =>
         MOCK_PITCHES.find(p => p.id === id)
      ).filter(Boolean);

      const isMe = selectedJoker.id === currentUserData.id;

      return (
         <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/95 backdrop-blur-md animate-fade-in overflow-y-auto py-10">
            {/* Close Button */}
            <button
               onClick={() => setSelectedJoker(null)}
               className="fixed top-12 right-4 bg-white/10 p-3 rounded-full text-white hover:bg-red-600 transition-colors z-50 backdrop-blur"
            >
               <X className="w-6 h-6" />
            </button>

            <div className="w-full max-w-sm relative">
               {/* Card Container */}
               <div className="relative bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 rounded-[2rem] overflow-hidden border-[3px] border-yellow-500/30 shadow-[0_0_40px_rgba(234,179,8,0.15)]">

                  {/* Decorative Shine */}
                  <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent z-0"></div>

                  {/* Card Header */}
                  <div className="relative z-10 pt-6 px-6 pb-0 flex justify-between items-start">
                     <div className="flex flex-col pt-4">
                        <span className="text-xl font-bold text-slate-300 uppercase tracking-widest">{selectedJoker.position}</span>
                        <div className="mt-2 flex items-center gap-1">
                           <img src="https://flagcdn.com/w40/tr.png" className="w-6 h-4 rounded shadow" alt="TR" />
                        </div>
                     </div>
                     <div className="w-40 h-40 relative -mr-4 -mt-2">
                        <img
                           src={selectedJoker.avatarUrl}
                           className="w-full h-full object-cover rounded-full border-4 border-slate-800/50 shadow-2xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"
                           alt={selectedJoker.name}
                        />
                     </div>
                  </div>

                  {/* Name */}
                  <div className="relative z-10 text-center mt-6 mb-4">
                     <h2 className="font-sport font-black text-4xl text-white uppercase italic tracking-tighter drop-shadow-md">
                        {selectedJoker.name}
                     </h2>
                     <div className="flex justify-center items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wide">
                        <MapPin className="w-3 h-3 text-turf-500" /> {selectedJoker.location}
                     </div>
                  </div>

                  {/* Info Grid */}
                  <div className="relative z-10 px-6 pb-6">
                     <div className="grid grid-cols-2 gap-4 mb-6">
                        {/* Age */}
                        <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col items-center justify-center">
                           <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">YAŞ</span>
                           <span className="font-sport text-2xl font-black text-white">
                              {selectedJoker.birthDate ? new Date().getFullYear() - new Date(selectedJoker.birthDate).getFullYear() : '-'}
                           </span>
                        </div>
                        {/* Foot */}
                        <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col items-center justify-center">
                           <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">AYAK</span>
                           <span className="font-sport text-xl font-black text-white uppercase">{selectedJoker.foot || '-'}</span>
                        </div>
                        {/* Position */}
                        <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col items-center justify-center">
                           <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">MEVKİ</span>
                           <span className="font-sport text-lg font-black text-white uppercase">{selectedJoker.position}</span>
                        </div>
                        {/* Secondary Position */}
                        <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col items-center justify-center">
                           <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">YAN MEVKİ</span>
                           <span className="font-sport text-lg font-black text-slate-300 uppercase">{selectedJoker.secondaryPosition || '-'}</span>
                        </div>
                     </div>

                     {/* Extra Info: Form & Sharing Status */}
                     <div className="flex gap-3 mb-6">
                        <div className="flex-1 bg-black/40 rounded-xl p-3 border border-white/5">
                           <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Son 5 Maç</div>
                           <div className="flex gap-1">
                              {selectedJoker.form?.map((result, i) => (
                                 <span key={i} className={`w-4 h-4 rounded flex items-center justify-center text-[8px] font-black ${result === 'W' ? 'bg-green-500 text-black' :
                                    result === 'L' ? 'bg-red-500 text-white' : 'bg-gray-500 text-white'
                                    }`}>
                                    {result}
                                 </span>
                              ))}
                           </div>
                        </div>
                        <div className={`flex-1 rounded-xl p-3 border flex flex-col justify-center items-center ${selectedJoker.sharesFee ? 'bg-turf-900/30 border-turf-500/30' : 'bg-slate-800 border-slate-700'}`}>
                           <Handshake className={`w-5 h-5 mb-1 ${selectedJoker.sharesFee ? 'text-turf-500' : 'text-slate-500'}`} />
                           <div className={`text-[10px] uppercase font-bold text-center leading-none ${selectedJoker.sharesFee ? 'text-turf-300' : 'text-slate-500'}`}>
                              {selectedJoker.sharesFee ? 'Ücrete Ortak' : 'Misafir'}
                           </div>
                        </div>
                     </div>

                     {/* Favorite Pitches */}
                     <div className="mb-6">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                           <Star className="w-3 h-3 text-yellow-500" /> Oynadığı Sahalar
                        </h3>
                        <div className="flex flex-wrap gap-2">
                           {favoritePitches && favoritePitches.length > 0 ? (
                              favoritePitches.map(pitch => (
                                 <span key={pitch?.id} className="text-xs font-bold text-slate-300 bg-white/5 px-2 py-1 rounded border border-white/10">
                                    {pitch?.name}
                                 </span>
                              ))
                           ) : (
                              <span className="text-xs text-slate-500 italic">Saha tercihi yok.</span>
                           )}
                        </div>
                     </div>

                     {/* Action Buttons */}
                     {!isMe && (
                        <div className="grid grid-cols-5 gap-2">
                           <button
                              onClick={() => handleSendMessage(selectedJoker)}
                              className="col-span-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl flex items-center justify-center transition-colors"
                           >
                              <MessageCircle className="w-6 h-6" />
                           </button>
                           <button
                              onClick={openInviteModal}
                              className="col-span-4 bg-gradient-to-r from-turf-600 to-green-500 text-white font-black text-lg uppercase italic py-3 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-turf-500/30 flex items-center justify-center gap-2"
                           >
                              <UserPlus className="w-5 h-5" /> Maça Davet Et
                           </button>
                        </div>
                     )}
                     {isMe && (
                        <button
                           onClick={() => { setSelectedJoker(null); setIsProfileModalOpen(true); }}
                           className="w-full bg-slate-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-600"
                        >
                           <Edit className="w-4 h-4" /> Profili Düzenle
                        </button>
                     )}

                  </div>
               </div>
            </div>
         </div>
      );
   };

   return (
      <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto min-h-screen bg-pitch">
         <JokerDetailModal />

         <InviteJokerModal
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
            joker={selectedJoker}
         />

         <JokerProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            onSave={handleSaveProfile}
         />

         <header className="mb-6 flex justify-between items-end">
            <div>
               <h1 className="font-sport font-black text-4xl text-white uppercase italic tracking-tighter">JOKER <span className="text-turf-500">HAVUZU</span></h1>
               <p className="text-slate-400 text-sm">Eksik oyuncu mu var? Scout et ve çağır.</p>
            </div>
            <button
               onClick={() => setIsProfileModalOpen(true)}
               className={`${currentUserData.isJoker ? 'bg-slate-800 border-slate-600' : 'bg-turf-600 border-turf-500 shadow-neon'} border text-white px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105`}
            >
               {currentUserData.isJoker ? 'Profilini Düzenle' : 'Profilini Ekle'}
            </button>
         </header>

         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleJokers.map((player) => (
               <div
                  key={player.id}
                  onClick={() => setSelectedJoker(player)}
                  className={`p-4 rounded-2xl border flex gap-4 items-center transition-all cursor-pointer group relative overflow-hidden ${player.id === currentUserData.id ? 'bg-slate-800/80 border-turf-500/50' : 'bg-slate-800 border-slate-700 hover:border-turf-500/50 hover:bg-slate-800/80'}`}
               >
                  {/* Highlight Effect */}
                  <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-black/20 to-transparent pointer-events-none"></div>

                  <div className="relative">
                     <img src={player.avatarUrl} alt={player.name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-600 group-hover:border-turf-500 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0 relative z-10">
                     <h3 className="font-bold text-white text-lg truncate group-hover:text-turf-400 transition-colors">
                        {player.name} {player.id === currentUserData.id && '(Sen)'}
                     </h3>
                     <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5 mb-2">
                        <MapPin className="w-3 h-3 text-turf-600" /> {player.location}
                     </div>
                     <div className="flex justify-between items-center">
                        <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${player.position === Position.GK ? 'bg-yellow-500/20 text-yellow-500' : 'bg-slate-700 text-slate-300'}`}>
                           {player.position}
                        </span>

                        {player.sharesFee && (
                           <div className="flex items-center gap-1 text-[10px] font-bold text-turf-500 bg-turf-900/20 px-2 py-1 rounded-full">
                              <Handshake className="w-3 h-3" /> Ortak
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            ))}
            {visibleJokers.length === 0 && (
               <div className="col-span-2 text-center py-10 text-slate-500">
                  Şu an aktif Joker bulunmuyor. İlk sen ol!
               </div>
            )}
         </div>
      </div>
   );
};