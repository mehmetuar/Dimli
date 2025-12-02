
import React, { useState, useEffect } from 'react';
import { MOCK_PITCHES, CURRENT_USER } from '../constants';
import { MapPin, Calendar, Clock, ChevronRight, Filter, Shield, Lock } from 'lucide-react';
import { LevelBadge } from '../components/LevelBadge';
import { FairPlayScore } from '../components/FairPlayScore';
import { CreateMatchModal } from '../components/CreateMatchModal';
import { ChallengeModal } from '../components/ChallengeModal';
import api from '../services/api';

export const Marketplace: React.FC = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);

  // Find user's team from currentUser
  const myTeam = currentUser?.team;

  // Check if user is authorized (captain or vice-captain)
  const isAuthorized = () => {
    if (!myTeam || !currentUser) return false;
    return myTeam.captainId === currentUser.id || myTeam.viceCaptainIds?.includes(currentUser.id) || false;
  };

  const canChallenge = !!myTeam && (myTeam.captainId === currentUser?.id || myTeam.viceCaptainIds?.includes(currentUser?.id));

  const handleOpenChallengeModal = (match: any) => {
    setSelectedMatch(match);
    setIsChallengeModalOpen(true);
  };

  const handleSubmitChallenge = async (note: string) => {
    if (!myTeam || !selectedMatch) return;
    try {
      await api.post('/challenges', {
        fromTeamId: myTeam.id,
        toMatchId: selectedMatch.id,
        note
      });
      alert('Meydan okuma gönderildi!');
    } catch (error) {
      console.error('Failed to send challenge:', error);
      alert('Meydan okuma gönderilemedi.');
    }
  };

  // Fetch current user and match announcements
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const userResponse = await api.get('/users/me');
        setCurrentUser(userResponse.data);

        // Get match announcements
        const announcementsResponse = await api.get('/match-announcements');
        setMatches(announcementsResponse.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-pitch flex items-center justify-center">
        <div className="text-white text-xl">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto min-h-screen bg-pitch">
      <CreateMatchModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <header className="mb-8">
        <h1 className="font-sport font-black text-5xl text-white uppercase italic tracking-tighter leading-none">
          MAÇ <span className="text-turf-500">PAZARI</span>
        </h1>
        <p className="text-slate-400 mt-2 font-medium">Sahaya çıkmaya hazır mısın kaptan?</p>
      </header>

      {/* Quick Filters - Glassmorphism */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-4 scrollbar-hide mask-linear">
        <button className="flex items-center gap-2 px-5 py-2.5 bg-turf-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-turf-600/20 whitespace-nowrap transform hover:-translate-y-1 transition-transform skew-x-[-6deg]">
          <span className="skew-x-[6deg] flex items-center gap-2"><Filter className="w-4 h-4" /> TÜMÜ</span>
        </button>
        {['YAKINIMDA', 'BU AKŞAM', 'ORTA SEVİYE'].map((label) => (
          <button key={label} className="px-5 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm font-bold whitespace-nowrap hover:border-turf-500 hover:text-white transition-colors skew-x-[-6deg]">
            <span className="skew-x-[6deg]">{label}</span>
          </button>
        ))}
      </div>

      {/* Match List - Card Design */}
      <div className="space-y-5">
        {matches.map((announcement) => {
          const isOwnTeam = announcement.teamId === myTeam?.id;
          const pitch = MOCK_PITCHES.find(p => p.id === announcement.pitchId);

          return (
            <div
              key={announcement.id}
              className={`group relative rounded-3xl border overflow-hidden transition-all duration-300 ${isOwnTeam
                ? 'bg-turf-900/20 border-turf-500/50'
                : 'bg-slate-800 border-slate-700 hover:border-turf-500/50 hover:shadow-neon'
                }`}
            >
              {/* Decorative Background Element */}
              <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-2xl transition-colors ${isOwnTeam ? 'bg-turf-600/20' : 'bg-slate-700/20 group-hover:bg-turf-600/10'
                }`}></div>

              <div className="p-5 relative z-10">
                {/* Own Team Banner */}
                {isOwnTeam && (
                  <div className="mb-4 bg-turf-600/20 border border-turf-500/50 rounded-xl px-4 py-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-turf-400" />
                    <span className="text-turf-300 text-xs font-bold uppercase">Sizin İlanınız</span>
                  </div>
                )}

                {/* Header: Team & Level */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img src={announcement.team?.logoUrl || '/default-team-logo.png'} alt={announcement.team?.name} className="w-14 h-14 rounded-full bg-slate-900 object-cover border-2 border-slate-600 shadow-lg" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-sport font-bold text-2xl text-white uppercase italic tracking-wide">{announcement.team?.name}</h3>
                        <FairPlayScore score={announcement.team?.fairPlayScore || 0} />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <LevelBadge level={announcement.team?.level || 'INTERMEDIATE'} />
                        <span className="text-[10px] font-bold text-turf-500 bg-turf-900/30 px-2 py-0.5 rounded border border-turf-500/20">RAKİP ARANIYOR</span>
                      </div>
                    </div>
                  </div>

                  {/* Player Count */}
                  <div className="text-center bg-slate-900/50 p-2 rounded-lg border border-slate-700/50 backdrop-blur-sm min-w-[80px]">
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">Oyuncu</span>
                    <span className="block text-lg font-bold text-white">{announcement.playerCount}v{announcement.playerCount}</span>
                  </div>
                </div>

                {/* Match Details Grid */}
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
                      <div className="text-sm font-bold text-slate-200">{announcement.time}</div>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                    <div className="bg-slate-800 p-2 rounded-lg">
                      <MapPin className="w-4 h-4 text-turf-500" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Saha & Konum</div>
                      <div className="text-sm font-bold text-slate-200 truncate">{pitch?.name}, {pitch?.location}</div>
                    </div>
                  </div>
                </div>

                {announcement.description && (
                  <div className="mb-4 text-sm text-slate-400 italic">
                    "{announcement.description}"
                  </div>
                )}

                {/* Action Button */}
                {isOwnTeam ? (
                  <div className="w-full bg-turf-900/30 border border-turf-500/30 text-turf-400 py-3.5 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                    <Shield className="w-4 h-4" />
                    İlanınız Aktif
                  </div>
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

      {/* Challenge Modal */}
      {selectedMatch && (
        <ChallengeModal
          isOpen={isChallengeModalOpen}
          onClose={() => setIsChallengeModalOpen(false)}
          match={{
            id: selectedMatch.id,
            teamName: selectedMatch.teamName,
            teamLogo: selectedMatch.teamLogo,
            date: selectedMatch.date,
            time: selectedMatch.time,
            location: selectedMatch.location
          }}
          onSubmit={handleSubmitChallenge}
        />
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="fixed bottom-24 right-6 bg-turf-600 text-white p-4 rounded-2xl shadow-xl shadow-turf-600/40 hover:scale-110 transition-transform z-40 border-2 border-white/20 rotate-3 hover:rotate-0"
      >
        <span className="font-black text-2xl leading-none">+</span>
      </button>
    </div>
  );
};
