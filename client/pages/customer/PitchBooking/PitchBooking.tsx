import React, { useRef, useState, useCallback, useEffect } from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';
import { LottiePlayer } from '../../../components/UI/LottiePlayer';
import { LocationAccessGate } from '../../../components/LocationAccessGate';
import { OfflineEmptyState } from '../../../components/OfflineEmptyState';

import { usePitchBooking } from './hooks/usePitchBooking';
import { TeamDetailModal } from '../../../components/Modals/TeamDetailModal';
import { DateFilterModal } from './components/DateFilterModal';
import { FilterBar } from './components/FilterBar';
import { BusinessListItem } from './components/BusinessListItem';

import { CreateMatchModal } from '../../../components/Modals/CreateMatchModal';
import { OfferModal } from './components/OfferModal';
import { ConfirmModal } from '../../../components/Modals/ConfirmModal';
import { NeedTeamRoleModal } from './components/NeedTeamRoleModal';
import { LocationFilterModal } from '../../../components/Modals/LocationFilterModal';
import { SlotDetailModal } from './components/SlotDetailModal';
import { SortModal } from '../../../components/Modals/SortModal';

// Başlık bu kadar px içinde kademeli soluklaşır — yavaş ve doğal his
const HEADER_FADE_PX = 140;
const PULL_THRESHOLD = 70;

export const PitchBooking: React.FC = () => {
   const {
      expandedBusinessId, setExpandedBusinessId,
      selectedPitchIdInBusiness, setSelectedPitchIdInBusiness,
      viewingTeam, setViewingTeam,
      offerMode, setOfferMode,
      isLocationFilterOpen, setIsLocationFilterOpen,
      locationFilter, applyLocationFilter,
      myChallenges,
      confirmCancelModal, setConfirmCancelModal,
      confirmDeleteAdModal, setConfirmDeleteAdModal,
      isCreateModalOpen, setIsCreateModalOpen,
      createModalPitchId, createModalStartTime,
      isDateFilterOpen, setIsDateFilterOpen,
      needTeamRoleModal, setNeedTeamRoleModal,
      sortBy, setSortBy, isSortOpen, setIsSortOpen,
      searchQuery, setSearchQuery,
      selectedDate, setSelectedDate,
      reservations, slotDetailModal, setSlotDetailModal,
      currentUser, pitchAnnouncements,
      isAuthorized, filteredBusinesses,
      handleSendOffer, handleConfirmCancel, handleConfirmDeleteAd,
      handleCreateAd, handleUnauthorizedSlotClick, openSlotDetail,
      handleCancelClick, handleDeleteAdClick,
      isLoadingBusinesses, isLoadingMore, loadError,
      loadMoreBusinesses, refreshBusinesses,
      slotWarning, setSlotWarning,
      refetchReservations,
   } = usePitchBooking();

   const scrollRef = useRef<HTMLDivElement>(null);
   const touchStartYRef = useRef(0);
   const touchStartScrollTopRef = useRef(0);
   const hasTriggeredRefreshRef = useRef(false);

   const [headerOpacity, setHeaderOpacity] = useState(1);
   const [pullDistance, setPullDistance] = useState(0);
   const [isRefreshing, setIsRefreshing] = useState(false);
   // Arama çubuğu açık/kapalı (morph). Kapanınca terimi de temizle → liste varsayılana döner.
   const [isSearchOpen, setIsSearchOpen] = useState(false);
   const closeSearch = useCallback(() => {
      setIsSearchOpen(false);
      setSearchQuery('');
   }, [setSearchQuery]);

   useEffect(() => {
      return () => {
         document.documentElement.style.removeProperty('--header-opacity');
         document.documentElement.style.removeProperty('--header-pointer-events');
      };
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
         loadMoreBusinesses();
      }
   }, [loadMoreBusinesses]);

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
            await refreshBusinesses();
         } finally {
            setIsRefreshing(false);
         }
      }
      setPullDistance(0);
   }, [pullDistance, refreshBusinesses]);

   const pullIndicatorH = isRefreshing ? 56 : pullDistance;

   return (
      <div
         className="fixed inset-0 bg-pitch text-white flex flex-col overflow-hidden"
         style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
         {/* Modals */}
         {/* Rakip takım kartı: Maç Pazarı/Bildirimler'le AYNI paylaşılan modal (yerel kopya silindi). */}
         {viewingTeam && (
            <TeamDetailModal
               isOpen={!!viewingTeam}
               onClose={() => setViewingTeam(null)}
               teamId={viewingTeam.id}
               currentUserId={currentUser?.id}
            />
         )}
         <LocationFilterModal
            isOpen={isLocationFilterOpen}
            onClose={() => setIsLocationFilterOpen(false)}
            currentFilter={locationFilter}
            onApply={applyLocationFilter}
         />
         <DateFilterModal
            isOpen={isDateFilterOpen}
            onClose={() => setIsDateFilterOpen(false)}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
         />
         <OfferModal
            isOpen={!!offerMode}
            onClose={() => setOfferMode(null)}
            teamName={offerMode?.teamName || ''}
            onSend={handleSendOffer}
         />
         <ConfirmModal
            isOpen={confirmCancelModal.isOpen}
            onClose={() => setConfirmCancelModal({ isOpen: false, challengeId: null })}
            onConfirm={handleConfirmCancel}
            title="İsteği İptal Et"
            message="Meydan okuma isteğini iptal etmek istiyor musun? Bu işlem geri alınamaz."
            confirmText="Evet, İptal Et"
            cancelText="Vazgeç"
            isDangerous={true}
         />
         <ConfirmModal
            isOpen={confirmDeleteAdModal.isOpen}
            onClose={() => setConfirmDeleteAdModal({ isOpen: false, adId: null })}
            onConfirm={handleConfirmDeleteAd}
            title="İlanı Kaldır"
            message="Bu ilanı kaldırmak istediğinize emin misiniz? Bu işlem geri alınamaz."
            confirmText="Evet, Kaldır"
            cancelText="Vazgeç"
            isDangerous={true}
         />
         <SlotDetailModal
            isOpen={slotDetailModal.isOpen}
            onClose={() => setSlotDetailModal({ ...slotDetailModal, isOpen: false })}
            slotTime={slotDetailModal.slotTime || ''}
            slotEndTime={slotDetailModal.slotEndTime || ''}
            reservations={slotDetailModal.reservations}
            announcements={slotDetailModal.announcements}
            approvedReservation={slotDetailModal.approvedReservation}
            isAuthorized={isAuthorized()}
            currentTeamId={currentUser?.team?.id}
            onChallenge={(matchId, teamName) => setOfferMode({ matchId, teamName })}
            onCreateAd={() => {
               if (slotDetailModal.slotTime && expandedBusinessId && selectedPitchIdInBusiness[expandedBusinessId]) {
                  handleCreateAd(selectedPitchIdInBusiness[expandedBusinessId], slotDetailModal.slotTime);
               }
            }}
         />
         <CreateMatchModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            preSelectedPitchId={createModalPitchId}
            preSelectedStartTime={createModalStartTime}
            preSelectedDate={selectedDate}
            onSlotConflict={refetchReservations}
         />
         {/* Kapalı/dolu saate istek denemesi uyarısı (server 409) */}
         <ConfirmModal
            isOpen={!!slotWarning}
            onClose={() => setSlotWarning(null)}
            onConfirm={() => setSlotWarning(null)}
            title="Bu saat artık müsait değil"
            message={slotWarning || ''}
            confirmText="Tamam"
            cancelText="Kapat"
            isDangerous={true}
         />
         <NeedTeamRoleModal
            isOpen={needTeamRoleModal.isOpen}
            onClose={() => setNeedTeamRoleModal({ ...needTeamRoleModal, isOpen: false })}
            reason={needTeamRoleModal.reason}
         />
         <SortModal
            isOpen={isSortOpen}
            onClose={() => setIsSortOpen(false)}
            title="Sıralama"
            value={sortBy}
            onChange={(key) => setSortBy(key as typeof sortBy)}
            options={[
               { key: 'distance', label: 'Yakınlığa Göre' },
               { key: 'price_asc', label: 'Fiyata Göre (Önce En Düşük)' },
               { key: 'price_desc', label: 'Fiyata Göre (Önce En Yüksek)' },
               { key: 'rating_count', label: 'Değerlendirme Sayısına Göre' },
               { key: 'rating', label: 'Puana Göre' },
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
            <div className="px-4 pt-3 pb-5 pr-14" style={{ opacity: headerOpacity }}>
               <h1 className="font-sport font-black text-white uppercase italic tracking-tighter leading-none whitespace-nowrap"
                  style={{ fontSize: 'clamp(2.25rem, 11vw, 4.25rem)' }}>
                  SAHA<span className="text-turf-500">LAR</span>
               </h1>
               <p className="text-slate-400 text-sm mt-1">Favori sahanı bul, takvimi incele ve maçı ayarla.</p>
            </div>

            {/* Filtre — sticky, her zaman görünür */}
            <div className="sticky top-0 px-4 pb-3 pt-1" style={{ backgroundColor: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.06)', zIndex: 40, willChange: 'transform' }}>
               <FilterBar
                  locationFilter={locationFilter}
                  selectedDate={selectedDate}
                  sortBy={sortBy}
                  onOpenLocationFilter={() => setIsLocationFilterOpen(true)}
                  onOpenDateFilter={() => setIsDateFilterOpen(true)}
                  onOpenSort={() => setIsSortOpen(true)}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  isSearchOpen={isSearchOpen}
                  onOpenSearch={() => setIsSearchOpen(true)}
                  onCloseSearch={closeSearch}
                  isSearching={isLoadingBusinesses && !!searchQuery}
               />
            </div>

            {/* İçerik */}
            <div className="px-4 space-y-6 pb-4" style={{ minHeight: 'calc(100% + 1px)' }}>
               <LocationAccessGate contentLabel="sahaları">
                  {filteredBusinesses.length === 0 && isLoadingBusinesses ? (
                     <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <LoadingSpinner />
                        <p className="mt-4 text-sm font-medium">İşletmeler yükleniyor...</p>
                     </div>
                  ) : filteredBusinesses.length === 0 && loadError === 'network' ? (
                     // Ağ hatasıyla boş kalan liste ≠ "konumda işletme yok" — sebep + retry.
                     <OfflineEmptyState onRetry={refreshBusinesses} />
                  ) : filteredBusinesses.length === 0 ? (
                     <div className="text-center py-12 px-6 text-slate-400 bg-slate-800/50 rounded-3xl border border-dashed border-slate-700 flex flex-col items-center">
                        {/* Saha çizim animasyonu (tek-sefer); reduce-motion/yüklenme → statik pin */}
                        <div className="w-28 h-28 mb-1">
                           <LottiePlayer
                              src="/animations/football-pitch.json"
                              loop={false}
                              autoplay
                              ariaLabel="İşletme bulunamadı"
                              style={{ width: '100%', height: '100%' }}
                              fallback={<MapPin className="w-8 h-8 mx-auto mt-8 text-slate-600" />}
                           />
                        </div>
                        {searchQuery ? (
                           <>
                              <p className="mb-5">"<span className="text-slate-200 font-semibold">{searchQuery}</span>" için saha bulunamadı.</p>
                              <button
                                 onClick={() => setSearchQuery('')}
                                 className="bg-turf-600 hover:bg-turf-500 active:scale-[0.97] text-white font-bold text-sm py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-turf-600/20"
                              >
                                 Aramayı temizle
                              </button>
                           </>
                        ) : (
                           <>
                              <p className="mb-5">Belirlediğiniz konumda işletme bulunamadı.</p>
                              <button
                                 onClick={() => setIsLocationFilterOpen(true)}
                                 className="bg-turf-600 hover:bg-turf-500 active:scale-[0.97] text-white font-bold text-sm py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-turf-600/20"
                              >
                                 Arama alanını genişlet
                              </button>
                           </>
                        )}
                     </div>
                  ) : (
                     <>
                        {isLoadingBusinesses && (
                           <div className="flex items-center justify-center gap-2 mb-4 animate-pulse">
                              <div className="w-2 h-2 bg-turf-500 rounded-full"></div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Liste Güncelleniyor...</span>
                           </div>
                        )}
                        {filteredBusinesses.map((business) => (
                           <BusinessListItem
                              key={business.id}
                              business={business}
                              isExpanded={expandedBusinessId === business.id}
                              setExpandedBusinessId={setExpandedBusinessId}
                              selectedPitchIdInBusiness={selectedPitchIdInBusiness}
                              setSelectedPitchIdInBusiness={setSelectedPitchIdInBusiness}
                              selectedDate={selectedDate}
                              pitchAnnouncements={pitchAnnouncements}
                              reservations={reservations}
                              isAuthorized={isAuthorized()}
                              currentUser={currentUser}
                              myChallenges={myChallenges}
                              openSlotDetail={openSlotDetail}
                              handleCreateAd={handleCreateAd}
                              handleUnauthorizedSlotClick={handleUnauthorizedSlotClick}
                              setViewingTeam={setViewingTeam}
                              setOfferMode={setOfferMode}
                              handleDeleteAdClick={handleDeleteAdClick}
                              handleCancelClick={handleCancelClick}
                              distanceKm={business.distanceKm}
                           />
                        ))}
                        {/* Infinite-scroll alt göstergesi */}
                        {isLoadingMore && (
                           <div className="flex items-center justify-center py-4">
                              <LoadingSpinner />
                           </div>
                        )}
                     </>
                  )}
               </LocationAccessGate>
            </div>
         </div>
      </div>
   );
};
