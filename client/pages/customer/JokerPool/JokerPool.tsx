import React, { useRef, useState, useCallback, useEffect } from 'react';
import { MapPin, RefreshCw, Loader2 } from 'lucide-react';
import { InviteJokerModal } from '../../../components/Modals/InviteJokerModal';
import { JokerProfileModal } from '../../../components/Modals/JokerProfileModal';
import { LocationFilterModal } from '../../../components/Modals/LocationFilterModal';
import { SortModal } from '../../../components/Modals/SortModal';
import { LocationAccessGate } from '../../../components/LocationAccessGate';

import { useJokerPool } from './hooks/useJokerPool';
import { JokerLocationFilter } from './components/JokerLocationFilter';
import { JokerCard } from './components/JokerCard';
import { JokerDetailModal } from './components/JokerDetailModal';

const HEADER_FADE_PX = 140;
const PULL_THRESHOLD = 70;

export const JokerPool: React.FC = () => {
   const {
      currentUser,
      isLoading,
      loadingMore,
      hasMore,
      loadMore,
      selectedJoker, setSelectedJoker,
      isInviteModalOpen, setIsInviteModalOpen,
      isProfileModalOpen, setIsProfileModalOpen,
      isLocationFilterOpen, setIsLocationFilterOpen,
      sortBy, setSortBy, isSortOpen, setIsSortOpen,
      locationFilter,
      applyLocationFilter,
      visibleJokers,
      handleSaveProfile,
      requestLocation,
   } = useJokerPool();

   const scrollRef = useRef<HTMLDivElement>(null);
   const touchStartYRef = useRef(0);
   const touchStartScrollTopRef = useRef(0);
   const hasTriggeredRefreshRef = useRef(false);

   const [headerOpacity, setHeaderOpacity] = useState(1);
   const [pullDistance, setPullDistance] = useState(0);
   const [isRefreshing, setIsRefreshing] = useState(false);

   useEffect(() => {
      return () => {
         document.documentElement.style.removeProperty('--header-opacity');
         document.documentElement.style.removeProperty('--header-pointer-events');
      };
   }, []);

   const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
      const st = e.currentTarget.scrollTop;
      const opacity = Math.max(0, 1 - st / HEADER_FADE_PX);
      setHeaderOpacity(opacity);
      document.documentElement.style.setProperty('--header-opacity', String(opacity));
      document.documentElement.style.setProperty('--header-pointer-events', opacity > 0.1 ? 'auto' : 'none');
   }, []);

   const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
      touchStartYRef.current = e.touches[0].clientY;
      touchStartScrollTopRef.current = scrollRef.current?.scrollTop ?? 0;
      hasTriggeredRefreshRef.current = false;
   }, []);

   const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
      if (isRefreshing || touchStartScrollTopRef.current > 4) return;
      const delta = e.touches[0].clientY - touchStartYRef.current;
      if (delta > 0) {
         setPullDistance(Math.min(delta * 0.45, 90));
      } else {
         setPullDistance(0);
      }
   }, [isRefreshing]);

   const handleTouchEnd = useCallback(async () => {
      if (pullDistance >= PULL_THRESHOLD && !hasTriggeredRefreshRef.current) {
         hasTriggeredRefreshRef.current = true;
         setIsRefreshing(true);
         try {
            await requestLocation();
         } finally {
            setIsRefreshing(false);
         }
      }
      setPullDistance(0);
   }, [pullDistance, requestLocation]);

   const pullIndicatorH = isRefreshing ? 56 : pullDistance;

   return (
      <div
         className="fixed inset-0 bg-pitch text-white flex flex-col overflow-hidden"
         style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
         {/* Modals */}
         <JokerDetailModal
            selectedJoker={selectedJoker}
            currentUser={currentUser}
            setSelectedJoker={setSelectedJoker}
            setIsInviteModalOpen={setIsInviteModalOpen}
            setIsProfileModalOpen={setIsProfileModalOpen}
         />
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
            onApply={applyLocationFilter}
         />
         <SortModal
            isOpen={isSortOpen}
            onClose={() => setIsSortOpen(false)}
            title="Sıralama"
            value={sortBy}
            onChange={setSortBy}
            options={[
               { key: 'distance',         label: 'Yakınlığa Göre' },
               { key: 'kaleci',           label: 'Kaleci' },
               { key: 'orta_saha',        label: 'Orta Saha' },
               { key: 'forvet',           label: 'Forvet' },
               { key: 'defans',           label: 'Defans' },
               { key: 'ucreteOrtak',      label: 'Ücrete Ortak' },
               { key: 'ucreteOrtakDegil', label: 'Ücrete Ortak Değil' },
            ]}
         />

         {/* Scroll container */}
         <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overscroll-y-contain scrollbar-hide"
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            onScroll={handleScroll}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
         >
            {/* Pull-to-refresh indicator */}
            <div
               className="flex items-center justify-center overflow-hidden"
               style={{
                  height: pullIndicatorH,
                  transition: isRefreshing ? 'none' : 'height 0.2s ease',
               }}
            >
               {(pullDistance > 0 || isRefreshing) && (
                  <RefreshCw
                     className={`w-5 h-5 text-turf-400 ${isRefreshing ? 'animate-spin' : ''}`}
                     style={isRefreshing ? undefined : { transform: `rotate(${Math.min(pullDistance * 3, 360)}deg)` }}
                  />
               )}
            </div>

            {/* Başlık — scroll'a göre kademeli kaybolur */}
            <div className="px-4 pt-3 pb-5 pr-32" style={{ opacity: headerOpacity }}>
               <h1
                  className="font-sport font-black text-white uppercase italic tracking-tighter leading-none whitespace-nowrap"
                  style={{ fontSize: 'clamp(1.75rem, 9vw, 2.75rem)' }}
               >
                  JOKER <span className="text-turf-500">HAVUZU</span>
               </h1>
               <p className="text-slate-400 font-medium text-sm mt-1">
                  Eksik oyuncu mu var? Scout et ve çağır.
               </p>
            </div>

            {/* Profil butonu — fixed sağ üst, başlıkla birlikte soluklaşır */}
            <button
               onClick={() => setIsProfileModalOpen(true)}
               className={`fixed top-bell-safe right-4 z-50 border text-white rounded-xl font-bold transition-colors px-3 py-2 text-xs ${
                  currentUser?.isJoker
                     ? 'bg-slate-800/90 border-slate-600'
                     : 'bg-turf-600 border-turf-500 shadow-neon'
               }`}
               style={{ opacity: headerOpacity, pointerEvents: headerOpacity > 0.1 ? 'auto' : 'none' }}
            >
               {currentUser?.isJoker ? 'Profilini Düzenle' : 'Profilini Ekle'}
            </button>

            {/* Filtre — sticky, her zaman görünür */}
            <div
               className="sticky top-0 px-4 pb-3 pt-1"
               style={{ backgroundColor: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.06)', zIndex: 40, willChange: 'transform' }}
            >
               <JokerLocationFilter
                  locationFilter={locationFilter}
                  setIsLocationFilterOpen={setIsLocationFilterOpen}
                  sortBy={sortBy}
                  setIsSortOpen={setIsSortOpen}
               />
            </div>

            {/* İçerik */}
            <div className="px-4 pt-3 pb-4" style={{ minHeight: 'calc(100% + 1px)' }}>
               <LocationAccessGate contentLabel="joker oyuncuları">
                  {isLoading ? (
                     <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-8 h-8 text-turf-500 animate-spin" />
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {visibleJokers.map((player) => (
                           <JokerCard
                              key={player.id}
                              player={player}
                              currentUser={currentUser}
                              onClick={() => setSelectedJoker(player)}
                           />
                        ))}
                        {visibleJokers.length === 0 && (
                           <div className="col-span-2 text-center py-12 text-slate-400 bg-slate-800/50 rounded-3xl border border-dashed border-slate-700">
                              <MapPin className="w-8 h-8 mx-auto mb-3 text-slate-600" />
                              <p>Yakınınızda joker oyuncu bulunamadı.</p>
                           </div>
                        )}
                        {(hasMore || loadingMore) && (
                           <div className="col-span-2 flex justify-center pt-2 pb-4">
                              <button
                                 onClick={loadMore}
                                 disabled={loadingMore}
                                 className="px-6 py-3 bg-slate-800 border border-slate-700 text-white rounded-2xl font-semibold text-sm hover:bg-slate-700 disabled:opacity-50 transition-colors"
                              >
                                 {loadingMore ? 'Yükleniyor...' : 'Daha Fazla Göster'}
                              </button>
                           </div>
                        )}
                     </div>
                  )}
               </LocationAccessGate>
            </div>
         </div>
      </div>
   );
};
