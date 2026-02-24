
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_MATCHES } from '../constants';
import { MapPin, Star, Phone, ChevronRight, Users, Trophy, ChevronDown, MessageCircle, Shield, UserCheck, Clock, AlertCircle, X, CheckCircle, Wallet, Calendar } from 'lucide-react';
import { LevelBadge } from '../components/LevelBadge';
import { FairPlayScore } from '../components/FairPlayScore';
import { Team, MatchListing, Business, Pitch } from '../types';
import { CreateMatchModal } from '../components/CreateMatchModal';
import { OfferModal } from '../components/OfferModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { ReservationModal } from '../components/ReservationModal';
import { LocationFilter, LocationFilterModal } from '../components/LocationFilterModal';
import { calculateDistance } from '../utils/location';
import api from '../services/api';
import { SlotDetailModal } from '../components/SlotDetailModal';

export const PitchBooking: React.FC = () => {
   // New state for Businesses
   const [businesses, setBusinesses] = useState<Business[]>([]);
   const [expandedBusinessId, setExpandedBusinessId] = useState<string | null>(null);
   const [selectedPitchIdInBusiness, setSelectedPitchIdInBusiness] = useState<Record<string, string>>({}); // Store selected pitch ID per business

   const [viewingTeam, setViewingTeam] = useState<Team | null>(null);
   const [offerMode, setOfferMode] = useState<{ matchId: string, teamName: string } | null>(null);

   // Location Filter State
   const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
   const [locationFilter, setLocationFilter] = useState<LocationFilter>({ type: 'ALL' });

   // Challenge State
   const [myChallenges, setMyChallenges] = useState<any[]>([]);
   const [confirmCancelModal, setConfirmCancelModal] = useState<{ isOpen: boolean; challengeId: string | null }>({ isOpen: false, challengeId: null });
   const [confirmDeleteAdModal, setConfirmDeleteAdModal] = useState<{ isOpen: boolean; adId: string | null }>({ isOpen: false, adId: null });

   // Create Modal State
   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
   const [createModalPitchId, setCreateModalPitchId] = useState<string | undefined>(undefined);
   const [createModalStartTime, setCreateModalStartTime] = useState<string | undefined>(undefined);

   // Reservation Modal State
   const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
   const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
   const [reservationPitchId, setReservationPitchId] = useState<string | undefined>(undefined);
   const [reservationStartTime, setReservationStartTime] = useState<string | undefined>(undefined);
   const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
   const [reservations, setReservations] = useState<any[]>([]); // Pitch reservations for selected date

   // Slot Detail Modal State
   const [slotDetailModal, setSlotDetailModal] = useState<{
      isOpen: boolean;
      slotTime: string | null;
      slotEndTime?: string | null;
      reservations: any[];
      announcements: any[];
      approvedReservation?: any;
   }>({
      isOpen: false,
      slotTime: null,
      slotEndTime: null,
      reservations: [],
      announcements: [],
      approvedReservation: undefined
   });

   const openSlotDetail = (slotTime: string, slotEndTime: string, reservations: any[], announcements: any[], approvedReservation?: any) => {
      setSlotDetailModal({
         isOpen: true,
         slotTime,
         slotEndTime,
         reservations,
         announcements,
         approvedReservation
      });
   };

   const navigate = useNavigate();

   // Current user for own announcement detection
   const [currentUser, setCurrentUser] = useState<any>(null);

   // Check if user is authorized (captain or vice-captain)
   const isAuthorized = () => {
      if (!currentUser?.team) return false;
      return currentUser.team.captainId === currentUser.id || currentUser.team.viceCaptainIds?.includes(currentUser.id) || false;
   };

   // Announcements for the currently selected pitch
   const [pitchAnnouncements, setPitchAnnouncements] = useState<any[]>([]);

   // Fetch initial data
   useEffect(() => {
      const fetchData = async () => {
         try {
            // Fetch User
            const userRes = await api.get('/users/me');
            console.log('👤 Current user:', userRes.data);
            setCurrentUser(userRes.data);

            if (userRes.data?.team) {
               const challengesRes = await api.get(`/challenges/team/${userRes.data.team.id}`);
               setMyChallenges(challengesRes.data);
            }

            // Fetch Businesses (with Pitches included hopefully)
            // Or create a dedicated endpoint. Assuming /businesses includes pitches based on my backend implementation.
            const businessRes = await api.get('/businesses');
            setBusinesses(businessRes.data);
            console.log('🏢 Businesses fetched:', businessRes.data);

         } catch (error) {
            console.error('Failed to fetch data:', error);
         }
      };
      fetchData();
   }, []);

   // Fetch announcements when a specific PITCH is selected (inside an expanded business)
   useEffect(() => {
      if (expandedBusinessId && selectedPitchIdInBusiness[expandedBusinessId]) {
         const pitchId = selectedPitchIdInBusiness[expandedBusinessId];
         const fetchAnnouncements = async () => {
            try {
               const response = await api.get(`/match-announcements/pitch/${pitchId}`);
               console.log(`📍 Announcements for pitch ${pitchId}:`, response.data);
               setPitchAnnouncements(response.data);
            } catch (error) {
               console.error('Failed to fetch pitch announcements:', error);
               setPitchAnnouncements([]);
            }
         };
         fetchAnnouncements();
      } else {
         setPitchAnnouncements([]);
      }
   }, [expandedBusinessId, selectedPitchIdInBusiness]);

   // Fetch reservations when pitch or date changes
   useEffect(() => {
      if (expandedBusinessId && selectedPitchIdInBusiness[expandedBusinessId]) {
         const pitchId = selectedPitchIdInBusiness[expandedBusinessId];
         const fetchReservations = async () => {
            try {
               const response = await api.get(`/reservations/pitch/${pitchId}?date=${selectedDate}`);
               console.log(`🎫 Reservations for pitch ${pitchId}:`, response.data);
               setReservations(response.data);
            } catch (error) {
               console.error('Failed to fetch reservations:', error);
               setReservations([]);
            }
         };
         fetchReservations();
      } else {
         setReservations([]);
      }
   }, [expandedBusinessId, selectedPitchIdInBusiness, selectedDate]);

   // Helper: Select first pitch when expanding business if none selected
   useEffect(() => {
      if (expandedBusinessId) {
         const business = businesses.find(b => b.id === expandedBusinessId);
         if (business?.pitches?.length && !selectedPitchIdInBusiness[expandedBusinessId]) {
            setSelectedPitchIdInBusiness(prev => ({
               ...prev,
               [expandedBusinessId]: business.pitches![0].id
            }));
         }
      }
   }, [expandedBusinessId, businesses]);


   // Filter logic adapted for Businesses (filtering by business location)
   const getFilteredBusinesses = () => {
      let filtered = [...businesses];

      if (locationFilter.type === 'DISTRICT' && locationFilter.value) {
         filtered = filtered.filter(b => (b.district || '').includes(locationFilter.value!) || (b.city || '').includes(locationFilter.value!));
      }
      // Note: Coordinates logic needs update as Business doesn't have coords yet in frontend, maybe assuming hardcoded for now or skipping
      // If we need distance, we should add coordinates to business entity or just skip nearby for now.

      return filtered;
   };

   const filteredBusinesses = getFilteredBusinesses();

   const handleSendOffer = async (note: string) => {
      if (!currentUser?.team || !offerMode) return;

      const response = await api.post('/challenges', {
         fromTeamId: currentUser.team.id,
         toMatchId: offerMode.matchId,
         note
      });

      setMyChallenges(prev => [...prev, response.data]);
   };

   const handleCancelClick = (challengeId: string) => {
      setConfirmCancelModal({ isOpen: true, challengeId });
   };

   const handleConfirmCancel = async () => {
      if (!confirmCancelModal.challengeId) return;
      try {
         await api.delete(`/challenges/${confirmCancelModal.challengeId}`);
         setMyChallenges(prev => prev.filter(c => c.id !== confirmCancelModal.challengeId));
      } catch (error) {
         console.error('Failed to cancel challenge:', error);
         alert('İptal edilemedi.');
      } finally {
         setConfirmCancelModal({ isOpen: false, challengeId: null });
      }
   };

   const handleDeleteAdClick = (adId: string) => {
      setConfirmDeleteAdModal({ isOpen: true, adId });
   };

   const handleConfirmDeleteAd = async () => {
      if (!confirmDeleteAdModal.adId) return;
      try {
         await api.delete(`/match-announcements/${confirmDeleteAdModal.adId}`);
         setPitchAnnouncements(prev => prev.filter(p => p.id !== confirmDeleteAdModal.adId));
      } catch (error) {
         console.error('Failed to delete ad:', error);
         alert('İlan silinemedi.');
      } finally {
         setConfirmDeleteAdModal({ isOpen: false, adId: null });
      }
   };

   const handleCreateAd = (pitchId: string, startTime?: string) => {
      // Logic same as before
      setCreateModalPitchId(pitchId);
      setCreateModalStartTime(startTime);
      setIsCreateModalOpen(true);
   };

   const handleReserve = (pitchId: string, startTime: string) => {
      setReservationPitchId(pitchId);
      setReservationStartTime(startTime);
      setIsReservationModalOpen(true);
   };

   // Generate dynamic slots based on pitch timeSlots or business hours
   const generateSlots = (pitch: any, business: any) => {
      // If pitch has custom time slots, use them
      if (pitch.timeSlots && pitch.timeSlots.length > 0) {
         return pitch.timeSlots
            .filter((ts: any) => ts.isActive !== false)
            .map((ts: any) => ({
               startTime: ts.startTime,
               endTime: ts.endTime,
               status: 'AVAILABLE'
            }))
            .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
      }

      // Fallback: generate hourly slots from openTime/closeTime
      const openTime = pitch.openTime || business.openTime;
      const closeTime = pitch.closeTime || business.closeTime;

      if (!openTime || !closeTime) {
         return [18, 19, 20, 21, 22, 23].map(hour => ({
            startTime: `${hour.toString().padStart(2, '0')}:00`,
            endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
            status: 'AVAILABLE'
         }));
      }

      const open = parseInt(openTime.split(':')[0]);
      const close = parseInt(closeTime.split(':')[0]);
      const slots: any[] = [];

      if (close < open) {
         for (let hour = open; hour <= 23; hour++) {
            slots.push({
               startTime: `${hour.toString().padStart(2, '0')}:00`,
               endTime: `${((hour + 1) % 24).toString().padStart(2, '0')}:00`,
               status: 'AVAILABLE'
            });
         }
         for (let hour = 0; hour < close; hour++) {
            slots.push({
               startTime: `${hour.toString().padStart(2, '0')}:00`,
               endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
               status: 'AVAILABLE'
            });
         }
      } else {
         for (let hour = open; hour < close; hour++) {
            slots.push({
               startTime: `${hour.toString().padStart(2, '0')}:00`,
               endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
               status: 'AVAILABLE'
            });
         }
      }

      return slots;
   };

   const handleReservationSuccess = () => {
      // Refresh reservations
      if (reservationPitchId) {
         api.get(`/reservations/pitch/${reservationPitchId}?date=${selectedDate}`)
            .then(res => setReservations(res.data))
            .catch(err => console.error('Failed to refresh reservations:', err));
      }
   };

   // Helper: Check if a slot is in the past
   const isPastSlot = (startTime: string, date: string): boolean => {
      const now = new Date();
      const [h, m] = startTime.split(':').map(Number);
      const slotDate = new Date(date);
      slotDate.setHours(h, m || 0, 0, 0);
      return slotDate < now;
   };

   // Group Matches by Date
   const groupMatchesByDate = (matches: MatchListing[]) => {
      const grouped: Record<string, MatchListing[]> = {};
      matches.forEach(match => {
         if (!grouped[match.date]) grouped[match.date] = [];
         grouped[match.date].push(match);
      });
      return grouped;
   };

   const getRelativeDateLabel = (dateStr: string) => {
      const today = new Date().toISOString().split('T')[0];
      const date = new Date(dateStr);

      if (dateStr === today) return 'BUGÜN';

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (dateStr === tomorrow.toISOString().split('T')[0]) return 'YARIN';

      return date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
   };

   // --- SUB-COMPONENT: TEAM DETAIL MODAL ---
   // (Kept same as original)
   const TeamDetailModal = () => {
      if (!viewingTeam) return null;
      return (
         <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 overflow-hidden relative shadow-2xl shadow-turf-500/20 max-h-[90vh] overflow-y-auto">
               <button
                  onClick={() => setViewingTeam(null)}
                  className="absolute top-4 right-4 bg-slate-900/50 p-2 rounded-full text-white hover:bg-red-500 transition-colors z-20"
               >
                  <X className="w-5 h-5" />
               </button>

               {/* Header */}
               <div className="h-32 relative">
                  <div className={`absolute inset-0 bg-gradient-to-b from-${viewingTeam.primaryColor} to-slate-800 opacity-80`}></div>
                  <img src={viewingTeam.logoUrl} className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 w-24 h-24 rounded-full border-4 border-slate-800 shadow-xl z-10 bg-slate-900 object-cover" />
               </div>

               <div className="pt-12 pb-8 px-6 text-center">
                  <h2 className="font-sport font-black text-3xl text-white uppercase italic">{viewingTeam.name}</h2>
                  <div className="flex justify-center items-center gap-2 mt-2 mb-4">
                     <LevelBadge level={viewingTeam.level} />
                     <FairPlayScore score={viewingTeam.fairPlayScore} />
                  </div>

                  <p className="text-slate-300 italic text-sm mb-6 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">"{viewingTeam.description}"</p>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-2 mb-6">
                     <div className="bg-slate-900 p-2 rounded-lg border border-slate-700">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Galibiyet</div>
                        <div className="font-sport text-xl text-white">{viewingTeam.wins}</div>
                     </div>
                     <div className="bg-slate-900 p-2 rounded-lg border border-slate-700">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Mağlubiyet</div>
                        <div className="font-sport text-xl text-red-400">{viewingTeam.losses}</div>
                     </div>
                     <div className="bg-slate-900 p-2 rounded-lg border border-slate-700">
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Son 3 Maç</div>
                        <div className="flex justify-center gap-1 mt-1">
                           <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                           <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                           <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        </div>
                     </div>
                  </div>

                  {/* Roster Preview */}
                  <div className="text-left mb-6">
                     <h4 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4 text-turf-500" /> MUHTEMEL KADRO
                     </h4>
                     <div className="bg-slate-900 rounded-xl p-2 space-y-1 border border-slate-700">
                        {viewingTeam.players && viewingTeam.players.length > 0 ? (
                           viewingTeam.players.map((player: any, i: number) => (
                              <div key={player.id} className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-lg transition-colors">
                                 <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                    {i + 1}
                                 </div>
                                 <div className="flex-1 text-sm text-slate-300">{player.full_name || player.username}</div>
                                 <div className="text-[10px] font-bold text-slate-500 uppercase">{player.position || 'MEV'}</div>
                              </div>
                           ))
                        ) : (
                           <div className="text-center py-4 text-slate-500 text-sm">
                              Oyuncu bilgisi bulunamadı
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Kapat Button */}
                  <button
                     onClick={() => {
                        setViewingTeam(null);
                     }}
                     className="w-full bg-turf-600 text-white font-bold py-3 rounded-xl hover:bg-turf-500 transition-colors"
                  >
                     Kapat
                  </button>
               </div>
            </div>
         </div>
      );
   };


   return (
      <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto min-h-screen bg-pitch">
         <TeamDetailModal />

         <LocationFilterModal
            isOpen={isLocationFilterOpen}
            onClose={() => setIsLocationFilterOpen(false)}
            currentFilter={locationFilter}
            onApply={setLocationFilter}
         />

         {/* Date Filter Modal */}
         {isDateFilterOpen && (
            <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in" onClick={() => setIsDateFilterOpen(false)}>
               <div className="bg-slate-800 w-full max-w-md sm:rounded-3xl rounded-t-3xl border border-slate-700 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  {/* Header */}
                  <div className="p-6 border-b border-slate-700 bg-slate-900 flex justify-between items-center">
                     <div>
                        <h2 className="font-sport font-black text-2xl text-white italic uppercase tracking-wide">
                           TARİH <span className="text-turf-500">SEÇ</span>
                        </h2>
                        <p className="text-slate-400 text-xs">Max 30 gün ileriye kadar</p>
                     </div>
                     <button onClick={() => setIsDateFilterOpen(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-colors">
                        <X className="w-5 h-5" />
                     </button>
                  </div>

                  {/* Body */}
                  <div className="p-6 space-y-4">
                     {/* Tarih Input */}
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Tarih Seçin</label>
                        <input
                           type="date"
                           value={selectedDate}
                           min={new Date().toISOString().split('T')[0]}
                           max={(() => {
                              const maxDate = new Date();
                              maxDate.setDate(maxDate.getDate() + 30);
                              return maxDate.toISOString().split('T')[0];
                           })()}
                           onChange={(e) => setSelectedDate(e.target.value)}
                           className="w-full bg-slate-900 border border-slate-600 text-white font-bold px-4 py-3 rounded-xl focus:outline-none focus:border-turf-500 transition-colors"
                        />
                        <p className="text-sm text-slate-400 font-medium">
                           {new Date(selectedDate).toLocaleDateString('tr-TR', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                           })}
                        </p>
                     </div>

                     {/* Hızlı Seçim Butonları */}
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Hızlı Seçim</label>
                        <div className="flex gap-2">
                           <button
                              onClick={() => {
                                 setSelectedDate(new Date().toISOString().split('T')[0]);
                                 setIsDateFilterOpen(false);
                              }}
                              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-turf-600 text-white rounded-xl text-sm font-bold transition-colors"
                           >
                              Bugün
                           </button>
                           <button
                              onClick={() => {
                                 const tomorrow = new Date();
                                 tomorrow.setDate(tomorrow.getDate() + 1);
                                 setSelectedDate(tomorrow.toISOString().split('T')[0]);
                                 setIsDateFilterOpen(false);
                              }}
                              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-turf-600 text-white rounded-xl text-sm font-bold transition-colors"
                           >
                              Yarın
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}
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
         {/* Slot Detail Modal */}
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
         />

         {/* Reservation Modal */}
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

         {/* Filter Buttons */}
         <div className="mb-6 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {/* Konum Filtresi */}
            <button
               onClick={() => setIsLocationFilterOpen(true)}
               className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all border ${locationFilter.type !== 'ALL' ? 'bg-turf-600 border-turf-500 text-white shadow-lg shadow-turf-600/20' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-turf-500 hover:text-white'}`}
            >
               <MapPin className="w-4 h-4" />
               {locationFilter.type === 'NEARBY' ? `Yakınımda (${locationFilter.radius}km)` : locationFilter.type === 'DISTRICT' ? locationFilter.value : 'İstanbul (Tümü)'}
            </button>

            {/* Tarih Filtresi */}
            <button
               onClick={() => setIsDateFilterOpen(true)}
               className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all border bg-slate-800 border-slate-700 text-slate-300 hover:border-turf-500 hover:text-white"
            >
               <Calendar className="w-4 h-4" />
               {new Date(selectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
            </button>

            {locationFilter.type !== 'ALL' && (
               <button
                  onClick={() => setLocationFilter({ type: 'ALL' })}
                  className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-bold text-sm hover:bg-red-500/20 transition-all"
               >
                  Filtreyi Temizle
               </button>
            )}
         </div>

         <div className="space-y-6">
            {filteredBusinesses.length === 0 && (
               <div className="text-center py-12 text-slate-400 bg-slate-800/50 rounded-3xl border border-dashed border-slate-700">
                  <MapPin className="w-8 h-8 mx-auto mb-3 text-slate-600" />
                  Seçilen konumda halı saha işletmesi bulunamadı.
               </div>
            )}

            {filteredBusinesses.map((business) => {
               const isExpanded = expandedBusinessId === business.id;
               // Determine selected pitch for this business
               const selectedPitchId = selectedPitchIdInBusiness[business.id];
               const selectedPitch = business.pitches?.find(p => p.id === selectedPitchId);

               // Use selected pitch for image/details if available, else first pitch or placeholder
               const displayPitch = selectedPitch || (business.pitches && business.pitches[0]);

               // If no pitches, handle gracefully?
               if (!business.pitches || business.pitches.length === 0) return null;

               const activeMatches = pitchAnnouncements
                  .filter(a => a.matchType !== 'kendi_aramizda')
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
               const groupedMatches = groupMatchesByDate(activeMatches);

               return (
                  <div key={business.id} className={`bg-slate-800 rounded-3xl overflow-hidden border transition-all duration-300 ${isExpanded ? 'border-turf-500 shadow-neon' : 'border-slate-700 shadow-lg'}`}>
                     {/* Business Card Header */}
                     <div
                        className="h-44 relative cursor-pointer group"
                        onClick={() => setExpandedBusinessId(isExpanded ? null : business.id)}
                     >
                        {/* Use image of the first pitch or a generic business image if we had one */}
                        <img src={displayPitch?.imageUrl || "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"} alt={business.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent"></div>

                        {/* Price Tag (of selected/first pitch) */}
                        {displayPitch && (
                           <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700/50 shadow-lg">
                              <span className="text-turf-400 font-sport font-bold text-xl tracking-wide">₺{displayPitch.pricePerHour}</span>
                              <span className="text-slate-400 text-xs font-bold ml-1">/ Saat</span>
                           </div>
                        )}

                        <div className="absolute bottom-4 left-4">
                           <h2 className="text-3xl font-sport font-black text-white italic uppercase drop-shadow-md">{business.name}</h2>
                           <div className="flex items-center gap-1 text-slate-200 text-sm font-medium">
                              <MapPin className="w-4 h-4 text-turf-500" /> {business.district}, {business.city}
                           </div>
                        </div>

                        <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur px-3 py-1 rounded-lg flex items-center gap-1 border border-slate-700">
                           <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                           <span className="font-bold text-white">{business.rating}</span>
                        </div>

                        <div className={`absolute bottom-4 right-4 bg-white/10 p-2 rounded-full backdrop-blur transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                           <ChevronDown className="w-5 h-5 text-white" />
                        </div>
                     </div>

                     {/* Expanded Content */}
                     {isExpanded && (
                        <div className="p-5 animate-fade-in bg-slate-900/50">

                           {/* PITCH TABS */}
                           {business.pitches && business.pitches.length > 1 && (
                              <div className="flex gap-2 overflow-x-auto mb-6 pb-2 scrollbar-hide border-b border-slate-700">
                                 {business.pitches.map(pitch => (
                                    <button
                                       key={pitch.id}
                                       onClick={() => setSelectedPitchIdInBusiness(prev => ({ ...prev, [business.id]: pitch.id }))}
                                       className={`px-4 py-2 rounded-t-xl font-bold text-sm transition-all whitespace-nowrap ${selectedPitch && selectedPitch.id === pitch.id
                                          ? 'bg-turf-600 text-white border-b-2 border-turf-400'
                                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                    >
                                       {pitch.name}
                                    </button>
                                 ))}
                              </div>
                           )}

                           {selectedPitch ? (
                              <>
                                 {/* --- SCHEDULE GRID (AVAILABILITY) --- */}
                                 <div className="mb-8">
                                    {/* Header with Reservation Button */}
                                    <div className="flex items-center justify-between mb-3">
                                       <h4 className="text-white font-bold text-sm flex items-center gap-2">
                                          <Clock className="w-4 h-4 text-turf-500" /> {selectedPitch.name.toUpperCase()} AKIŞI
                                       </h4>
                                       <a
                                          href={`tel:${business.phone}`} // Use business phone
                                          className="bg-turf-600 hover:bg-turf-500 text-white px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-turf-600/20"
                                       >
                                          <Phone className="w-4 h-4" />
                                          <span className="hidden sm:inline">Rezervasyon Yap</span>
                                          <span className="sm:hidden">Ara</span>
                                       </a>
                                    </div>

                                    {/* Reuse schedule logic */}
                                    <div className="grid grid-cols-3 gap-2">
                                       {generateSlots(selectedPitch, business).map((slot: any, slotIdx: number) => {
                                          const isPast = isPastSlot(slot.startTime, selectedDate);

                                          if (isPast) {
                                             return (
                                                <div
                                                   key={slotIdx}
                                                   className="p-3 rounded-xl border border-slate-700 bg-slate-800/30 text-slate-600 opacity-50 cursor-not-allowed flex flex-col items-center justify-center min-h-[80px]"
                                                >
                                                   <span className="text-[15px] sm:text-base font-black tracking-tighter leading-none">{slot.startTime}</span>
                                                   {slot.endTime && (
                                                      <span className="text-[10px] font-bold opacity-75 mt-0.5">{slot.endTime}</span>
                                                   )}
                                                   <span className="text-[10px] font-bold mt-1.5 tracking-widest uppercase">GEÇTİ</span>
                                                </div>
                                             );
                                          }

                                          // Parse slot start hour+minute for reservation matching
                                          const [slotH, slotM] = slot.startTime.split(':').map(Number);

                                          const announcements = pitchAnnouncements.filter((announcement: any) => {
                                             const announcementTime = announcement.time || '';
                                             return announcementTime.startsWith(slot.startTime);
                                          });
                                          const hasAnnouncement = announcements.length > 0;

                                          const slotReservations = reservations.filter((res: any) => {
                                             const resTime = new Date(res.slotTime);
                                             return resTime.getHours() === slotH && resTime.getMinutes() === (slotM || 0);
                                          });

                                          const approvedReservation = slotReservations.find((r: any) => r.status === 'APPROVED');
                                          const pendingReservations = slotReservations.filter((r: any) => r.status === 'PENDING');
                                          const hasPending = pendingReservations.length > 0;

                                          let slotClass = '';
                                          let label = '';
                                          let subLabel = '';
                                          let action = null;

                                          if (hasPending && hasAnnouncement && !approvedReservation) {
                                             slotClass = 'bg-slate-800 border-orange-500/50 text-orange-400 cursor-pointer hover:border-turf-500';
                                             label = 'ONAY BEKLİYOR';
                                             subLabel = 'RAKİP ARANIYOR';
                                             action = () => openSlotDetail(slot.startTime, slot.endTime || '', pendingReservations, announcements);
                                          }
                                          else if (approvedReservation) {
                                             slotClass = 'bg-red-900/20 border-red-900/50 text-red-700 cursor-pointer hover:opacity-80';
                                             label = 'DOLU';
                                             action = () => openSlotDetail(slot.startTime, slot.endTime || '', [], [], approvedReservation);
                                          } else if (hasPending) {
                                             slotClass = 'bg-orange-900/20 border-orange-500/50 text-orange-400 cursor-pointer hover:border-turf-500';
                                             label = 'ONAY BEKLİYOR';
                                             action = () => openSlotDetail(slot.startTime, slot.endTime || '', pendingReservations, announcements);
                                          } else if (hasAnnouncement) {
                                             slotClass = 'bg-orange-900/20 border-orange-500/50 text-orange-400 animate-pulse cursor-pointer hover:border-turf-500';
                                             label = 'RAKİP ARANIYOR';
                                             action = () => openSlotDetail(slot.startTime, slot.endTime || '', pendingReservations, announcements);
                                          } else {
                                             if (isAuthorized()) {
                                                slotClass = 'bg-slate-800 border-slate-700 text-slate-300 hover:border-turf-500 hover:text-white cursor-pointer';
                                                label = 'BOŞ';
                                                action = () => handleCreateAd(selectedPitch.id, slot.startTime);
                                             } else if (slot.status === 'AVAILABLE') { // Assuming 'AVAILABLE' means it's free for reservation
                                                slotClass = 'bg-slate-800 border-slate-700 text-slate-300 hover:border-turf-500 hover:text-white cursor-pointer';
                                                label = 'BOŞ';
                                                action = () => handleReserve(selectedPitch.id, slot.startTime);
                                             } else {
                                                slotClass = 'bg-slate-800 border-slate-700 text-slate-500 opacity-60 cursor-not-allowed';
                                                label = 'BOŞ';
                                             }
                                          }

                                          return (
                                             <div
                                                key={slotIdx}
                                                onClick={(e) => {
                                                   e.stopPropagation();
                                                   if (action) action();
                                                }}
                                                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center relative overflow-hidden group min-h-[80px] ${slotClass}`}
                                             >
                                                <span className="text-[15px] sm:text-base font-black tracking-tighter leading-none">{slot.startTime}</span>
                                                {slot.endTime && (
                                                   <span className="text-[10px] font-bold opacity-75 mt-0.5 mb-1">{slot.endTime}</span>
                                                )}

                                                {subLabel ? (
                                                   <div className="flex flex-col items-center gap-1 mt-0.5">
                                                      <span className="text-[9px] font-bold bg-orange-500/20 px-1.5 py-0.5 rounded tracking-wider text-orange-400 uppercase">{label}</span>
                                                      <span className="text-[9px] font-bold text-turf-400 tracking-wider uppercase">{subLabel}</span>
                                                   </div>
                                                ) : (
                                                   <span className="text-[10px] font-bold mt-0.5 tracking-widest uppercase">{label}</span>
                                                )}

                                                {slot.status === 'AVAILABLE' && isAuthorized() && !approvedReservation && !hasPending && !hasAnnouncement && (
                                                   <div className="absolute inset-0 bg-turf-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                      <span className="text-white font-bold text-xs">+ İlan Aç</span>
                                                   </div>
                                                )}
                                             </div>
                                          )
                                       })}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                                       <AlertCircle className="w-3 h-3" /> Boş saatlere tıklayarak ilan açabilirsiniz. Dolu/Bekleyen saatlere tıklayarak detayları görebilirsiniz.
                                    </p>
                                 </div>

                                 {/* --- FACILITIES --- */}
                                 <div className="mb-6">
                                    <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                                       <Trophy className="w-4 h-4 text-yellow-500" /> İMKANLAR
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                       {selectedPitch.facilities?.map((fac, i) => (
                                          <span key={i} className="px-3 py-1 rounded-md bg-slate-700 text-slate-300 text-xs font-medium border border-slate-600">
                                             {fac}
                                          </span>
                                       ))}
                                    </div>
                                 </div>

                                 {/* --- ACTIVE MATCHES SECTION --- */}
                                 <div className="pb-20">
                                    <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                                       <Users className="w-4 h-4 text-blue-500" />
                                       BURADA RAKİP ARAYANLAR ({activeMatches.length})
                                    </h4>

                                    {activeMatches.length > 0 ? (
                                       <div className="space-y-6">
                                          {Object.keys(groupedMatches).map(date => (
                                             <div key={date}>
                                                {/* Date Divider */}
                                                <div className="flex items-center gap-2 mb-3">
                                                   <Calendar className="w-4 h-4 text-turf-500" />
                                                   <span className="text-sm font-bold text-turf-400 uppercase tracking-wide">
                                                      {getRelativeDateLabel(date)}
                                                   </span>
                                                   <div className="flex-1 h-px bg-slate-700"></div>
                                                </div>

                                                <div className="space-y-3">
                                                   {groupedMatches[date].map((announcement: any) => {
                                                      const team = announcement.team;
                                                      const isOwnTeam = announcement.teamId === currentUser?.team?.id;
                                                      const existingChallenge = myChallenges.find(c => c.toMatchId === announcement.id && c.status === 'PENDING');

                                                      return (
                                                         <div key={announcement.id} className={`p-4 rounded-2xl border flex flex-col gap-3 group transition-colors relative overflow-hidden ${isOwnTeam
                                                            ? 'bg-turf-900/20 border-turf-500/50'
                                                            : 'bg-slate-800 border-slate-700 hover:border-turf-500/50'
                                                            }`}>
                                                            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-xl ${isOwnTeam ? 'bg-turf-600/20' : 'bg-turf-500/10'}`}></div>

                                                            {isOwnTeam && (
                                                               <div className="bg-turf-600/20 border border-turf-500/50 rounded-xl px-3 py-2 flex items-center gap-2 relative z-10">
                                                                  <Shield className="w-4 h-4 text-turf-400" />
                                                                  <span className="text-turf-300 text-xs font-bold uppercase">Sizin İlanınız</span>
                                                               </div>
                                                            )}

                                                            <div className="flex items-center justify-between relative z-10">
                                                               <div className="flex items-center gap-3">
                                                                  <img src={team?.logoUrl || '/default-team-logo.png'} className="w-14 h-14 rounded-full border-2 border-slate-600 object-cover bg-slate-900 shadow-md" alt={team?.name} />
                                                                  <div>
                                                                     <div className="text-white font-bold text-lg font-sport tracking-wide italic">{team?.name}</div>
                                                                     <div className="flex items-center gap-2 mt-1">
                                                                        <LevelBadge level={team?.level || 'INTERMEDIATE'} />
                                                                        <span className="text-xs text-white font-bold bg-slate-700 px-2 py-0.5 rounded flex items-center gap-1">
                                                                           <Clock className="w-3 h-3" /> {announcement.time}
                                                                        </span>
                                                                     </div>
                                                                  </div>
                                                               </div>
                                                               {team && <FairPlayScore score={team.fairPlayScore || 0} />}
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-700/50 relative z-10">
                                                               <button
                                                                  onClick={() => {
                                                                     if (team) setViewingTeam(team);
                                                                  }}
                                                                  className="bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                                                               >
                                                                  <Shield className="w-4 h-4" /> Rakibi Görüntüle
                                                               </button>

                                                               {isOwnTeam ? (
                                                                  isAuthorized() ? (
                                                                     <button
                                                                        onClick={() => handleDeleteAdClick(announcement.id)}
                                                                        className="bg-turf-900/30 border border-turf-500/30 text-turf-400 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-900/30 hover:text-red-400 hover:border-red-900/50 transition-all group"
                                                                     >
                                                                        <span className="group-hover:hidden flex items-center gap-2"><Shield className="w-4 h-4" /> İlanınız Aktif</span>
                                                                        <span className="hidden group-hover:flex items-center gap-2"><X className="w-4 h-4" /> İlanı Kaldır</span>
                                                                     </button>
                                                                  ) : (
                                                                     <div className="bg-turf-900/20 border border-turf-500/20 text-turf-500 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                                                                        <Shield className="w-4 h-4" /> Sizin İlanınız
                                                                     </div>
                                                                  )
                                                               ) : existingChallenge ? (
                                                                  <button
                                                                     onClick={() => handleCancelClick(existingChallenge.id)}
                                                                     className="bg-slate-700/50 border border-slate-600/50 text-slate-400 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-900/30 hover:text-red-400 hover:border-red-900/50 transition-all group"
                                                                  >
                                                                     <span className="group-hover:hidden flex items-center gap-2"><Clock className="w-4 h-4" /> İstek Gönderildi</span>
                                                                     <span className="hidden group-hover:flex items-center gap-2"><X className="w-4 h-4" /> İsteği İptal Et</span>
                                                                  </button>
                                                               ) : (
                                                                  <button
                                                                     onClick={() => setOfferMode({ matchId: announcement.id, teamName: team?.name || '' })}
                                                                     className="bg-turf-600 text-white hover:bg-turf-500 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-turf-600/20"
                                                                  >
                                                                     <Trophy className="w-4 h-4" /> Maç Teklifi Et
                                                                  </button>
                                                               )}
                                                            </div>
                                                         </div>
                                                      );
                                                   })}
                                                </div>
                                             </div>
                                          ))}
                                       </div>
                                    ) : (
                                       <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/50">
                                          <p className="text-slate-500 text-sm mb-3">Bu sahada henüz aktif ilan yok.</p>
                                          {isAuthorized() && (
                                             <button
                                                onClick={() => handleCreateAd(selectedPitch.id)}
                                                className="text-slate-900 bg-turf-500 px-6 py-2 rounded-lg text-sm font-bold hover:scale-105 transition-transform"
                                             >
                                                İlk ilanı sen aç!
                                             </button>
                                          )}
                                       </div>
                                    )}
                                 </div>
                              </>
                           ) : (
                              <div className="text-center text-slate-500 p-4">Lütfen bir saha seçin.</div>
                           )}
                        </div>
                     )}
                  </div>
               );
            })}
         </div>
      </div>
   );
};
