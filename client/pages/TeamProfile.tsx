


import React, { useState, useEffect } from 'react';
import { MOCK_TEAMS, MOCK_PITCHES, MOCK_JOKERS, MOCK_MATCH_HISTORY } from '../constants';
import { generateTeamBio } from '../services/geminiService';
import { FairPlayScore } from '../components/FairPlayScore';
import { LevelBadge } from '../components/LevelBadge';
import { MapPin, Shield, Sparkles, Edit2, Plus, X, UserPlus, LogOut, Crown, MoreVertical, Trash2, Save, History, ShieldX, Check, Menu, Settings, User, ChevronRight } from 'lucide-react';
import { Team, Player, Position } from '../types';
import { CreateTeamModal } from '../components/CreateTeamModal';
import { JoinTeamModal } from '../components/JoinTeamModal';
import { AddPlayerModal } from '../components/AddPlayerModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { MatchHistoryModal } from '../components/MatchHistoryModal';
import { CreateMatchModal } from '../components/CreateMatchModal';
import { SuccessModal, SuccessType } from '../components/SuccessModal';
import api from '../services/api';

export const TeamProfile: React.FC = () => {
  // State to toggle between Player View and Team View
  const [activeTab, setActiveTab] = useState<'PLAYER' | 'TEAM'>('PLAYER');

  // State for real user data
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Local state for the current team
  const [myTeam, setMyTeam] = useState<Team | undefined>(undefined);

  // Local state for roster
  const [roster, setRoster] = useState<Partial<Player>[]>([]);

  const [bio, setBio] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditingPitch, setIsEditingPitch] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [isJoinTeamModalOpen, setIsJoinTeamModalOpen] = useState(false);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [isMatchHistoryOpen, setIsMatchHistoryOpen] = useState(false);
  const [isCreateMatchModalOpen, setIsCreateMatchModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTeamMenuOpen, setIsTeamMenuOpen] = useState(false);

  // Confirmation modal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDangerous?: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

  // Player actions modal state
  const [playerActionsModal, setPlayerActionsModal] = useState<{
    isOpen: boolean;
    player: Partial<Player> | null;
  }>({ isOpen: false, player: null });

  // Toggle modal-open class on body
  useEffect(() => {
    if (playerActionsModal.isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [playerActionsModal.isOpen]);

  // Success/Error messages
  const [successMessage, setSuccessMessage] = useState('');
  const [successType, setSuccessType] = useState<SuccessType | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-hide success/error messages after 3 seconds
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
        setSuccessType(null); // Clear successType as well
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage]);

  // Fetch User Data on Mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('/users/me');
        const user = response.data;
        setCurrentUser(user);

        if (user.team) {
          // Fetch full team details to get captain, players etc.
          const teamResponse = await api.get(`/teams/${user.team.id}`);
          const fullTeam = teamResponse.data;

          setMyTeam(fullTeam);
          setBio(fullTeam.description || '');

          // Map backend players to frontend format
          if (fullTeam.players) {
            const mappedRoster = fullTeam.players.map((p: any) => ({
              id: p.id,
              name: p.full_name || p.username,
              position: p.position || 'Orta Saha',
              avatarUrl: 'https://picsum.photos/100/100?random=' + p.id,
              rating: p.rating || 0
            }));
            setRoster(mappedRoster);
          }
        }
      } catch (error) {
        console.error("Failed to fetch user profile", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Actions
  const handleGenerateBio = async () => {
    if (!myTeam) return;
    setIsGenerating(true);
    const newBio = await generateTeamBio(myTeam.name, myTeam.level, myTeam.location);
    setBio(newBio);
    // Also save to team object
    const updatedTeam = { ...myTeam, description: newBio };
    setMyTeam(updatedTeam);
    setIsGenerating(false);
  };

  const handleSaveBio = async () => {
    if (!myTeam) return;
    try {
      const response = await api.patch(`/teams/${myTeam.id}/description`, {
        description: bio
      });
      setMyTeam(response.data);
      setIsEditingBio(false);
      console.log('✅ Team description saved:', bio);
    } catch (error) {
      console.error('❌ Failed to save description:', error);
      setErrorMessage('Takım ruhu kaydedilemedi.');
    }
  };

  const handleSetHomePitch = async (pitchId: string) => {
    if (!myTeam) return;
    try {
      const response = await api.patch(`/teams/${myTeam.id}/home-pitch`, {
        homePitchId: pitchId
      });
      setMyTeam(response.data);
      setIsEditingPitch(false);
      setSuccessMessage('Ev sahibi saha başarıyla ayarlandı!');
    } catch (error) {
      console.error('Failed to set home pitch:', error);
      setErrorMessage('Ev sahibi saha ayarlanamadı.');
    }
  };

  // Handle CREATE TEAM
  const handleCreateTeam = async (teamData: Partial<Team>) => {
    try {
      // Call API to create team
      const response = await api.post('/teams', teamData);

      // Update local state with new team
      setMyTeam(response.data);

      // Close modal
      setIsCreateTeamModalOpen(false);

      // Trigger Custom Success Modal
      setSuccessMessage('Takım başarıyla oluşturuldu!');
      setSuccessType('TEAM_CREATED');

      // Note: Page reload is handled by the modal's "OK" button now
    } catch (error: any) {
      console.error('Failed to create team:', error);
      setErrorMessage(error.response?.data?.message || 'Takım oluşturulamadı.');
    }
  };

  const handleLeaveTeam = () => {
    if (!myTeam) return;
    const isCaptain = myTeam.captain?.id === currentUser.id || myTeam.captainId === currentUser.id;

    if (isCaptain) {
      setConfirmModal({
        isOpen: true,
        title: 'Uyarı',
        message: 'Takım kaptanısın. Ayrılmadan önce kaptanlığı başka bir oyuncuya devretmelisin.',
        onConfirm: () => { }, // Just close the modal
        isDangerous: false
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Takımdan Ayrıl',
      message: `${myTeam.name} takımından ayrılmak istediğine emin misin?`,
      onConfirm: () => {
        // In real app: call API to leave team
        setMyTeam(undefined);
        setRoster([]);
        setActiveTab('PLAYER');
      },
      isDangerous: true
    });
  };

  const handleKickPlayer = async (playerId: string) => {
    if (!myTeam) return;
    if (confirm("Bu oyuncuyu takımdan çıkarmak istiyor musun?")) {
      try {
        await api.delete(`/teams/${myTeam.id}/players/${playerId}`);
        setRoster(prev => prev.filter(p => p.id !== playerId));
        setSuccessMessage('Oyuncu takımdan atıldı.');
        setSuccessType('KICK');
      } catch (error: any) {
        console.error("Failed to kick player", error);
        setErrorMessage(error.response?.data?.message || "Oyuncu çıkarılamadı.");
      }
    }
  };

  // Handle removing vice-captain (Revoke)
  const handleRevokeViceCaptain = async (playerId: string) => {
    console.log('Revoking vice captain role for:', playerId);
    try {
      if (!myTeam?.id) return;

      const response = await api.patch(`/teams/${myTeam.id}/vice-captains`, {
        remove: playerId
      });

      console.log('Revoke response:', response.data);
      setMyTeam(response.data);
      setSuccessMessage('Oyuncunun yetkileri alındı.');
      setSuccessType('ROLE_REMOVED');
    } catch (error: any) {
      console.error('Failed to remove vice-captain:', error);
      setErrorMessage(error.response?.data?.message || 'İşlem başarısız.');
    }
  };

  const handlePromotePlayer = async (playerId: string, role: 'CAPTAIN' | 'VICE') => {
    if (!myTeam) return;
    try {
      const response = await api.patch(`/teams/${myTeam.id}/players/${playerId}/role`, { role });
      setMyTeam(response.data); // Update state instead of reload

      if (role === 'CAPTAIN') {
        setSuccessMessage('Kaptanlık başarıyla devredildi.');
        setSuccessType('CAPTAIN');
      } else {
        setSuccessMessage('Oyuncu yardımcı kaptan yapıldı.');
        setSuccessType('VICE');
      }
    } catch (error: any) {
      console.error("Failed to promote player", error);
      setErrorMessage(error.response?.data?.message || "Rol güncellenemedi.");
    }
  };

  const selectedHomePitch = MOCK_PITCHES.find(p => p.id === myTeam?.homePitchId);

  // Check if current user is captain or vice captain (for permissions throughout component)
  const isCaptain = myTeam ? ((myTeam.captain && (myTeam.captain as any).id === currentUser?.id) || myTeam.captainId === currentUser?.id) : false;
  const isViceCaptain = myTeam?.viceCaptainIds?.includes(currentUser?.id) || false;

  // Resolve Guest Players
  const guestPlayers: Player[] = [];
  if (myTeam?.guestPlayerIds) {
    myTeam.guestPlayerIds.forEach(id => {
      const joker = MOCK_JOKERS.find(j => j.id === id);
      if (joker) guestPlayers.push(joker);
    });
  }

  if (loading) {
    return <div className="min-h-screen bg-pitch flex items-center justify-center text-white">Yükleniyor...</div>;
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-pitch flex flex-col items-center justify-center text-white gap-4">
        <p>Kullanıcı bulunamadı. Lütfen giriş yapın.</p>
        <button
          onClick={() => window.location.href = '/login'}
          className="px-6 py-3 bg-turf-600 text-white font-bold rounded-xl hover:bg-turf-500 transition-colors"
        >
          Giriş Yap
        </button>
      </div>
    );
  }

  // --- SUB-COMPONENT: PLAYER CARD ---
  const PlayerCard = () => (
    <div className="animate-fade-in">
      {/* Logout Button - Top Right */}


      <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

        <div className="relative z-10 p-6 flex flex-col items-center">
          <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-r from-turf-500 to-blue-500 mb-4 relative group-avatar">
            <img
              src={'https://picsum.photos/100/100?random=1'}
              alt="Profile"
              className="w-full h-full rounded-full object-cover border-4 border-slate-900"
            />
            <button
              onClick={() => setIsMenuOpen(true)}
              className="absolute -right-2 -bottom-2 bg-slate-800 text-white p-2.5 rounded-full border border-slate-600 shadow-lg hover:bg-slate-700 hover:scale-110 transition-all z-20"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          <h2 className="font-sport font-bold text-4xl text-white uppercase italic tracking-wide mb-1">
            {currentUser.full_name || currentUser.username}
          </h2>
          <div className="flex items-center gap-2 text-slate-400 mb-6">
            <MapPin className="w-4 h-4 text-turf-500" /> {currentUser.location || 'İstanbul'}
          </div>

          <div className="grid grid-cols-2 gap-4 w-full mb-6">
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex items-center justify-between">
              <span className="text-slate-400 text-xs font-bold uppercase">Mevki</span>
              <span className="text-turf-400 font-sport text-2xl font-bold">{currentUser.position || '-'}</span>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex items-center justify-between">
              <span className="text-slate-400 text-xs font-bold uppercase">Ayak</span>
              <span className="text-white font-sport text-2xl font-bold">SAĞ</span>
            </div>
          </div>

          <div className="w-full space-y-3">
            {/* Mock Stats for now */}
            <div className="flex items-center gap-3">
              <div className="w-8 text-center font-sport font-bold text-xl text-white">85</div>
              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-turf-500" style={{ width: `85 % ` }}></div>
              </div>
              <div className="text-xs font-bold text-slate-500 w-12 uppercase">HIZ</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );



  return (
    <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto min-h-screen bg-pitch relative">
      {/* Profile Settings Menu (Bottom Sheet) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          ></div>

          {/* Sheet */}
          <div className="bg-slate-800 w-full max-w-md rounded-t-3xl border-t border-slate-700 shadow-2xl z-[70] animate-slide-up pb-safe-bottom">
            {/* Handle */}
            <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setIsMenuOpen(false)}>
              <div className="w-12 h-1.5 bg-slate-600 rounded-full"></div>
            </div>

            <div className="p-6 border-b border-slate-700">
              <h3 className="text-white font-bold text-xl flex items-center gap-2">
                <User className="w-6 h-6 text-turf-500" />
                Profil Ayarları
              </h3>
              <p className="text-slate-400 text-sm mt-1">Hesabını ve tercihlerini yönet</p>
            </div>

            <div className="p-4 space-y-2">
              <button
                onClick={() => { setIsMenuOpen(false); window.location.href = '/settings/profile'; }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-700/50 hover:bg-slate-700 text-white transition-all active:scale-95"
              >
                <div className="bg-blue-500/20 p-2 rounded-full text-blue-400">
                  <Settings className="w-6 h-6" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-base">Profil Ayarları</div>
                  <div className="text-xs text-slate-400">Bilgilerini güncelle</div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </button>

              <button
                onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all active:scale-95 mt-4"
              >
                <div className="bg-red-500/20 p-2 rounded-full text-red-400">
                  <LogOut className="w-6 h-6" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-base">Çıkış Yap</div>
                  <div className="text-xs text-red-400/70">Oturumu sonlandır</div>
                </div>
              </button>
            </div>

            {/* Cancel Button */}
            <div className="p-4 pt-0">
              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-full py-4 text-center text-slate-500 font-bold hover:text-white transition-colors"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Team Settings Menu (Bottom Sheet) */}
      {isTeamMenuOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsTeamMenuOpen(false)}
          ></div>

          {/* Sheet */}
          <div className="bg-slate-800 w-full max-w-md rounded-t-3xl border-t border-slate-700 shadow-2xl z-[70] animate-slide-up pb-safe-bottom">
            {/* Handle */}
            <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setIsTeamMenuOpen(false)}>
              <div className="w-12 h-1.5 bg-slate-600 rounded-full"></div>
            </div>

            <div className="p-6 border-b border-slate-700">
              <h3 className="text-white font-bold text-xl flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-500" />
                Takım Ayarları
              </h3>
              <p className="text-slate-400 text-sm mt-1">{myTeam?.name} takımını yönet</p>
            </div>

            <div className="p-4 space-y-2">
              <button
                onClick={() => { setIsTeamMenuOpen(false); window.location.href = '/settings/team'; }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-700/50 hover:bg-slate-700 text-white transition-all active:scale-95"
              >
                <div className="bg-blue-500/20 p-2 rounded-full text-blue-400">
                  <Settings className="w-6 h-6" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-base">Takım Ayarları</div>
                  <div className="text-xs text-slate-400">Takım bilgilerini güncelle</div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Cancel Button */}
            <div className="p-4 pt-0">
              <button
                onClick={() => setIsTeamMenuOpen(false)}
                className="w-full py-4 text-center text-slate-500 font-bold hover:text-white transition-colors"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Custom Success Modal */}
      <SuccessModal
        isOpen={!!(successMessage && successType)}
        onClose={() => {
          setSuccessMessage('');
          setSuccessType(null);
          if (successType === 'TEAM_CREATED') window.location.reload();
        }}
        message={successMessage}
        type={successType || 'DEFAULT'}
        confirmText={successType === 'TEAM_CREATED' ? 'KADROYU YÖNET' : 'TAMAM'}
        onConfirm={() => {
          setSuccessMessage('');
          setSuccessType(null);
          if (successType === 'TEAM_CREATED') window.location.reload();
        }}
      />

      {/* Success Message Toast (for other actions like simple updates) */}
      {successMessage && !successType && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 bg-green-500/10 border border-green-500/50 text-green-400 px-6 py-3 rounded-xl flex items-center gap-3 animate-fade-in shadow-lg backdrop-blur-sm">
          <Check className="w-5 h-5" />
          <p className="font-bold text-sm">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 bg-red-500/10 border border-red-500/50 text-red-400 px-6 py-3 rounded-xl flex items-center gap-3 animate-fade-in shadow-lg backdrop-blur-sm">
          <X className="w-5 h-5" />
          <p className="font-bold text-sm">{errorMessage}</p>
        </div>
      )}
      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isDangerous={confirmModal.isDangerous}
        confirmText={confirmModal.isDangerous ? "Evet, Eminim" : "Tamam"}
        cancelText="İptal"
      />

      {/* Match History Modal */}
      <MatchHistoryModal
        isOpen={isMatchHistoryOpen}
        onClose={() => setIsMatchHistoryOpen(false)}
        matches={MOCK_MATCH_HISTORY}
      />

      {/* CreateMatch Modal - Pre-select home pitch and today's date */}
      <CreateMatchModal
        isOpen={isCreateMatchModalOpen}
        onClose={() => setIsCreateMatchModalOpen(false)}
        preSelectedPitchId={myTeam?.homePitchId}
      />

      <CreateTeamModal
        isOpen={isCreateTeamModalOpen}
        onClose={() => setIsCreateTeamModalOpen(false)}
        onCreate={handleCreateTeam}
      />

      <JoinTeamModal
        isOpen={isJoinTeamModalOpen}
        onClose={() => setIsJoinTeamModalOpen(false)}
      />

      <AddPlayerModal
        isOpen={isAddPlayerModalOpen}
        onClose={() => setIsAddPlayerModalOpen(false)}
        currentRosterIds={roster.map(p => p.id!)}
        teamId={myTeam?.id}
      />

      {/* Tab Switcher */}
      <div className="flex p-1 bg-slate-800 rounded-xl mb-8 border border-slate-700 sticky top-20 z-40 shadow-lg">
        <button
          onClick={() => setActiveTab('PLAYER')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'PLAYER' ? 'bg-turf-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          PROFİLİM
        </button>
        <button
          onClick={() => setActiveTab('TEAM')}
          className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'TEAM' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          TAKIMIM
        </button>
      </div>

      {activeTab === 'PLAYER' ? <PlayerCard /> : (
        !myTeam ? (
          <div className="animate-fade-in p-6 bg-slate-800 rounded-2xl border border-slate-700 text-center mt-6">
            <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-white font-bold text-lg mb-2">Henüz Bir Takımın Yok</h3>
            <p className="text-slate-400 text-sm mb-4">Bir takıma katıl veya kendi takımını kurarak sahalara hükmet.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setIsJoinTeamModalOpen(true)}
                className="px-6 py-3 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600 transition-colors"
              >
                Takım Bul
              </button>
              <button
                onClick={() => setIsCreateTeamModalOpen(true)}
                className="px-6 py-3 bg-turf-600 text-white font-bold rounded-xl hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20"
              >
                Takım Kur
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in space-y-6">
            {/* Header Card */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-${myTeam.primaryColor?.replace('bg-', '') || 'blue-500'} to-transparent opacity-20 rounded-bl-full`}></div>

              <div className="flex justify-between items-start relative z-10">
                <div className="flex items-center gap-4">
                  <img src={myTeam.logoUrl || 'https://via.placeholder.com/150'} className="w-20 h-20 rounded-full border-4 border-slate-800 bg-slate-900 object-cover shadow-lg" alt="Logo" />
                  <div>
                    <h2 className="font-sport font-black text-3xl text-white italic tracking-wide uppercase">{myTeam.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <LevelBadge level={myTeam.level} />
                      <FairPlayScore score={myTeam.fairPlayScore} />
                    </div>
                  </div>
                </div>
                {/* Leave Team Button - Always visible for non-captains, or captains who want to try (and get error) */}
                {/* Team Actions: Settings & Leave */}
                <div className="flex items-center gap-2">
                  {/* Team Settings Menu Button */}
                  <button
                    onClick={() => setIsTeamMenuOpen(true)}
                    className="p-2 bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700/50"
                  >
                    <Settings className="w-5 h-5" />
                  </button>

                  {/* Leave Team Button */}
                  <button
                    onClick={handleLeaveTeam}
                    className="p-2 bg-slate-900/50 hover:bg-red-500/20 text-slate-400 hover:text-red-500 rounded-lg transition-colors border border-slate-700/50"
                    title="Takımdan Ayrıl"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Bio Section with Manual Edit */}
              <div className="mt-6 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 group/bio">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-turf-500 text-xs font-bold uppercase tracking-widest">Takım Ruhu</span>

                  {isCaptain && !isEditingBio && (
                    <div className="flex gap-2">
                      <button onClick={() => setIsEditingBio(true)} className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
                        <Edit2 className="w-3 h-3" /> Düzenle
                      </button>
                      <button onClick={handleGenerateBio} disabled={isGenerating} className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors">
                        <Sparkles className="w-3 h-3" /> {isGenerating ? '...' : 'AI Yazsın'}
                      </button>
                    </div>
                  )}
                </div>

                {isEditingBio ? (
                  <div className="animate-fade-in">
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full bg-slate-800 text-white text-sm p-3 rounded-lg border border-slate-600 focus:border-turf-500 focus:outline-none mb-2"
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setIsEditingBio(false)} className="text-xs text-slate-400 hover:text-white px-2 py-1">İptal</button>
                      <button onClick={handleSaveBio} className="text-xs bg-turf-600 text-white px-3 py-1 rounded-lg flex items-center gap-1 font-bold">
                        <Save className="w-3 h-3" /> Kaydet
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-300 text-sm italic leading-relaxed">"{bio}"</p>
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                <div className="text-slate-400 text-xs font-bold uppercase mb-1">Galibiyet</div>
                <div className="text-white font-sport text-3xl font-bold">{myTeam.wins}</div>
              </div>
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                <div className="text-slate-400 text-xs font-bold uppercase mb-1">Mağlubiyet</div>
                <div className="text-white font-sport text-3xl font-bold text-red-400">{myTeam.losses}</div>
              </div>
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                <div className="text-slate-400 text-xs font-bold uppercase mb-1">Kazanma Oranı</div>
                <div className="text-turf-500 font-sport text-3xl font-bold">
                  {myTeam.wins + myTeam.losses > 0
                    ? `%${Math.round((myTeam.wins / (myTeam.wins + myTeam.losses)) * 100)}`
                    : '%0'}
                </div>
              </div>
            </div>

            {/* Match History Button */}
            <button
              onClick={() => setIsMatchHistoryOpen(true)}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
            >
              <History className="w-5 h-5" />
              Geçmiş Maçlar
            </button>

            {/* Home Pitch Section */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <h3 className="font-sport font-bold text-xl text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-turf-500" />
                  EV SAHİBİ SAHA
                </h3>
                {isCaptain && (
                  <button
                    onClick={() => setIsEditingPitch(!isEditingPitch)}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-lg transition-colors"
                  >
                    {selectedHomePitch ? 'Değiştir' : 'Saha Seç'}
                  </button>
                )}
              </div>

              {isEditingPitch ? (
                <div className="p-4 bg-slate-900">
                  <p className="text-xs text-slate-400 mb-3">Takımınızın favori sahasını seçin:</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {MOCK_PITCHES.map(pitch => (
                      <button
                        key={pitch.id}
                        onClick={() => handleSetHomePitch(pitch.id)}
                        className="w-full text-left p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex justify-between items-center"
                      >
                        <span className="text-white text-sm font-bold">{pitch.name}</span>
                        <span className="text-xs text-slate-400">{pitch.location}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                selectedHomePitch ? (
                  <div className="relative group">
                    <img src={selectedHomePitch.imageUrl} className="w-full h-32 object-cover opacity-60" alt="Pitch" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 to-transparent">
                      <div className="text-white font-bold text-lg">{selectedHomePitch.name}</div>
                      <div className="text-slate-300 text-xs">{selectedHomePitch.location}</div>
                    </div>
                    {isCaptain && myTeam.homePitchId && (
                      <button
                        onClick={() => {
                          // Open CreateMatchModal with pre-selected pitch
                          setIsCreateMatchModalOpen(true);
                        }}
                        className="absolute top-3 right-3 bg-turf-600 hover:bg-turf-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> İlan Oluştur
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-slate-500 text-sm">Henüz bir ev sahibi saha seçmediniz.</p>
                  </div>
                )
              )}
            </div>

            {/* Roster Management */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-sport font-bold text-xl text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" /> KADRO
                </h3>
                {isCaptain && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsAddPlayerModalOpen(true)}
                      className="bg-turf-600 hover:bg-turf-500 text-white p-1.5 rounded-lg transition-colors shadow-lg shadow-turf-600/20"
                      title="Oyuncu Ekle / Davet Et"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] bg-turf-900/50 text-turf-500 px-2 py-1 rounded font-bold uppercase border border-turf-500/20">Yönetici Modu</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Regular Players */}
                <div className="space-y-2">
                  {roster.map((player) => (
                    <div key={player.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50 hover:bg-slate-700/50 transition-colors group">
                      <div className="w-10 h-10 rounded-full bg-slate-600 overflow-hidden relative border border-slate-700">
                        <img src={player.avatarUrl} alt="Player" className="w-full h-full object-cover" />
                        {myTeam.captain?.id === player.id && (
                          <div className="absolute bottom-0 right-0 bg-yellow-500 rounded-full p-0.5 border border-slate-900" title="Kaptan">
                            <Crown className="w-2.5 h-2.5 text-black fill-black" />
                          </div>
                        )}
                        {myTeam.viceCaptainIds?.includes(player.id) && (
                          <div className="absolute bottom-0 right-0 bg-slate-400 rounded-full p-0.5 border border-slate-900" title="Kaptan Yardımcısı">
                            <Shield className="w-2.5 h-2.5 text-slate-900 fill-slate-900" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-bold flex items-center gap-2">
                          {player.name}
                          {player.id === currentUser.id && <span className="text-[10px] text-slate-500">(Sen)</span>}
                        </div>
                        <div className="text-slate-500 text-[10px] uppercase font-bold">{player.position}</div>
                      </div>

                      <div className="text-white font-sport font-bold text-lg mr-2">{player.rating}</div>

                      {/* Manager Actions - Mobile-Friendly Button */}
                      {/* Show menu if captain OR vice captain, but not for self */}
                      {/* Vice captains cannot manage captain or other vice captains */}
                      {(() => {
                        // Don't show menu for self
                        if (player.id === currentUser.id) return false;

                        // Captain can manage everyone
                        if (isCaptain) return true;

                        // Vice captain can only manage regular players (not captain or other vice captains)
                        if (isViceCaptain) {
                          const isPlayerCaptain = player.id === myTeam.captainId;
                          const isPlayerViceCaptain = myTeam.viceCaptainIds?.includes(player.id);
                          return !isPlayerCaptain && !isPlayerViceCaptain;
                        }

                        return false;
                      })() && (
                          <button
                            onClick={() => setPlayerActionsModal({ isOpen: true, player })}
                            className="p-3 text-slate-400 hover:text-white rounded-xl hover:bg-slate-700 transition-colors active:bg-slate-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
                          >
                            <MoreVertical className="w-6 h-6" />
                          </button>
                        )}
                    </div>
                  ))}
                </div>

                {/* Guest Players (Jokers) */}
                {guestPlayers.length > 0 && (
                  <div className="animate-fade-in-up mt-4 pt-4 border-t border-slate-700">
                    <h4 className="text-xs font-bold text-turf-500 uppercase mb-2 flex items-center gap-1">
                      <UserPlus className="w-3 h-3" /> Misafir Oyuncular
                    </h4>
                    <div className="space-y-2">
                      {guestPlayers.map((player) => (
                        <div key={player.id} className="flex items-center gap-3 p-2 rounded-lg bg-turf-900/10 border border-turf-500/30">
                          <div className="w-8 h-8 rounded-full bg-slate-600 overflow-hidden border border-turf-500">
                            <img src={player.avatarUrl} alt="Player" />
                          </div>
                          <div className="flex-1">
                            <div className="text-white text-sm font-bold">{player.name}</div>
                            <div className="text-turf-400 text-[10px] uppercase font-bold">Kiralık</div>
                          </div>
                          {isCaptain && (
                            <button
                              onClick={() => {
                                // Mock remove guest
                                if (myTeam.guestPlayerIds) {
                                  const updatedGuestIds = myTeam.guestPlayerIds.filter(id => id !== player.id);
                                  const updatedTeam = { ...myTeam, guestPlayerIds: updatedGuestIds };
                                  setMyTeam(updatedTeam);
                                }
                              }}
                              className="text-slate-500 hover:text-red-400"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {/* Player Actions Modal - Bottom Sheet Style */}
      {playerActionsModal.isOpen && playerActionsModal.player && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setPlayerActionsModal({ isOpen: false, player: null })}
          ></div>

          {/* Sheet */}
          <div className="bg-slate-800 w-full max-w-md rounded-t-3xl border-t border-slate-700 shadow-2xl z-[70] animate-slide-up pb-safe-bottom">
            {/* Handle */}
            <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setPlayerActionsModal({ isOpen: false, player: null })}>
              <div className="w-12 h-1.5 bg-slate-600 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="p-6 border-b border-slate-700 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-slate-700 overflow-hidden border-2 border-slate-600">
                <img src={playerActionsModal.player.avatarUrl} alt="Player" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-white font-bold text-xl">{playerActionsModal.player.name}</h3>
                <p className="text-slate-400 text-sm uppercase font-bold tracking-wide">{playerActionsModal.player.position}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 space-y-2">
              {/* Only captains can promote players */}
              {isCaptain && (
                <>
                  <button
                    onClick={() => {
                      handlePromotePlayer(playerActionsModal.player!.id!, 'CAPTAIN');
                      setPlayerActionsModal({ isOpen: false, player: null });
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-700/50 hover:bg-slate-700 text-white transition-all active:scale-95"
                  >
                    <div className="bg-yellow-500/20 p-2 rounded-full text-yellow-500">
                      <Crown className="w-6 h-6" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-bold text-base">Kaptan Yap</div>
                      <div className="text-xs text-slate-400">Takım liderliğini devret</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                  </button>

                  {/* Show 'Yrd. Kaptan Yap' ONLY if NOT already vice captain AND user is captain */}
                  {isCaptain && !myTeam.viceCaptainIds?.includes(playerActionsModal.player.id) && (
                    <button
                      onClick={() => {
                        handlePromotePlayer(playerActionsModal.player!.id!, 'VICE');
                        setPlayerActionsModal({ isOpen: false, player: null });
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-700/50 hover:bg-slate-700 text-white transition-all active:scale-95"
                    >
                      <div className="bg-blue-500/20 p-2 rounded-full text-blue-400">
                        <Shield className="w-6 h-6" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-bold text-base">Yrd. Kaptan Yap</div>
                        <div className="text-xs text-slate-400">Yetkilendir</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-500" />
                    </button>
                  )}

                  {/* Show 'Görevi Geri Al' ONLY if IS vice captain AND user is captain */}
                  {isCaptain && myTeam.viceCaptainIds?.includes(playerActionsModal.player.id) && (
                    <button
                      onClick={() => {
                        handleRevokeViceCaptain(playerActionsModal.player!.id!);
                        setPlayerActionsModal({ isOpen: false, player: null });
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-all active:scale-95"
                    >
                      <div className="bg-orange-500/20 p-2 rounded-full text-orange-400">
                        <ShieldX className="w-6 h-6" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-bold text-base">Görevi Geri Al</div>
                        <div className="text-xs text-orange-400/70">Yetkisini kaldır</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-500" />
                    </button>
                  )}
                </>
              )}

              {/* Kick Player */}
              {(() => {
                const isPlayerCaptain = playerActionsModal.player.id === myTeam.captainId;
                const isPlayerViceCaptain = myTeam.viceCaptainIds?.includes(playerActionsModal.player.id);
                const canKick = isCaptain || (isViceCaptain && !isPlayerCaptain && !isPlayerViceCaptain);

                return canKick ? (
                  <button
                    onClick={() => {
                      handleKickPlayer(playerActionsModal.player!.id!);
                      setPlayerActionsModal({ isOpen: false, player: null });
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all active:scale-95 mt-2"
                  >
                    <div className="bg-red-500/20 p-2 rounded-full text-red-400">
                      <Trash2 className="w-6 h-6" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-bold text-base">Takımdan At</div>
                      <div className="text-xs text-red-400/70">Kadrodan çıkar</div>
                    </div>
                  </button>
                ) : null;
              })()}
            </div>

            {/* Cancel Button */}
            <div className="p-4 pt-0">
              <button
                onClick={() => setPlayerActionsModal({ isOpen: false, player: null })}
                className="w-full py-4 text-center text-slate-500 font-bold hover:text-white transition-colors"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
    </div>);
};
