import React, { useRef, useState, useCallback, useEffect } from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';

import { usePitchBooking } from './hooks/usePitchBooking';
import { TeamDetailModal } from './components/TeamDetailModal';
import { DateFilterModal } from './components/DateFilterModal';
import { FilterBar } from './components/FilterBar';
import { BusinessListItem } from './components/BusinessListItem';

import { CreateMatchModal } from '../../../components/Modals/CreateMatchModal';
import { OfferModal } from '../../../components/Modals/OfferModal';
import { ConfirmModal } from '../../../components/Modals/ConfirmModal';
import { NeedTeamRoleModal } from '../../../components/Modals/NeedTeamRoleModal';
import { LocationFilterModal } from '../../../components/Modals/LocationFilterModal';
import { SlotDetailModal } from '../../../components/Modals/SlotDetailModal';
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
      isLoadingLocation,
      myChallenges,
      confirmCancelModal, setConfirmCancelModal,
      confirmDeleteAdModal, setConfirmDeleteAdModal,
      isCreateModalOpen, setIsCreateModalOpen,
      createModalPitchId, createModalStartTime,
      isDateFilterOpen, setIsDateFilterOpen,
      needTeamRoleModal, setNeedTeamRoleModal,
      sortBy, setSortBy, isSortOpen, setIsSortOpen,
      selectedDate, setSelectedDate,
      reservations, slotDetailModal, setSlotDetailModal,
      currentUser, pitchAnnouncements,
      isAuthorized, filteredBusinesses,
      handleSendOffer, handleConfirmCancel, handleConfirmDeleteAd,
      handleCreateAd, handleUnauthorizedSlotClick, openSlotDetail,
      handleCancelClick, handleDeleteAdClick,
      isLoadingBusinesses,
      requestLocation,
   } = usePitchBooking();

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
         <TeamDetailModal viewingTeam={viewingTeam} onClose={() => setViewingTeam(null)} />
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
               <h1 className="font-sport font-black text-white uppercase italic tracking-tighter leading-none"
                  style={{ fontSize: 'clamp(2.75rem, 12vw, 4.25rem)' }}>
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
               />
            </div>

            {/* İçerik */}
            <div className="px-4 space-y-6 pb-4" style={{ minHeight: 'calc(100% + 1px)' }}>
               {isLoadingLocation ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                     <LoadingSpinner />
                     <p className="mt-4 text-sm font-medium">Konumunuz alınıyor...</p>
                     <p className="text-xs text-slate-500 mt-1">Yakınındaki sahalar yükleniyor</p>
                  </div>
               ) : filteredBusinesses.length === 0 && isLoadingBusinesses ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                     <LoadingSpinner />
                     <p className="mt-4 text-sm font-medium">İşletmeler yükleniyor...</p>
                  </div>
               ) : filteredBusinesses.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 bg-slate-800/50 rounded-3xl border border-dashed border-slate-700">
                     <MapPin className="w-8 h-8 mx-auto mb-3 text-slate-600" />
                     Seçilen konumda halı saha işletmesi bulunamadı.
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
                  </>
               )}
            </div>
         </div>
      </div>
   );
};
