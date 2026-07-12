import React, { useRef, useState, useCallback, useEffect } from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import { LottiePlayer } from '../../../components/UI/LottiePlayer';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';
import { InviteJokerModal } from '../../../components/Modals/InviteJokerModal';
import { JokerProfileModal } from './components/JokerProfileModal';
import { LocationFilterModal } from '../../../components/Modals/LocationFilterModal';
import { SortModal } from '../../../components/Modals/SortModal';
import { LocationAccessGate } from '../../../components/LocationAccessGate';
import { OfflineEmptyState } from '../../../components/OfflineEmptyState';

import { useJokerPool } from './hooks/useJokerPool';
import { JokerLocationFilter } from './components/JokerLocationFilter';
import { JokerCard } from './components/JokerCard';
import { JokerDetailModal } from './components/JokerDetailModal';
import { startTour, isTourActive } from '../../../services/tourStore';
import { isTourDone } from '../../../services/tourStorage';

const HEADER_FADE_PX = 140;
const PULL_THRESHOLD = 70;

export const JokerPool: React.FC = () => {
   const {
      currentUser,
      isLoading,
      loadError,
      refetch,
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

   // Joker turu: yalnız kayıt akışının 'pending' işaretlediği kullanıcıda, sayfaya
   // İLK girişte bir kez (başka bir tur açıksa asla üstüne binmez).
   useEffect(() => {
      if (!isTourActive() && !isTourDone('jokers')) startTour('jokers');
   }, []);

   const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const st = el.scrollTop;
      const opacity = Math.max(0, 1 - st / HEADER_FADE_PX);
      setHeaderOpacity(opacity);
      document.documentElement.style.setProperty('--header-opacity', String(opacity));
      document.documentElement.style.setProperty('--header-pointer-events', opacity > 0.1 ? 'auto' : 'none');
      // Infinite-scroll: liste sonuna ~600px kala sonraki sayfayı ekle (loadMore içeride guard'lı).
      if (el.scrollHeight - st - el.clientHeight < 600) {
         loadMore();
      }
   }, [loadMore]);

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

            {/* Başlık + profil butonu — flex satır: buton yeri otomatik ayrılır (çakışma imkânsız).
                Başlık TEK SATIR (whitespace-nowrap): font, kalan genişliğe göre akışkan ölçeklenir —
                clamp orta değeri (100vw − 204px)/6.7: 204px = maks buton ("Profilini Düzenle") +
                px-4×2 + gap-4 + NEFES PAYI (başlık butona yapışmasın — kullanıcı kararı);
                6.7 ≈ "JOKER HAVUZU"nun em-genişliği. Buton da küçük ekranda orantılı küçülür
                (clamp'li text/padding) → hiçbir ekranda sarma/taşma olmaz. */}
            <div
               className="flex items-start justify-between gap-4 px-4 pt-3 pb-5"
               style={{ opacity: headerOpacity, pointerEvents: headerOpacity > 0.1 ? 'auto' : 'none' }}
            >
               <div className="min-w-0 flex-1">
                  <h1
                     className="font-sport font-black text-white uppercase italic tracking-tighter leading-none whitespace-nowrap"
                     style={{ fontSize: 'clamp(1.25rem, calc((100vw - 204px) / 6.7), 2.75rem)' }}
                  >
                     JOKER <span className="text-turf-500">HAVUZU</span>
                  </h1>
                  <p className="text-slate-400 font-medium text-sm mt-1">
                     Eksik oyuncu mu var? Scout et ve çağır.
                  </p>
               </div>
               <button
                  data-tour-id="joker-profile-btn"
                  onClick={() => setIsProfileModalOpen(true)}
                  className={`flex-shrink-0 mt-1 border text-white rounded-xl font-bold transition-colors px-[clamp(8px,2.8vw,12px)] py-2 text-[clamp(10px,3.1vw,12px)] whitespace-nowrap ${
                     currentUser?.isJoker
                        ? 'bg-slate-800/90 border-slate-600'
                        : 'bg-turf-600 border-turf-500 shadow-neon'
                  }`}
               >
                  {currentUser?.isJoker ? 'Profilini Düzenle' : 'Profilini Ekle'}
               </button>
            </div>

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
                  {isLoading && visibleJokers.length === 0 ? (
                     <div className="flex justify-center items-center py-20">
                        {/* Marka loader: dönen top; reduce-motion/yüklenme → CSS ring fallback */}
                        <div className="w-16 h-16">
                           <LottiePlayer
                              src="/animations/rolling-football.json"
                              loop
                              autoplay
                              ariaLabel="Yükleniyor"
                              style={{ width: '100%', height: '100%' }}
                              fallback={<div className="w-8 h-8 mx-auto rounded-full border-4 border-slate-700 border-t-turf-500 animate-spin" />}
                           />
                        </div>
                     </div>
                  ) : (
                     <div className="flex flex-col gap-4">
                        {/* Koşulsuz tek kolon: her kart tam satır — hiçbir ekran boyutunda
                            yan yana sıkışma/kırpılma olamaz (mobil ilke: her cihazda aynı görüntü). */}
                        {visibleJokers.map((player, i) => (
                           // İlk kart tanıtım turunun spotlight hedefi (joker-first-card)
                           <div key={player.id} data-tour-id={i === 0 ? 'joker-first-card' : undefined}>
                              <JokerCard
                                 player={player}
                                 currentUser={currentUser}
                                 onClick={() => setSelectedJoker(player)}
                              />
                           </div>
                        ))}
                        {visibleJokers.length === 0 && (
                           // Ağ hatasıyla boş kalan liste ≠ "yakında joker yok" — sebep + retry.
                           loadError === 'network' ? (
                              <OfflineEmptyState onRetry={refetch} />
                           ) : (
                              <div className="text-center py-12 text-slate-400 bg-slate-800/50 rounded-3xl border border-dashed border-slate-700">
                                 <MapPin className="w-8 h-8 mx-auto mb-3 text-slate-600" />
                                 <p>Yakınınızda joker oyuncu bulunamadı.</p>
                              </div>
                           )
                        )}
                        {/* Infinite-scroll alt göstergesi (Marketplace deseni) */}
                        {loadingMore && (
                           <div className="flex items-center justify-center py-4">
                              <LoadingSpinner />
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
