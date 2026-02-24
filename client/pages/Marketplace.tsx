
import React, { useState, useEffect } from 'react';
import { Filter, Search, Plus, Calendar, MapPin, Clock, ChevronRight, Shield, Users, Star, Lock, X, TurkishLira } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { LevelBadge } from '../components/LevelBadge';
import { FairPlayScore } from '../components/FairPlayScore';
import { CreateMatchModal } from '../components/CreateMatchModal';
import { ChallengeModal } from '../components/ChallengeModal';
import { TeamDetailModal } from '../components/TeamDetailModal';

import { SuccessModal } from '../components/SuccessModal';
import { ConfirmModal } from '../components/ConfirmModal';
import api from '../services/api';

import { LocationFilter, LocationFilterModal } from '../components/LocationFilterModal';
import { calculateDistance } from '../utils/location';
import { Business, Pitch } from '../types';

export const Marketplace: React.FC = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]); // New: Fetch businesses
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [myChallenges, setMyChallenges] = useState<any[]>([]);
  const [confirmCancelModal, setConfirmCancelModal] = useState<{ isOpen: boolean; challengeId: string | null }>({ isOpen: false, challengeId: null });
  const [confirmDeleteAdModal, setConfirmDeleteAdModal] = useState<{ isOpen: boolean; adId: string | null }>({ isOpen: false, adId: null });

  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    message: string;
    type: 'CHALLENGE_SENT' | 'DEFAULT' | 'CREATE_AD' | 'CHALLENGE_ACCEPTED';
  }>({ isOpen: false, message: '', type: 'DEFAULT' });

  // Location Filter State
  const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState<LocationFilter>({ type: 'ALL' });

  const navigate = useNavigate();
  const myTeam = currentUser?.team;

  const isAuthorized = () => {
    if (!myTeam || !currentUser) return false;
    return myTeam.captainId === currentUser.id || myTeam.viceCaptainIds?.includes(currentUser.id) || false;
  };

  // Helper to find Pitch and Business details
  const getPitchDetails = (pitchId: string) => {
    for (const business of businesses) {
      const pitch = business.pitches?.find(p => p.id === pitchId);
      if (pitch) {
        return { pitch, business };
      }
    }
    return { pitch: null, business: null };
  };

  const getFilteredMatches = () => {
    let filtered = [...matches].filter(m => m.matchType !== 'kendi_aramizda');

    // Filter by Location
    if (locationFilter.type === 'DISTRICT' && locationFilter.value) {
      filtered = filtered.filter(m => {
        const { business, pitch } = getPitchDetails(m.pitchId);
        // Use business location
        const loc = business ? `${business.district}, ${business.city}` : m.team?.location || '';
        return loc.includes(locationFilter.value || '');
      });
    } else if (locationFilter.type === 'NEARBY' && locationFilter.coords) {
      // Skip for now or strictly use team coords if business coords missing
      // Ideally Business entity should have coords.
      // For now, let's filter based on string match or simple logic if needed.
      // fallback to ALL if no coords
    }

    return filtered;
  };

  const displayMatches = getFilteredMatches();
  const canChallenge = !!myTeam && (myTeam.captainId === currentUser?.id || myTeam.viceCaptainIds?.includes(currentUser?.id));

  const handleOpenChallengeModal = (match: any) => {
    setSelectedMatch(match);
    setIsChallengeModalOpen(true);
  };

  const handleSubmitChallenge = async (note: string) => {
    if (!myTeam || !selectedMatch) return;
    try {
      const response = await api.post('/challenges', {
        fromTeamId: myTeam.id,
        toMatchId: selectedMatch.id,
        note
      });
      setMyChallenges(prev => [...prev, response.data]);
      setSuccessModal({
        isOpen: true,
        message: 'Meydan okuma başarıyla gönderildi! Rakip takım kaptanına bildirim iletildi.',
        type: 'CHALLENGE_SENT'
      });
      setIsChallengeModalOpen(false);
    } catch (error: any) {
      console.error('Failed to send challenge:', error);
      if (error.response?.data?.message === 'Bu maça zaten meydan okudunuz. Cevap bekleniyor.') {
        setSuccessModal({
          isOpen: true,
          message: 'Bu maça zaten meydan okudunuz. Rakip takımın cevabı bekleniyor.',
          type: 'DEFAULT'
        });
        setIsChallengeModalOpen(false);
      } else {
        alert('Meydan okuma gönderilemedi.');
      }
    }
  };

  const handleCancelClick = (challengeId: string) => {
    setConfirmCancelModal({ isOpen: true, challengeId });
  };

  const handleConfirmCancel = async () => {
    if (!confirmCancelModal.challengeId) return;
    try {
      await api.delete(`/challenges/${confirmCancelModal.challengeId}`);
      setMyChallenges(prev => prev.filter(c => c.id !== confirmCancelModal.challengeId));
      setSuccessModal({
        isOpen: true,
        message: 'Meydan okuma isteği iptal edildi.',
        type: 'DEFAULT'
      });
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
      setMatches(prev => prev.filter(m => m.id !== confirmDeleteAdModal.adId));
      if (selectedMatch?.id === confirmDeleteAdModal.adId) {
        setSelectedMatch(null);
      }
      setSuccessModal({
        isOpen: true,
        message: 'İlan başarıyla kaldırıldı.',
        type: 'DEFAULT'
      });
    } catch (error) {
      console.error('Failed to delete ad:', error);
      alert('İlan silinemedi.');
    } finally {
      setConfirmDeleteAdModal({ isOpen: false, adId: null });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userResponse = await api.get('/users/me');
        console.log('👤 Current User:', userResponse.data);
        setCurrentUser(userResponse.data);

        const announcementsResponse = await api.get('/match-announcements');
        setMatches(announcementsResponse.data);

        // Fetch Businesses to resolve pitch names
        const businessResponse = await api.get('/businesses');
        setBusinesses(businessResponse.data);

        if (userResponse.data?.team) {
          try {
            const challengesRes = await api.get(`/challenges/team/${userResponse.data.team.id}`);
            setMyChallenges(challengesRes.data);
          } catch (err) {
            console.error('Failed to fetch my challenges', err);
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
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

      <header className="mb-8">
        <h1 className="font-sport font-black text-5xl text-white uppercase italic tracking-tighter leading-none">
          MAÇ <span className="text-turf-500">PAZARI</span>
        </h1>
        <p className="text-slate-400 mt-2 font-medium">Sahaya çıkmaya hazır mısın kaptan?</p>
      </header>

      {/* Quick Filters */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-4 scrollbar-hide mask-linear">
        <button
          onClick={() => setLocationFilter({ type: 'ALL' })}
          className={`flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-bold shadow-lg shadow-turf-600/20 whitespace-nowrap transform hover:-translate-y-1 transition-transform skew-x-[-6deg] ${locationFilter.type === 'ALL' ? 'bg-turf-600' : 'bg-slate-800'}`}
        >
          <span className="skew-x-[6deg] flex items-center gap-2"><Filter className="w-4 h-4" /> İstanbul (Tümü)</span>
        </button>

        <button
          onClick={() => setIsLocationFilterOpen(true)}
          className={`px-5 py-2.5 border text-slate-300 rounded-xl text-sm font-bold whitespace-nowrap hover:border-turf-500 hover:text-white transition-colors skew-x-[-6deg] ${locationFilter.type !== 'ALL' ? 'bg-turf-900/50 border-turf-500 text-white' : 'bg-slate-800 border-slate-700'}`}
        >
          <span className="skew-x-[6deg] flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {locationFilter.type === 'NEARBY' ? `Yakınımda (${locationFilter.radius}km)` : locationFilter.type === 'DISTRICT' ? locationFilter.value : 'İstanbul (Tümü)'}
          </span>
        </button>
      </div>

      <div className="space-y-5">
        {displayMatches.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            {matches.length === 0
              ? "Henüz aktif ilan yok. İlk ilanı sen oluştur!"
              : "Seçilen kriterlere uygun ilan bulunamadı."}
          </div>
        )}

        {displayMatches.map((announcement) => {
          const isOwnTeam = announcement.teamId === myTeam?.id;
          const { pitch, business } = getPitchDetails(announcement.pitchId);

          return (
            <div
              key={announcement.id}
              className={`group relative rounded-3xl border overflow-hidden transition-all duration-300 ${isOwnTeam
                ? 'bg-turf-900/20 border-turf-500/50'
                : 'bg-slate-800 border-slate-700 hover:border-turf-500/50 hover:shadow-neon'
                }`}
            >
              <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-2xl transition-colors ${isOwnTeam ? 'bg-turf-600/20' : 'bg-slate-700/20 group-hover:bg-turf-600/10'
                }`}></div>

              <div className="p-5 relative z-10">
                {isOwnTeam && (
                  isAuthorized() ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAdClick(announcement.id);
                      }}
                      className="w-full mb-4 bg-turf-900/30 border border-turf-500/30 text-turf-400 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-900/30 hover:text-red-400 hover:border-red-900/50 transition-all group"
                    >
                      <span className="group-hover:hidden flex items-center gap-2">
                        <Shield className="w-4 h-4" /> Sizin İlanınız (Aktif)
                      </span>
                      <span className="hidden group-hover:flex items-center gap-2">
                        <X className="w-4 h-4" /> İlanı Kaldır
                      </span>
                    </button>
                  ) : (
                    <div className="w-full mb-4 bg-turf-900/20 border border-turf-500/20 text-turf-500 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                      <Shield className="w-4 h-4" /> Sizin İlanınız (Yönetici Değilsiniz)
                    </div>
                  )
                )}

                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="relative cursor-pointer hover:scale-105 transition-transform"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (announcement.teamId) setSelectedTeamId(announcement.teamId);
                      }}
                    >
                      <img src={announcement.team?.logoUrl || '/default-team-logo.png'} alt={announcement.team?.name} className="w-14 h-14 rounded-full bg-slate-900 object-cover border-2 border-slate-600 shadow-lg" />
                    </div>
                    <div
                      className="cursor-pointer group/team"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (announcement.teamId) setSelectedTeamId(announcement.teamId);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="font-sport font-bold text-2xl text-white uppercase italic tracking-wide group-hover/team:text-turf-500 transition-colors">{announcement.team?.name}</h3>
                        <FairPlayScore score={announcement.team?.fairPlayScore || 0} />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <LevelBadge level={announcement.team?.level || 'INTERMEDIATE'} />
                        <span className="text-[10px] font-bold text-turf-500 bg-turf-900/30 px-2 py-0.5 rounded border border-turf-500/20">RAKİP ARANIYOR</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center bg-slate-900/50 p-2 rounded-lg border border-slate-700/50 backdrop-blur-sm min-w-[80px]">
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">Oyuncu</span>
                    <span className="block text-lg font-bold text-white">{announcement.playerCount}v{announcement.playerCount}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                    <div className="bg-slate-800 p-2 rounded-lg">
                      <Calendar className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Tarih</div>
                      <div className="text-sm font-bold text-slate-200">{announcement.date}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                    <div className="bg-slate-800 p-2 rounded-lg">
                      <Clock className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Saat</div>
                      <div className="text-sm font-bold text-slate-200">
                        {announcement.time} - {`${(parseInt(announcement.time.split(':')[0]) + 1).toString().padStart(2, '0')}:${announcement.time.split(':')[1]}`}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                    <div className="bg-slate-800 p-2 rounded-lg">
                      <MapPin className="w-4 h-4 text-turf-500" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Saha & Konum</div>
                      {/* --- Updated Pitch/Business Display --- */}
                      <div className="text-sm font-bold text-slate-200 truncate flex flex-wrap gap-x-2 items-center">
                        {pitch ? (
                          <>
                            <span className="text-turf-400">{business?.name}</span>
                            <span className="text-slate-500">-</span>
                            <span>{pitch.name}</span>
                            <span className="flex items-center gap-1 text-xs text-turf-400 bg-turf-900/40 px-2 py-0.5 rounded-md border border-turf-500/20 whitespace-nowrap">
                              <MapPin className="w-3 h-3" />
                              {business?.district}
                            </span>
                          </>
                        ) : (
                          'Saha Bilgisi Yükleniyor'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price Display */}
                  <div className="col-span-2 flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                    <div className="bg-slate-800 p-2 rounded-lg">
                      <TurkishLira className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Saha Ücreti (Takım Başı)</div>
                      <div className="text-sm font-bold text-slate-200">
                        {pitch ? (
                          <span className="text-green-400 flex items-center gap-1">
                            {pitch.pricePerHour / 2} <TurkishLira size={12} className="stroke-[3]" />
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">Fiyat Bilgisi Yok</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {announcement.description && (
                  <div className="mb-4 text-sm text-slate-400 italic">
                    "{announcement.description}"
                  </div>
                )}

                {isOwnTeam ? (
                  <div className="w-full bg-turf-900/30 border border-turf-500/30 text-turf-400 py-3.5 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                    <Shield className="w-4 h-4" />
                    İlanınız Aktif
                  </div>
                ) : myChallenges.find(c => c.toMatchId === announcement.id && c.status === 'PENDING') ? (
                  <button
                    onClick={() => handleCancelClick(myChallenges.find(c => c.toMatchId === announcement.id && c.status === 'PENDING').id)}
                    className="w-full bg-slate-700/50 border border-slate-600/50 text-slate-400 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-red-900/30 hover:text-red-400 hover:border-red-900/50 transition-all group"
                  >
                    <span className="group-hover:hidden flex items-center gap-2"><Clock className="w-4 h-4" /> İstek Gönderildi</span>
                    <span className="hidden group-hover:flex items-center gap-2"><X className="w-4 h-4" /> İsteği İptal Et</span>
                  </button>
                ) : canChallenge ? (
                  <button
                    onClick={() => handleOpenChallengeModal(announcement)}
                    className="w-full bg-turf-600 text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-turf-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-turf-600/20"
                  >
                    Meydan Oku <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <div className="w-full bg-slate-700/50 text-slate-500 py-3.5 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-600/50 cursor-not-allowed">
                    <Lock className="w-4 h-4" />
                    Sadece Kaptan ve Yardımcıları
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
            // --- Updated Props for Challenge Modal ---
            pitchName: getPitchDetails(selectedMatch.pitchId).pitch?.name || 'Bilinmeyen Saha',
            pitchLocation: (() => {
              const { business } = getPitchDetails(selectedMatch.pitchId);
              return business ? `${business.district}, ${business.city}` : 'Konum Yok';
            })(),
            businessName: getPitchDetails(selectedMatch.pitchId).business?.name,
            pricePerTeam: getPitchDetails(selectedMatch.pitchId).pitch?.pricePerHour ? getPitchDetails(selectedMatch.pitchId).pitch!.pricePerHour / 2 : undefined
          }}
          onSubmit={handleSubmitChallenge}
        />
      )}

      {isAuthorized() && (
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
