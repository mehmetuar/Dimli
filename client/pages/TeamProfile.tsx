


import React, { useState, useEffect } from 'react';
import { MOCK_TEAMS, CURRENT_USER, MOCK_PITCHES, MOCK_MATCHES, MOCK_JOKERS } from '../constants';
import { generateTeamBio } from '../services/geminiService';
import { FairPlayScore } from '../components/FairPlayScore';
import { LevelBadge } from '../components/LevelBadge';
import { MapPin, Shield, Sparkles, Edit2, Shirt, TrendingUp, Zap, Footprints, Settings, Plus, Inbox, Check, X, UserPlus, LogOut, Crown, MoreVertical, Trash2, Save } from 'lucide-react';
import { Team, Pitch, MatchOffer, Player, Position } from '../types';
import { CreateTeamModal } from '../components/CreateTeamModal';
import { JoinTeamModal } from '../components/JoinTeamModal';
import { AddPlayerModal } from '../components/AddPlayerModal';

// Mock some roster members for demo purposes
const MOCK_ROSTER: Partial<Player>[] = [
  { id: 'u1', name: 'Can Kaptan', position: Position.MID, avatarUrl: 'https://picsum.photos/100/100?random=99', rating: 82 }, // Current User (Initial)
  { id: 'u5', name: 'Volkan (2.K)', position: Position.GK, avatarUrl: 'https://picsum.photos/100/100?random=88', rating: 79 },
  { id: 'u6', name: 'Emre', position: Position.FWD, avatarUrl: 'https://picsum.photos/100/100?random=77', rating: 85 },
  { id: 'u7', name: 'Mert', position: Position.DEF, avatarUrl: 'https://picsum.photos/100/100?random=66', rating: 76 },
];

export const TeamProfile: React.FC = () => {
  // State to toggle between Player View and Team View
  const [activeTab, setActiveTab] = useState<'PLAYER' | 'TEAM'>('PLAYER');

  // Local state for the current team
  const [myTeam, setMyTeam] = useState<Team | undefined>(
    MOCK_TEAMS.find(t => t.id === CURRENT_USER.teamId)
  );

  // Local state for roster
  const [roster, setRoster] = useState<Partial<Player>[]>([]);

  const [bio, setBio] = useState(myTeam?.description || '');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditingPitch, setIsEditingPitch] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [isJoinTeamModalOpen, setIsJoinTeamModalOpen] = useState(false);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);

  // Initialize roster when team loads or changes
  useEffect(() => {
    // Re-fetch team from mock to ensure we have latest data (in case of navigation back)
    const currentTeamData = MOCK_TEAMS.find(t => t.id === CURRENT_USER.teamId);
    setMyTeam(currentTeamData);

    if (currentTeamData) {
      if (currentTeamData.id === 't1') {
        setRoster(MOCK_ROSTER);
      } else {
        // For new teams, just put current user
        setRoster([{
          id: CURRENT_USER.id,
          name: CURRENT_USER.name,
          position: CURRENT_USER.position,
          avatarUrl: CURRENT_USER.avatarUrl,
          rating: CURRENT_USER.rating
        }]);
      }
      setBio(currentTeamData.description);
    } else {
      setRoster([]);
    }
  }, [CURRENT_USER.teamId]); // Dependency on global user teamId

  // Actions
  const handleGenerateBio = async () => {
    if (!myTeam) return;
    setIsGenerating(true);
    const newBio = await generateTeamBio(myTeam.name, myTeam.level, myTeam.location);
    setBio(newBio);
    // Also save to team object
    const updatedTeam = { ...myTeam, description: newBio };
    setMyTeam(updatedTeam);

    // Update Global Mock
    const globalTeamIndex = MOCK_TEAMS.findIndex(t => t.id === myTeam.id);
    if (globalTeamIndex > -1) MOCK_TEAMS[globalTeamIndex] = updatedTeam;

    setIsGenerating(false);
  };

  const handleSaveBio = () => {
    if (myTeam) {
      const updatedTeam = { ...myTeam, description: bio };
      setMyTeam(updatedTeam);
      // Update Global Mock
      const globalTeamIndex = MOCK_TEAMS.findIndex(t => t.id === myTeam.id);
      if (globalTeamIndex > -1) MOCK_TEAMS[globalTeamIndex] = updatedTeam;
    }
    setIsEditingBio(false);
  }

  const handleSetHomePitch = (pitchId: string) => {
    if (myTeam) {
      const updatedTeam = { ...myTeam, homePitchId: pitchId };
      setMyTeam(updatedTeam);

      // Update Global Mock
      const globalTeamIndex = MOCK_TEAMS.findIndex(t => t.id === myTeam.id);
      if (globalTeamIndex > -1) MOCK_TEAMS[globalTeamIndex] = updatedTeam;

      setIsEditingPitch(false);
    }
  };

  const handleCreateTeam = (teamData: Partial<Team>) => {
    const newId = `t${Date.now()}`;
    const newTeam: Team = {
      id: newId,
      name: teamData.name!,
      level: teamData.level!,
      location: teamData.location!,
      primaryColor: teamData.primaryColor!,
      captainId: CURRENT_USER.id, // Creator is captain
      fairPlayScore: 5.0,
      wins: 0,
      losses: 0,
      description: teamData.description || '',
      logoUrl: teamData.logoUrl || '',
      guestPlayerIds: []
    };

    // Update global mock (simulation)
    MOCK_TEAMS.push(newTeam);
    CURRENT_USER.teamId = newId;

    setMyTeam(newTeam);

    // Update roster for new team
    setRoster([{
      id: CURRENT_USER.id,
      name: CURRENT_USER.name,
      position: CURRENT_USER.position,
      avatarUrl: CURRENT_USER.avatarUrl,
      rating: CURRENT_USER.rating
    }]);

    setActiveTab('TEAM');
  };

  const handleLeaveTeam = () => {
    if (!myTeam) return;
    const isCaptain = myTeam.captainId === CURRENT_USER.id;

    if (isCaptain) {
      alert("Takım kaptanısın. Ayrılmadan önce kaptanlığı başka bir oyuncuya devretmelisin.");
      return;
    }

    if (confirm(`${myTeam.name} takımından ayrılmak istediğine emin misin?`)) {
      // 1. Update Global User
      CURRENT_USER.teamId = undefined;

      // 2. Update UI State
      setMyTeam(undefined);
      setRoster([]);
      setActiveTab('PLAYER');
    }
  };

  const handleKickPlayer = (playerId: string) => {
    if (confirm("Bu oyuncuyu takımdan çıkarmak istiyor musun?")) {
      setRoster(prev => prev.filter(p => p.id !== playerId));
      // In real app, update DB to remove user's teamId
    }
  };

  const handlePromotePlayer = (playerId: string, role: 'CAPTAIN' | 'VICE') => {
    if (!myTeam) return;

    const player = roster.find(p => p.id === playerId);
    if (!player) return;

    if (role === 'CAPTAIN') {
      if (confirm(`${player.name} adlı oyuncuyu KAPTAN yapmak üzeresin. Kendi yetkilerini devredeceksin. Emin misin?`)) {
        const updatedTeam = {
          ...myTeam,
          captainId: playerId,
          // If they were vice, clear vice
          viceCaptainId: myTeam.viceCaptainId === playerId ? undefined : myTeam.viceCaptainId
        };

        setMyTeam(updatedTeam);

        // Update Global Mock so it persists
        const globalTeamIndex = MOCK_TEAMS.findIndex(t => t.id === myTeam.id);
        if (globalTeamIndex > -1) MOCK_TEAMS[globalTeamIndex] = updatedTeam;
      }
    } else {
      // VICE Captain
      const updatedTeam = { ...myTeam, viceCaptainId: playerId };
      setMyTeam(updatedTeam);

      const globalTeamIndex = MOCK_TEAMS.findIndex(t => t.id === myTeam.id);
      if (globalTeamIndex > -1) MOCK_TEAMS[globalTeamIndex] = updatedTeam;
    }
  };

  const selectedHomePitch = MOCK_PITCHES.find(p => p.id === myTeam?.homePitchId);

  // Resolve Guest Players
  const guestPlayers: Player[] = [];
  if (myTeam?.guestPlayerIds) {
    myTeam.guestPlayerIds.forEach(id => {
      const joker = MOCK_JOKERS.find(j => j.id === id);
      if (joker) guestPlayers.push(joker);
    });
  }

  // --- SUB-COMPONENT: PLAYER CARD ---
  const PlayerCard = () => (
    <div className="animate-fade-in">
      <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

        <div className="relative z-10 p-6 flex flex-col items-center">
          <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-r from-turf-500 to-blue-500 mb-4">
            <img
              src={CURRENT_USER.avatarUrl}
              alt="Profile"
              className="w-full h-full rounded-full object-cover border-4 border-slate-900"
            />
          </div>

          <h2 className="font-sport font-bold text-4xl text-white uppercase italic tracking-wide mb-1">
            {CURRENT_USER.name}
          </h2>
          <div className="flex items-center gap-2 text-slate-400 mb-6">
            <MapPin className="w-4 h-4 text-turf-500" /> {CURRENT_USER.location}
          </div>

          <div className="grid grid-cols-2 gap-4 w-full mb-6">
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex items-center justify-between">
              <span className="text-slate-400 text-xs font-bold uppercase">Mevki</span>
              <span className="text-turf-400 font-sport text-2xl font-bold">{CURRENT_USER.position}</span>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex items-center justify-between">
              <span className="text-slate-400 text-xs font-bold uppercase">Ayak</span>
              <span className="text-white font-sport text-2xl font-bold">SAĞ</span>
            </div>
          </div>

          <div className="w-full space-y-3">
            {Object.entries(CURRENT_USER.stats || {}).slice(0, 3).map(([key, val]) => (
              <div key={key} className="flex items-center gap-3">
                <div className="w-8 text-center font-sport font-bold text-xl text-white">{val}</div>
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-turf-500" style={{ width: `${val}%` }}></div>
                </div>
                <div className="text-xs font-bold text-slate-500 w-12 uppercase">{key.substring(0, 3)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!myTeam && (
        <div className="mt-6 p-6 bg-slate-800 rounded-2xl border border-slate-700 text-center animate-fade-in-up">
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
      )}

      {/* Logout Button */}
      <div className="mt-6 text-center">
        <button
          onClick={() => {
            if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
              localStorage.removeItem('token');
              window.location.href = '/login'; // Force reload to update Navbar state
            }
          }}
          className="text-red-400 hover:text-red-300 font-bold text-sm flex items-center justify-center gap-2 mx-auto transition-colors"
        >
          <LogOut className="w-4 h-4" /> Çıkış Yap
        </button>
      </div>
    </div>
  );

  // --- SUB-COMPONENT: TEAM DASHBOARD ---
  const TeamDashboard = () => {
    if (!myTeam) return null;
    const isCaptain = myTeam.captainId === CURRENT_USER.id;

    return (
      <div className="animate-fade-in space-y-6">
        {/* Header Card */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-${myTeam.primaryColor.replace('bg-', '')} to-transparent opacity-20 rounded-bl-full`}></div>

          <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-4">
              <img src={myTeam.logoUrl} className="w-20 h-20 rounded-full border-4 border-slate-800 bg-slate-900 object-cover shadow-lg" alt="Logo" />
              <div>
                <h2 className="font-sport font-black text-3xl text-white italic tracking-wide uppercase">{myTeam.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <LevelBadge level={myTeam.level} />
                  <FairPlayScore score={myTeam.fairPlayScore} />
                </div>
              </div>
            </div>
            {/* Leave Team Button - Always visible for non-captains, or captains who want to try (and get error) */}
            <button
              onClick={handleLeaveTeam}
              className="p-2 bg-slate-900/50 hover:bg-red-500/20 text-slate-400 hover:text-red-500 rounded-lg transition-colors border border-slate-700/50"
              title="Takımdan Ayrıl"
            >
              <LogOut className="w-5 h-5" />
            </button>
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
            <div className="text-slate-400 text-xs font-bold uppercase mb-1">Kondisyon</div>
            <div className="text-turf-500 font-sport text-3xl font-bold">94%</div>
          </div>
        </div>

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
                {isCaptain && (
                  <button className="absolute top-3 right-3 bg-turf-600 hover:bg-turf-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-1">
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
                    {myTeam.captainId === player.id && (
                      <div className="absolute bottom-0 right-0 bg-yellow-500 rounded-full p-0.5 border border-slate-900" title="Kaptan">
                        <Crown className="w-2.5 h-2.5 text-black fill-black" />
                      </div>
                    )}
                    {myTeam.viceCaptainId === player.id && (
                      <div className="absolute bottom-0 right-0 bg-slate-400 rounded-full p-0.5 border border-slate-900" title="2. Kaptan">
                        <Shield className="w-2.5 h-2.5 text-slate-900 fill-slate-900" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-bold flex items-center gap-2">
                      {player.name}
                      {player.id === CURRENT_USER.id && <span className="text-[10px] text-slate-500">(Sen)</span>}
                    </div>
                    <div className="text-slate-500 text-[10px] uppercase font-bold">{player.position}</div>
                  </div>

                  <div className="text-white font-sport font-bold text-lg mr-2">{player.rating}</div>

                  {/* Manager Actions - Visible only if I am captain AND target is not me */}
                  {isCaptain && player.id !== CURRENT_USER.id && (
                    <div className="relative group/menu">
                      <button className="p-1.5 text-slate-500 hover:text-white rounded hover:bg-slate-700 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <div className="absolute right-0 top-8 w-40 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-20 hidden group-hover/menu:block">
                        <button
                          onClick={() => handlePromotePlayer(player.id!, 'CAPTAIN')}
                          className="w-full text-left px-3 py-2 text-[10px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                        >
                          <Crown className="w-3 h-3 text-yellow-500" /> Kaptan Yap
                        </button>
                        <button
                          onClick={() => handlePromotePlayer(player.id!, 'VICE')}
                          className="w-full text-left px-3 py-2 text-[10px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                        >
                          <Shield className="w-3 h-3 text-slate-400" /> Yrd. Kaptan Yap
                        </button>
                        <div className="h-px bg-slate-700 my-0.5"></div>
                        <button
                          onClick={() => handleKickPlayer(player.id!)}
                          className="w-full text-left px-3 py-2 text-[10px] font-bold text-red-400 hover:bg-red-900/30 flex items-center gap-2"
                        >
                          <Trash2 className="w-3 h-3" /> Takımdan At
                        </button>
                      </div>
                    </div>
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

                              // Sync global
                              const globalTeamIndex = MOCK_TEAMS.findIndex(t => t.id === myTeam.id);
                              if (globalTeamIndex > -1) MOCK_TEAMS[globalTeamIndex] = updatedTeam;
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
    );
  }

  return (
    <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto min-h-screen">
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

      {activeTab === 'PLAYER' ? <PlayerCard /> : <TeamDashboard />}
    </div>
  );
};