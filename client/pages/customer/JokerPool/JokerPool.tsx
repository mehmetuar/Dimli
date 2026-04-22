import React from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { InviteJokerModal } from '../../../components/Modals/InviteJokerModal';
import { JokerProfileModal } from '../../../components/Modals/JokerProfileModal';
import { LocationFilterModal } from '../../../components/Modals/LocationFilterModal';

// Hooks
import { useJokerPool } from './hooks/useJokerPool';

// Components
import { JokerPoolHeader } from './components/JokerPoolHeader';
import { JokerLocationFilter } from './components/JokerLocationFilter';
import { JokerCard } from './components/JokerCard';
import { JokerDetailModal } from './components/JokerDetailModal';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';

export const JokerPool: React.FC = () => {
   const {
      currentUser,
      isLoading,
      isLoadingLocation,
      selectedJoker, setSelectedJoker,
      isInviteModalOpen, setIsInviteModalOpen,
      isProfileModalOpen, setIsProfileModalOpen,
      isLocationFilterOpen, setIsLocationFilterOpen,
      locationFilter,
      applyLocationFilter,
      visibleJokers,
      handleSaveProfile
   } = useJokerPool();

   return (
      <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto min-h-screen bg-pitch">

         {/* Joker Detail Modal */}
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

         {/* Header */}
         <JokerPoolHeader
            currentUser={currentUser}
            setIsProfileModalOpen={setIsProfileModalOpen}
         />

         {/* Location Filter */}
         <JokerLocationFilter
            locationFilter={locationFilter}
            setIsLocationFilterOpen={setIsLocationFilterOpen}
         />

         {/* Joker List */}
         {isLoadingLocation ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
               <LoadingSpinner />
               <p className="mt-4 text-sm font-medium">Konumunuz alınıyor...</p>
               <p className="text-xs text-slate-500 mt-1">Yakınındaki joker oyuncular yükleniyor</p>
            </div>
         ) : isLoading ? (
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
            </div>
         )}
      </div>
   );
};
