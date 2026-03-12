import React from 'react';
import { Loader2 } from 'lucide-react';
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

export const JokerPool: React.FC = () => {
   const {
      currentUser,
      isLoading,
      selectedJoker, setSelectedJoker,
      isInviteModalOpen, setIsInviteModalOpen,
      isProfileModalOpen, setIsProfileModalOpen,
      isLocationFilterOpen, setIsLocationFilterOpen,
      locationFilter, setLocationFilter,
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
            onApply={setLocationFilter}
         />

         {/* Header */}
         <JokerPoolHeader
            currentUser={currentUser}
            setIsProfileModalOpen={setIsProfileModalOpen}
         />

         {/* Location Filter */}
         <JokerLocationFilter
            locationFilter={locationFilter}
            setLocationFilter={setLocationFilter}
            setIsLocationFilterOpen={setIsLocationFilterOpen}
         />

         {/* Joker List */}
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