import React from 'react';
import { MapPin } from 'lucide-react';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';

import { usePitchBooking } from './hooks/usePitchBooking';
import { TeamDetailModal } from './components/TeamDetailModal';
import { DateFilterModal } from './components/DateFilterModal';
import { FilterBar } from './components/FilterBar';
import { BusinessListItem } from './components/BusinessListItem';

import { CreateMatchModal } from '../../../components/Modals/CreateMatchModal';
import { OfferModal } from '../../../components/Modals/OfferModal';
import { ConfirmModal } from '../../../components/Modals/ConfirmModal';
import { ReservationModal } from '../../../components/Modals/ReservationModal';
import { LocationFilterModal } from '../../../components/Modals/LocationFilterModal';
import { SlotDetailModal } from '../../../components/Modals/SlotDetailModal';

export const PitchBooking: React.FC = () => {
   const {
      businesses, expandedBusinessId, setExpandedBusinessId,
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
      isReservationModalOpen, setIsReservationModalOpen,
      reservationPitchId, reservationStartTime,
      selectedDate, setSelectedDate,
      reservations, slotDetailModal, setSlotDetailModal,
      currentUser, pitchAnnouncements,
      isAuthorized, getFilteredBusinesses,
      handleSendOffer, handleConfirmCancel, handleConfirmDeleteAd,
      handleCreateAd, handleReserve, handleReservationSuccess, openSlotDetail,
      handleCancelClick, handleDeleteAdClick
   } = usePitchBooking();

   const filteredBusinesses = getFilteredBusinesses();

   return (
      <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto min-h-screen bg-pitch">
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
            onChallenge={(matchId, teamName) => {
               setOfferMode({ matchId, teamName });
            }}
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

         {selectedDate && expandedBusinessId && reservationPitchId && (
            <ReservationModal
               isOpen={isReservationModalOpen}
               onClose={() => setIsReservationModalOpen(false)}
               pitch={businesses.find(b => b.id === expandedBusinessId)?.pitches?.find(p => p.id === reservationPitchId) || {} as any}
               business={businesses.find(b => b.id === expandedBusinessId) || {} as any}
               selectedDate={selectedDate}
               selectedStartTime={reservationStartTime || '18:00'}
               teamId={currentUser?.team?.id || ''}
               onSuccess={handleReservationSuccess}
            />
         )}

         <header className="mb-8">
            <h1 className="font-sport font-black text-5xl text-white uppercase italic tracking-tighter">
               SAHALAR
            </h1>
            <p className="text-slate-400">Favori sahanı bul, takvimi incele ve maçı ayarla.</p>
         </header>

         <FilterBar
            locationFilter={locationFilter}
            selectedDate={selectedDate}
            onOpenLocationFilter={() => setIsLocationFilterOpen(true)}
            onOpenDateFilter={() => setIsDateFilterOpen(true)}
         />

         <div className="space-y-6">
            {isLoadingLocation ? (
               <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <LoadingSpinner />
                  <p className="mt-4 text-sm font-medium">Konumunuz alınıyor...</p>
                  <p className="text-xs text-slate-500 mt-1">Yakınındaki sahalar yükleniyor</p>
               </div>
            ) : filteredBusinesses.length === 0 ? (
               <div className="text-center py-12 text-slate-400 bg-slate-800/50 rounded-3xl border border-dashed border-slate-700">
                  <MapPin className="w-8 h-8 mx-auto mb-3 text-slate-600" />
                  Seçilen konumda halı saha işletmesi bulunamadı.
               </div>
            ) : filteredBusinesses.map((business) => (
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
                  handleReserve={handleReserve}
                  setViewingTeam={setViewingTeam}
                  setOfferMode={setOfferMode}
                  handleDeleteAdClick={handleDeleteAdClick}
                  handleCancelClick={handleCancelClick}
                  distanceKm={business.distanceKm}
               />
            ))}
         </div>
      </div>
   );
};
