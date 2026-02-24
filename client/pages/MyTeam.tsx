import React, { useState, useEffect } from 'react';
import { MOCK_JOKERS, MOCK_MATCH_HISTORY } from '../constants';
import { generateTeamBio } from '../services/geminiService';
import { FairPlayScore } from '../components/FairPlayScore';
import { LevelBadge } from '../components/LevelBadge';
import { Users, Trophy, MapPin, Shield, Star, Settings, LogOut, Edit, UserPlus, X, Check, Crown, AlertTriangle, ChevronRight, User, Edit2, Sparkles, Save, Plus, MoreVertical, ShieldX, Trash2, History, Store, Calendar } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Team, Player, Position, Pitch, Business } from '../types';
import { CreateTeamModal } from '../components/CreateTeamModal';
import { JoinTeamModal } from '../components/JoinTeamModal';
import { AddPlayerModal } from '../components/AddPlayerModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { MatchHistoryModal } from '../components/MatchHistoryModal';
import { UpcomingMatchesModal } from '../components/UpcomingMatchesModal';
import { CreateMatchModal } from '../components/CreateMatchModal';
import { SuccessModal, SuccessType } from '../components/SuccessModal';
import api, { getPitches, getBusinesses } from '../services/api';
import { useNavigate } from 'react-router-dom';

// Map Tailwind class names to hex colors for runtime inline styles
const COLOR_HEX: Record<string, string> = {
    'bg-blue-500': '#3b82f6',
    'bg-green-500': '#22c55e',
    'bg-red-500': '#ef4444',
    'bg-yellow-500': '#eab308',
    'bg-purple-500': '#a855f7',
    'bg-orange-500': '#f97316',
    'bg-pink-500': '#ec4899',
    'bg-cyan-500': '#06b6d4',
    'bg-white': '#ffffff',
};
const toHex = (cls?: string) => (cls ? COLOR_HEX[cls] ?? '#3b82f6' : '#3b82f6');

export const MyTeam: React.FC = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [myTeam, setMyTeam] = useState<Team | undefined>(undefined);
    const [roster, setRoster] = useState<Partial<Player>[]>([]);
    const [pitches, setPitches] = useState<Pitch[]>([]);
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [bio, setBio] = useState('');
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEditingPitch, setIsEditingPitch] = useState(false);
    const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
    const [isJoinTeamModalOpen, setIsJoinTeamModalOpen] = useState(false);
    const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
    const [isMatchHistoryOpen, setIsMatchHistoryOpen] = useState(false);
    const [isUpcomingMatchesOpen, setIsUpcomingMatchesOpen] = useState(false);
    const [upcomingMatches, setUpcomingMatches] = useState<any[]>([]);
    const [isUpcomingLoading, setIsUpcomingLoading] = useState(false);
    const [isCreateMatchModalOpen, setIsCreateMatchModalOpen] = useState(false);
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
                setSuccessType(null);
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

                // Fetch pitches in parallel or sequence
                const pitchesData = await getPitches();
                setPitches(pitchesData);

                const businessesData = await getBusinesses();
                setBusinesses(businessesData);

                if (user.team) {
                    const teamResponse = await api.get(`/teams/${user.team.id}`);
                    const fullTeam = teamResponse.data;

                    setMyTeam(fullTeam);
                    setBio(fullTeam.description || '');

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
                setIsLoading(false);
            }
        };
        fetchUser();
    }, []);

    const fetchUpcomingMatches = async () => {
        if (!myTeam?.id) return;
        setIsUpcomingLoading(true);
        try {
            const response = await api.get(`/reservations/upcoming?teamId=${myTeam.id}`);
            setUpcomingMatches(response.data);
        } catch (error) {
            console.error('Failed to fetch upcoming matches:', error);
        } finally {
            setIsUpcomingLoading(false);
        }
    };

    // Actions
    const handleGenerateBio = async () => {
        if (!myTeam) return;
        setIsGenerating(true);
        const newBio = await generateTeamBio(myTeam.name, myTeam.level, myTeam.location);
        setBio(newBio);
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

    const handleSetHomeBusiness = async (businessId: string) => {
        if (!myTeam) return;
        try {
            const response = await api.patch(`/teams/${myTeam.id}/home-business`, {
                homeBusinessId: businessId
            });
            setMyTeam(response.data);
            setIsEditingPitch(false);
            setSuccessMessage('Favori işletme başarıyla güncellendi!');
        } catch (error) {
            console.error('Failed to set home business:', error);
            setErrorMessage('İşletme seçilemedi.');
        }
    };

    const handleCreateTeam = async (teamData: Partial<Team>) => {
        try {
            const response = await api.post('/teams', teamData);
            setMyTeam(response.data);
            setIsCreateTeamModalOpen(false);
            setSuccessMessage('Takım başarıyla oluşturuldu!');
            setSuccessType('TEAM_CREATED');
        } catch (error: any) {
            console.error('Failed to create team:', error);
            setErrorMessage(error.response?.data?.message || 'Takım oluşturulamadı.');
        }
    };

    const handleLeaveTeam = () => {
        if (!myTeam) return;
        const isCaptain = myTeam.captain?.id === currentUser.id || myTeam.captainId === currentUser.id;

        if (isCaptain) {
            // Solo captain → offer to delete the team entirely
            if (roster.length <= 1) {
                setConfirmModal({
                    isOpen: true,
                    title: '⚠️ Takımı Sil',
                    message: `Takımda sadece sen varsın. Ayrılırsan "${myTeam.name}" takımı tamamen silinecek. Bunu onaylıyor musun?`,
                    onConfirm: async () => {
                        try {
                            await api.delete(`/teams/${myTeam.id}`);
                            setMyTeam(undefined);
                            setRoster([]);
                            navigate('/team');
                        } catch (err: any) {
                            setErrorMessage(err.response?.data?.message || 'Takım silinemedi.');
                        }
                    },
                    isDangerous: true
                });
                return;
            }

            // Captain with other players → must transfer first
            setConfirmModal({
                isOpen: true,
                title: 'Uyarı',
                message: 'Takım kaptanısın. Ayrılmadan önce kaptanlığı başka bir oyuncuya devretmelisin.',
                onConfirm: () => { },
                isDangerous: false
            });
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Takımdan Ayrıl',
            message: `${myTeam.name} takımından ayrılmak istediğine emin misin?`,
            onConfirm: async () => {
                try {
                    await api.delete(`/teams/${myTeam.id}/leave`);
                    setMyTeam(undefined);
                    setRoster([]);
                    navigate('/team');
                } catch (err: any) {
                    setErrorMessage(err.response?.data?.message || 'Takımdan ayrılınamadı.');
                }
            },

            isDangerous: true
        });
    };

    const handleKickPlayer = (playerId: string) => {
        if (!myTeam) return;

        // Close the player actions bottom sheet first
        setPlayerActionsModal({ isOpen: false, player: null });

        setConfirmModal({
            isOpen: true,
            title: 'Takımdan At',
            message: 'Bu oyuncuyu takımdan çıkarmak istiyor musun?',
            isDangerous: true,
            onConfirm: async () => {
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
        });
    };

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
            setMyTeam(response.data);

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

    const selectedHomeBusiness = businesses.find(b => b.id === myTeam?.homeBusinessId);
    const isCaptain = myTeam ? ((myTeam.captain && (myTeam.captain as any).id === currentUser?.id) || myTeam.captainId === currentUser?.id) : false;
    const isViceCaptain = myTeam?.viceCaptainIds?.includes(currentUser?.id) || false;

    const guestPlayers: Player[] = [];
    if (myTeam?.guestPlayerIds) {
        myTeam.guestPlayerIds.forEach(id => {
            const joker = MOCK_JOKERS.find(j => j.id === id);
            if (joker) guestPlayers.push(joker);
        });
    }

    if (isLoading) {
        return <LoadingSpinner fullScreen text="Takım Yükleniyor..." />;
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

    return (
        <>
            {/* Team Settings Menu (Bottom Sheet) */}
            {isTeamMenuOpen && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsTeamMenuOpen(false)}></div>
                    <div className="bg-slate-800 w-full max-w-md rounded-t-3xl border-t border-slate-700 shadow-2xl z-[70] animate-slide-up pb-safe-bottom">
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
                                onClick={() => { setIsTeamMenuOpen(false); navigate('/settings/team'); }}
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
                        <div className="p-4 pt-0">
                            <button onClick={() => setIsTeamMenuOpen(false)} className="w-full py-4 text-center text-slate-500 font-bold hover:text-white transition-colors">Vazgeç</button>
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

            {/* Success Message Toast */}
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

            {/* Upcoming Matches Modal */}
            <UpcomingMatchesModal
                isOpen={isUpcomingMatchesOpen}
                onClose={() => setIsUpcomingMatchesOpen(false)}
                matches={upcomingMatches}
                currentTeamId={myTeam?.id}
                isLoading={isUpcomingLoading}
            />

            {/* CreateMatch Modal */}
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

            {!myTeam ? (
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
                    {/* Header Card — uses team primary+secondary colors */}
                    <div
                        className="rounded-2xl p-6 border border-slate-700 relative overflow-hidden"
                        style={{
                            background: `linear-gradient(135deg, ${toHex((myTeam as any).primaryColor)}18 0%, #1e293b 50%, ${toHex((myTeam as any).secondaryColor || (myTeam as any).primaryColor)}12 100%)`
                        }}
                    >
                        {/* Color accent blobs */}
                        <div
                            className="absolute top-0 right-0 w-40 h-40 rounded-bl-full opacity-20"
                            style={{ background: `radial-gradient(circle at top right, ${toHex((myTeam as any).primaryColor)}, transparent 70%)` }}
                        />
                        <div
                            className="absolute bottom-0 left-0 w-28 h-28 rounded-tr-full opacity-10"
                            style={{ background: `radial-gradient(circle at bottom left, ${toHex((myTeam as any).secondaryColor || (myTeam as any).primaryColor)}, transparent 70%)` }}
                        />

                        <div className="flex justify-between items-start relative z-10">
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden shadow-xl"
                                    style={{ border: `3px solid ${toHex((myTeam as any).primaryColor)}60` }}
                                >
                                    {(myTeam as any).logoUrl ? (
                                        <img src={(myTeam as any).logoUrl} className="w-full h-full object-cover" alt="Logo"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                    ) : (
                                        <div
                                            className="w-full h-full flex items-center justify-center text-white font-black text-2xl"
                                            style={{ background: `linear-gradient(135deg, ${toHex((myTeam as any).primaryColor)}, ${toHex((myTeam as any).secondaryColor || (myTeam as any).primaryColor)}88)` }}
                                        >
                                            {myTeam.name?.slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h2 className="font-sport font-black text-3xl text-white italic tracking-wide uppercase">{myTeam.name}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <LevelBadge level={myTeam.level} />
                                        <FairPlayScore score={myTeam.fairPlayScore} />
                                    </div>
                                    {myTeam.location && (
                                        <div className="flex items-center gap-1 mt-1 text-slate-400 text-xs">
                                            <MapPin className="w-3 h-3" />
                                            {myTeam.location}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsTeamMenuOpen(true)}
                                    className="p-2 bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700/50"
                                >
                                    <Settings className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleLeaveTeam}
                                    className="p-2 bg-slate-900/50 hover:bg-red-500/20 text-slate-400 hover:text-red-500 rounded-lg transition-colors border border-slate-700/50"
                                    title="Takımdan Ayrıl"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Bio Section */}
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

                    {/* Upcoming Matches Button */}
                    <button
                        onClick={() => {
                            setIsUpcomingMatchesOpen(true);
                            fetchUpcomingMatches();
                        }}
                        className="w-full bg-gradient-to-r from-turf-600 to-green-600 text-white font-bold py-3 rounded-xl hover:from-turf-500 hover:to-green-500 transition-all shadow-lg shadow-turf-600/20 flex items-center justify-center gap-2"
                    >
                        <Calendar className="w-5 h-5" />
                        Yaklaşan Maçlar
                    </button>

                    {/* Match History Button */}
                    <button
                        onClick={() => setIsMatchHistoryOpen(true)}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
                    >
                        <History className="w-5 h-5" />
                        Geçmiş Maçlar
                    </button>

                    {/* Home Business Section */}
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="font-sport font-bold text-xl text-white flex items-center gap-2">
                                <Store className="w-5 h-5 text-turf-500" />
                                EV SAHİBİ SAHA (Favori İşletme)
                            </h3>
                            {isCaptain && (
                                <button
                                    onClick={() => setIsEditingPitch(!isEditingPitch)}
                                    className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-lg transition-colors"
                                >
                                    {selectedHomeBusiness ? 'Değiştir' : 'İşletme Seç'}
                                </button>
                            )}
                        </div>

                        {isEditingPitch ? (
                            <div className="p-4 bg-slate-900">
                                <p className="text-xs text-slate-400 mb-3">Takımınızın favori işletmesini seçin:</p>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {businesses.map(business => (
                                        <button
                                            key={business.id}
                                            onClick={() => handleSetHomeBusiness(business.id)}
                                            className="w-full text-left p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex justify-between items-center"
                                        >
                                            <span className="text-white text-sm font-bold">{business.name}</span>
                                            <span className="text-xs text-slate-400">{business.district}, {business.city}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            selectedHomeBusiness ? (
                                <div className="relative group">
                                    <img src={selectedHomeBusiness.coverImageUrl || 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&q=80&w=2070'} className="w-full h-32 object-cover opacity-60" alt="Business" />
                                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 to-transparent">
                                        <div className="text-white font-bold text-lg">{selectedHomeBusiness.name}</div>
                                        <div className="text-slate-300 text-xs">{selectedHomeBusiness.district}, {selectedHomeBusiness.city}</div>
                                    </div>
                                    {isCaptain && myTeam.homeBusinessId && (
                                        <button
                                            onClick={() => {
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
                                    <p className="text-slate-500 text-sm">Henüz bir favori işletme seçmediniz.</p>
                                </div>
                            )
                        )}
                    </div>

                    {/* Roster Management */}
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-sport font-bold text-xl text-white flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-500" /> KADRO
                                <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${roster.length >= 28
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : 'bg-slate-700 text-slate-300'
                                    }`}>{roster.length}/28</span>
                            </h3>
                            {isCaptain && (
                                <div className="flex items-center gap-2">
                                    {roster.length >= 28 ? (
                                        <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded font-bold uppercase border border-red-500/30">Kadro Dolu</span>
                                    ) : (
                                        <button
                                            onClick={() => setIsAddPlayerModalOpen(true)}
                                            className="bg-turf-600 hover:bg-turf-500 text-white p-1.5 rounded-lg transition-colors shadow-lg shadow-turf-600/20"
                                            title="Oyuncu Ekle / Davet Et"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                        </button>
                                    )}
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

                                        {(() => {
                                            if (player.id === currentUser.id) return false;
                                            if (isCaptain) return true;
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

                            {/* Guest Players */}
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
            )}

            {/* Player Actions Modal */}
            {playerActionsModal.isOpen && playerActionsModal.player && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPlayerActionsModal({ isOpen: false, player: null })}></div>
                    <div className="bg-slate-800 w-full max-w-md rounded-t-3xl border-t border-slate-700 shadow-2xl z-[70] animate-slide-up pb-safe-bottom">
                        <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setPlayerActionsModal({ isOpen: false, player: null })}>
                            <div className="w-12 h-1.5 bg-slate-600 rounded-full"></div>
                        </div>
                        <div className="p-6 border-b border-slate-700 flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-slate-700 overflow-hidden border-2 border-slate-600">
                                <img src={playerActionsModal.player.avatarUrl} alt="Player" className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-xl">{playerActionsModal.player.name}</h3>
                                <p className="text-slate-400 text-sm uppercase font-bold tracking-wide">{playerActionsModal.player.position}</p>
                            </div>
                        </div>
                        <div className="p-4 space-y-2">
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
                        <div className="p-4 pt-0">
                            <button onClick={() => setPlayerActionsModal({ isOpen: false, player: null })} className="w-full py-4 text-center text-slate-500 font-bold hover:text-white transition-colors">Vazgeç</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
