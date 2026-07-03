import React, { useRef, useState, useCallback, useEffect } from 'react';
import { MapPin, RefreshCw, Calendar, ArrowUpDown, EyeOff } from 'lucide-react';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';
import { LocationAccessGate } from '../../../components/LocationAccessGate';
import { CreateMatchModal } from '../../../components/Modals/CreateMatchModal';
import { ChallengeModal } from '../../../components/Modals/ChallengeModal';
import { TeamDetailModal } from '../../../components/Modals/TeamDetailModal';
import { SuccessModal } from '../../../components/Modals/SuccessModal';
import { ConfirmModal } from '../../../components/Modals/ConfirmModal';
import { LocationFilterModal } from '../../../components/Modals/LocationFilterModal';
import { SortModal } from '../../../components/Modals/SortModal';

import { useMarketplace } from './hooks/useMarketplace';
import { useMarketplaceActions } from './hooks/useMarketplaceActions';
import { MatchAnnouncementCard } from './components/MatchAnnouncementCard';
import { DateFilterModal } from '../PitchBooking/components/DateFilterModal';

// Başlık bu kadar px içinde kademeli soluklaşır — yavaş ve doğal his
const HEADER_FADE_PX = 140;
const PULL_THRESHOLD = 70;

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
    isAuthorized,
    getPitchDetails,
    filteredMatches,
    loadingMore,
    hasMore,
    loadMore,
    refetch,
    selectedDate,
    setSelectedDate,
    isDateFilterOpen,
    setIsDateFilterOpen,
    sortBy,
    setSortBy,
    isSortOpen,
    setIsSortOpen,
    hideMyListings,
    setHideMyListings,
    requestLocation,
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
  const displayMatches = filteredMatches;
  const authorized = isAuthorized();
  const canChallenge = !!myTeam && (myTeam.captainId === currentUser?.id || myTeam.viceCaptainIds?.includes(currentUser?.id));
  const isNonDefaultSort = sortBy !== 'date_desc';

  const handleOpenChallengeModal = (match: any) => {
    setSelectedMatch(match);
    setIsChallengeModalOpen(true);
  };

  return (
    <div
      className="fixed inset-0 bg-pitch text-white flex flex-col overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
    >
      {/* Modals */}
      <CreateMatchModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={({ date }) => {
          // Tarih filtresi yeni ilanı gizlemesin; kendi ilanları listede zaten en üstte sabitlenir.
          if (date !== selectedDate) setSelectedDate(date);
          refetch();
        }}
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
          { key: 'date_desc', label: 'Tarihe Göre (Önce En Yeni)' },
          { key: 'date_asc', label: 'Tarihe Göre (Önce En Eski)' },
          { key: 'price_asc', label: 'Fiyata Göre (Önce En Düşük)' },
          { key: 'price_desc', label: 'Fiyata Göre (Önce En Yüksek)' },
          { key: 'fair_play', label: 'Fair Play Skoruna Göre' },
          { key: 'distance', label: 'Yakınlığa Göre' },
        ]}
      />
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
              : undefined,
            distanceKm: selectedMatch.distanceKm,
            playerCount: selectedMatch.playerCount
          }}
          onSubmit={handleSubmitChallenge}
        />
      )}

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
            MAÇ <span className="text-turf-500">PAZARI</span>
          </h1>
          <p className="text-slate-400 mt-1 font-medium">Sahaya çıkmaya hazır mısın kaptan?</p>
        </div>

        {/* Filtre — sticky, her zaman görünür */}
        <div className="sticky top-0 px-3 pb-3 pt-1" style={{ backgroundColor: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.06)', zIndex: 40, willChange: 'transform' }}>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setIsDateFilterOpen(true)}
              className="px-3 py-2.5 border border-turf-500/50 bg-turf-900/20 text-white rounded-xl text-[11px] font-bold whitespace-nowrap hover:bg-turf-800 transition-colors skew-x-[-6deg] shrink-0"
            >
              <span className="skew-x-[6deg] flex items-center gap-1">
                <Calendar className="w-3 h-3 text-turf-500 shrink-0" />
                {new Date(selectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
              </span>
            </button>
            <button
              onClick={() => setIsLocationFilterOpen(true)}
              className={`px-3 py-2.5 border text-slate-300 rounded-xl text-[11px] font-bold whitespace-nowrap hover:border-turf-500 hover:text-white transition-colors skew-x-[-6deg] shrink-0 ${locationFilter.type === 'NEARBY' ? 'bg-turf-900/50 border-turf-500 text-white' : 'bg-slate-800 border-slate-700'}`}
            >
              <span className="skew-x-[6deg] flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                {locationFilter.type === 'NEARBY' ? `Yakınımda (${locationFilter.radius}km)` : 'Yakınımda'}
              </span>
            </button>
            <button
              onClick={() => setIsSortOpen(true)}
              className={`px-3 py-2.5 border rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors skew-x-[-6deg] shrink-0 ${isNonDefaultSort
                ? 'bg-turf-900/40 border-turf-500 text-turf-400'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-turf-500 hover:text-white'
                }`}
            >
              <span className="skew-x-[6deg] flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 shrink-0" />
                Sırala
              </span>
            </button>
            {myTeam && (
              <button
                onClick={() => setHideMyListings(!hideMyListings)}
                className={`px-3 py-2.5 border rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors skew-x-[-6deg] shrink-0 ${hideMyListings
                  ? 'bg-turf-900/40 border-turf-500 text-turf-400'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-turf-500 hover:text-white'
                  }`}
              >
                <span className="skew-x-[6deg] flex items-center gap-1">
                  <EyeOff className="w-3 h-3 shrink-0" />
                  İlanlarımı Gizle
                </span>
              </button>
            )}
          </div>
        </div>

        {/* İçerik */}
        <div className="px-4 pt-3 space-y-5 pb-4" style={{ minHeight: 'calc(100% + 1px)' }}>
          <LocationAccessGate contentLabel="maç ilanlarını">
            {isLoading && matches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <LoadingSpinner />
                <p className="mt-4 text-sm font-medium">Maçlar Yükleniyor...</p>
              </div>
            ) : displayMatches.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                {matches.length === 0
                  ? "Henüz aktif ilan yok. İlk ilanı sen oluştur!"
                  : "Seçilen kriterlere uygun ilan bulunamadı."}
              </div>
            ) : (
              <>
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
                {(hasMore || loadingMore) && (
                  <div className="flex justify-center pt-4 pb-2">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="px-6 py-3 bg-slate-800 border border-slate-700 text-white rounded-2xl font-semibold text-sm hover:bg-slate-700 disabled:opacity-50 transition-colors"
                    >
                      {loadingMore ? 'Yükleniyor...' : 'Daha Fazla Göster'}
                    </button>
                  </div>
                )}
              </>
            )}
          </LocationAccessGate>
        </div>
      </div>

      {/* Floating action button */}
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
