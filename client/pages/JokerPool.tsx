
import React, { useState, useEffect } from 'react';
import { Position } from '../types';
import { MapPin, X, Star, Shield, UserPlus, Handshake, Edit, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InviteJokerModal } from '../components/InviteJokerModal';
import { JokerProfileModal } from '../components/JokerProfileModal';
import { LocationFilter, LocationFilterModal } from '../components/LocationFilterModal';
import { calculateDistance } from '../utils/location';
import api from '../services/api';

export const JokerPool: React.FC = () => {
   const [jokers, setJokers] = useState<any[]>([]);
   const [currentUser, setCurrentUser] = useState<any>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [selectedJoker, setSelectedJoker] = useState<any | null>(null);
   const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
   const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

   // Location Filter State
   const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
   const [locationFilter, setLocationFilter] = useState<LocationFilter>({ type: 'ALL' });

   const navigate = useNavigate();

   // Fetch current user
   useEffect(() => {
      api.get('/users/me').then(res => setCurrentUser(res.data)).catch(console.error);
   }, []);

   // Fetch jokers from backend
   const fetchJokers = async () => {
      setIsLoading(true);
      try {
         const params: Record<string, string> = {};
         if (locationFilter.type === 'DISTRICT' && locationFilter.value) {
            params.district = locationFilter.value;
         }
         const res = await api.get('/users/jokers', { params });
         setJokers(res.data);
      } catch (err) {
         console.error('Failed to fetch jokers:', err);
      } finally {
         setIsLoading(false);
      }
   };

   useEffect(() => {
      fetchJokers();
   }, [locationFilter]);

   // Client-side nearby filter when NEARBY location type is selected
   const visibleJokers = locationFilter.type === 'NEARBY' && locationFilter.coords
      ? jokers.filter(j => {
         if (!j.coordinates) return false;
         const dist = calculateDistance(
            locationFilter.coords!.lat,
            locationFilter.coords!.lng,
            j.coordinates.lat,
            j.coordinates.lng
         );
         return dist <= (locationFilter.radius || 60);
      })
      : jokers;

   const handleSaveProfile = async (data: any) => {
      try {
         const res = await api.patch('/users/me', data);
         setCurrentUser(res.data);
         setIsProfileModalOpen(false);
         // Re-fetch the list so the user's card appears/disappears from pool
         fetchJokers();
      } catch (err) {
         console.error('Failed to update profile:', err);
         alert('Profil güncellenemedi.');
      }
   };

   // --- SUB-COMPONENT: JOKER DETAIL MODAL ---
   const JokerDetailModal = () => {
      if (!selectedJoker) return null;

      const isMe = currentUser && selectedJoker.id === currentUser.id;

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
                           src={selectedJoker.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedJoker.full_name || selectedJoker.username)}&background=1a2e35&color=4ade80&size=160`}
                           className="w-full h-full object-cover rounded-full border-4 border-slate-800/50 shadow-2xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"
                           alt={selectedJoker.full_name}
                        />
                     </div>
                  </div>

                  {/* Name */}
                  <div className="relative z-10 text-center mt-6 mb-4">
                     <h2 className="font-sport font-black text-4xl text-white uppercase italic tracking-tighter drop-shadow-md">
                        {selectedJoker.full_name || selectedJoker.username}
                     </h2>
                     <div className="flex justify-center items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wide">
                        <MapPin className="w-3 h-3 text-turf-500" /> {selectedJoker.location || 'Konum belirtilmemiş'}
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
                           <span className="font-sport text-lg font-black text-white uppercase">{selectedJoker.position || '-'}</span>
                        </div>
                        {/* Secondary Position */}
                        <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col items-center justify-center">
                           <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">YAN MEVKİ</span>
                           <span className="font-sport text-lg font-black text-slate-300 uppercase">{selectedJoker.secondaryPosition || '-'}</span>
                        </div>
                     </div>

                     {/* Extra Info: Sharing Status */}
                     <div className="flex gap-3 mb-6">
                        <div className={`w-full rounded-xl p-3 border flex flex-col justify-center items-center ${selectedJoker.sharesFee ? 'bg-turf-900/30 border-turf-500/30' : 'bg-slate-800 border-slate-700'}`}>
                           <Handshake className={`w-5 h-5 mb-1 ${selectedJoker.sharesFee ? 'text-turf-500' : 'text-slate-500'}`} />
                           <div className={`text-[10px] uppercase font-bold text-center leading-none ${selectedJoker.sharesFee ? 'text-turf-300' : 'text-slate-500'}`}>
                              {selectedJoker.sharesFee ? 'Ücrete Ortak' : 'Ücrete Ortak Değil'}
                           </div>
                        </div>
                     </div>

                     {/* Action Buttons */}
                     {!isMe && (
                        <div className="flex gap-2">
                           <button
                              onClick={() => { setIsInviteModalOpen(true); }}
                              className="w-full bg-gradient-to-r from-turf-600 to-green-500 text-white font-black text-lg uppercase italic py-3 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-turf-500/30 flex items-center justify-center gap-2"
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
            currentUser={currentUser}
         />

         <LocationFilterModal
            isOpen={isLocationFilterOpen}
            onClose={() => setIsLocationFilterOpen(false)}
            currentFilter={locationFilter}
            onApply={setLocationFilter}
         />

         <header className="mb-6 flex justify-between items-end">
            <div>
               <h1 className="font-sport font-black text-4xl text-white uppercase italic tracking-tighter">JOKER <span className="text-turf-500">HAVUZU</span></h1>
               <p className="text-slate-400 text-sm">Eksik oyuncu mu var? Scout et ve çağır.</p>
            </div>
            <button
               onClick={() => setIsProfileModalOpen(true)}
               className={`${currentUser?.isJoker ? 'bg-slate-800 border-slate-600' : 'bg-turf-600 border-turf-500 shadow-neon'} border text-white px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105`}
            >
               {currentUser?.isJoker ? 'Profilini Düzenle' : 'Profilini Ekle'}
            </button>
         </header>

         {/* Filter Button */}
         <div className="mb-6 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
               onClick={() => setIsLocationFilterOpen(true)}
               className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all border ${locationFilter.type !== 'ALL' ? 'bg-turf-600 border-turf-500 text-white shadow-lg shadow-turf-600/20' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-turf-500 hover:text-white'}`}
            >
               <MapPin className="w-4 h-4" />
               {locationFilter.type === 'NEARBY' ? `Yakınımda (${locationFilter.radius}km)` : locationFilter.type === 'DISTRICT' ? locationFilter.value : 'İstanbul (Tümü)'}
            </button>

            {locationFilter.type !== 'ALL' && (
               <button
                  onClick={() => setLocationFilter({ type: 'ALL' })}
                  className="flex items-center gap-2 px-4 py-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl font-bold text-sm hover:text-white hover:bg-slate-700 transition-all"
               >
                  Filtreyi Temizle
               </button>
            )}
         </div>

         {/* Joker List */}
         {isLoading ? (
            <div className="flex justify-center items-center py-20">
               <Loader2 className="w-8 h-8 text-turf-500 animate-spin" />
            </div>
         ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {visibleJokers.map((player) => {
                  const isMe = currentUser && player.id === currentUser.id;
                  const displayName = player.full_name || player.username;
                  const avatarSrc = player.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1a2e35&color=4ade80&size=128`;

                  return (
                     <div
                        key={player.id}
                        onClick={() => setSelectedJoker(player)}
                        className={`p-4 rounded-2xl border flex gap-4 items-center transition-all cursor-pointer group relative overflow-hidden ${isMe ? 'bg-slate-800/80 border-turf-500/50' : 'bg-slate-800 border-slate-700 hover:border-turf-500/50 hover:bg-slate-800/80'}`}
                     >
                        {/* Highlight Effect */}
                        <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-black/20 to-transparent pointer-events-none"></div>

                        <div className="relative">
                           <img src={avatarSrc} alt={displayName} className="w-16 h-16 rounded-full object-cover border-2 border-slate-600 group-hover:border-turf-500 transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0 relative z-10">
                           <h3 className="font-bold text-white text-lg truncate group-hover:text-turf-400 transition-colors">
                              {displayName} {isMe && '(Sen)'}
                           </h3>
                           <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5 mb-2">
                              <MapPin className="w-3 h-3 text-turf-600" /> {player.location || 'Konum yok'}
                           </div>
                           <div className="flex justify-between items-center">
                              <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${player.position === 'KALECİ' || player.position === 'GK' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-slate-700 text-slate-300'}`}>
                                 {player.position || 'Belirsiz'}
                              </span>

                              {player.sharesFee && (
                                 <div className="flex items-center gap-1 text-[10px] font-bold text-turf-500 bg-turf-900/20 px-2 py-1 rounded-full">
                                    <Handshake className="w-3 h-3" /> Ortak
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                  );
               })}
               {visibleJokers.length === 0 && (
                  <div className="col-span-2 text-center py-10 text-slate-500">
                     {locationFilter.type === 'NEARBY'
                        ? "Yakınınızda Joker bulunamadı."
                        : "Şu an aktif Joker bulunmuyor. İlk sen ol!"}
                  </div>
               )}
            </div>
         )}
      </div>
   );
};