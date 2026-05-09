import React from 'react';
import { MapPin, Settings } from 'lucide-react';
import { openLocationSettings } from '../../../utils/openLocationSettings';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';
import { CreateMatchModal } from '../../../components/Modals/CreateMatchModal';
import { ChallengeModal } from '../../../components/Modals/ChallengeModal';
import { TeamDetailModal } from '../../../components/Modals/TeamDetailModal';
import { SuccessModal } from '../../../components/Modals/SuccessModal';
import { ConfirmModal } from '../../../components/Modals/ConfirmModal';
import { LocationFilterModal } from '../../../components/Modals/LocationFilterModal';
import { SortModal } from '../../../components/Modals/SortModal';

import { useMarketplace } from './hooks/useMarketplace';
import { useMarketplaceActions } from './hooks/useMarketplaceActions';
import { MarketplaceHeader } from './components/MarketplaceHeader';
import { MatchAnnouncementCard } from './components/MatchAnnouncementCard';
import { DateFilterModal } from '../PitchBooking/components/DateFilterModal';

export const Marketplace: React.FC = () => {
  const {
    currentUser,
    myTeam,
    matches,
    setMatches,
    isLoading,
    myChallenges,
    setMyChallenges,
    isCreateModalOpen,
    setIsCreateModalOpen,
    isChallengeModalOpen,
    setIsChallengeModalOpen,
    selectedTeamId,
    setSelectedTeamId,
    selectedMatch,
    setSelectedMatch,
    isLocationFilterOpen,
    setIsLocationFilterOpen,
    locationFilter,
    setLocationFilter,
    locationPermissionDenied,
    isAuthorized,
    getPitchDetails,
    filteredMatches,
    selectedDate,
    setSelectedDate,
    isDateFilterOpen,
    setIsDateFilterOpen,
    sortBy,
    setSortBy,
    isSortOpen,
    setIsSortOpen,
  } = useMarketplace();

  const {
    confirmCancelModal,
    setConfirmCancelModal,
    confirmDeleteAdModal,
    setConfirmDeleteAdModal,
    successModal,
    setSuccessModal,
    handleSubmitChallenge,
    handleConfirmCancel,
    handleConfirmDeleteAd,
    handleCancelClick,
    handleDeleteAdClick
  } = useMarketplaceActions({
    myTeam,
    selectedMatch,
    setSelectedMatch,
    setMyChallenges,
    setIsChallengeModalOpen,
    setMatches
  });

  const displayMatches = filteredMatches;
  const authorized = isAuthorized();
  const canChallenge = !!myTeam && (myTeam.captainId === currentUser?.id || myTeam.viceCaptainIds?.includes(currentUser?.id));

  const handleOpenChallengeModal = (match: any) => {
    setSelectedMatch(match);
    setIsChallengeModalOpen(true);
  };

  if (isLoading && matches.length === 0) {
    return <LoadingSpinner fullScreen text="Maçlar Yükleniyor..." />;
  }

  return (
    <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto min-h-screen bg-pitch">
      <CreateMatchModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {selectedTeamId && (
        <TeamDetailModal
          isOpen={!!selectedTeamId}
          onClose={() => setSelectedTeamId(null)}
          teamId={selectedTeamId}
          currentUserId={currentUser?.id}
        />
      )}

      <LocationFilterModal
        isOpen={isLocationFilterOpen}
        onClose={() => setIsLocationFilterOpen(false)}
        currentFilter={locationFilter}
        onApply={setLocationFilter}
      />

      <DateFilterModal
        isOpen={isDateFilterOpen}
        onClose={() => setIsDateFilterOpen(false)}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
      />

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ ...successModal, isOpen: false })}
        message={successModal.message}
        type={successModal.type}
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

      <SortModal
        isOpen={isSortOpen}
        onClose={() => setIsSortOpen(false)}
        title="Sıralama"
        value={sortBy}
        onChange={(key) => setSortBy(key as typeof sortBy)}
        options={[
          { key: 'date_desc',  label: 'Tarihe Göre (Önce En Yeni)' },
          { key: 'date_asc',   label: 'Tarihe Göre (Önce En Eski)' },
          { key: 'price_asc',  label: 'Fiyata Göre (Önce En Düşük)' },
          { key: 'price_desc', label: 'Fiyata Göre (Önce En Yüksek)' },
          { key: 'fair_play',  label: 'Fair Play Skoruna Göre' },
          { key: 'distance',   label: 'Yakınlığa Göre' },
        ]}
      />

      <MarketplaceHeader
        locationFilter={locationFilter}
        setLocationFilter={setLocationFilter}
        setIsLocationFilterOpen={setIsLocationFilterOpen}
        selectedDate={selectedDate}
        onOpenDateFilter={() => setIsDateFilterOpen(true)}
        sortBy={sortBy}
        onOpenSort={() => setIsSortOpen(true)}
      />

      <div className="space-y-5">
        {displayMatches.length === 0 && (
          locationPermissionDenied ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-turf-600/10 border border-turf-600/20 flex items-center justify-center mb-5">
                <MapPin className="w-8 h-8 text-turf-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Konum İzni Gerekli</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Yakınındaki maç ilanlarını görmek için ayarlardan konum iznini etkinleştir.
              </p>
              <button
                onClick={openLocationSettings}
                className="flex items-center gap-2 bg-turf-600 hover:bg-turf-500 active:scale-95 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                <Settings className="w-4 h-4" />
                Ayarlara Git
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              {matches.length === 0
                ? "Henüz aktif ilan yok. İlk ilanı sen oluştur!"
                : "Seçilen kriterlere uygun ilan bulunamadı."}
            </div>
          )
        )}

        {displayMatches.map((announcement) => (
          <MatchAnnouncementCard
            key={announcement.id}
            announcement={announcement}
            myTeam={myTeam}
            myChallenges={myChallenges}
            isAuthorized={authorized}
            canChallenge={canChallenge}
            getPitchDetails={getPitchDetails}
            setSelectedTeamId={setSelectedTeamId}
            handleDeleteAdClick={handleDeleteAdClick}
            handleCancelClick={handleCancelClick}
            handleOpenChallengeModal={handleOpenChallengeModal}
          />
        ))}
      </div>

      {selectedMatch && (
        <ChallengeModal
          isOpen={isChallengeModalOpen}
          onClose={() => setIsChallengeModalOpen(false)}
          match={{
            id: selectedMatch.id,
            teamName: selectedMatch.team?.name,
            teamLogo: selectedMatch.team?.logoUrl,
            date: selectedMatch.date,
            time: selectedMatch.time,
            pitchName: getPitchDetails(selectedMatch.pitchId).pitch?.name || 'Bilinmeyen Saha',
            pitchLocation: (() => {
              const { business } = getPitchDetails(selectedMatch.pitchId);
              return business ? `${business.district}, ${business.city}` : 'Konum Yok';
            })(),
            businessName: getPitchDetails(selectedMatch.pitchId).business?.name,
            pricePerTeam: getPitchDetails(selectedMatch.pitchId).pitch?.pricePerHour
              ? getPitchDetails(selectedMatch.pitchId).pitch!.pricePerHour / 2
              : undefined
          }}
          onSubmit={handleSubmitChallenge}
        />
      )}

      {authorized && (
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="fixed bottom-36 right-6 bg-turf-600 text-white p-4 rounded-2xl shadow-xl shadow-turf-600/40 hover:scale-110 transition-transform z-40 border-2 border-white/20 rotate-3 hover:rotate-0"
        >
          <span className="font-black text-2xl leading-none">+</span>
        </button>
      )}
    </div>
  );
};
