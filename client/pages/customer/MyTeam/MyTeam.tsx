import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../../../components/UI/LoadingSpinner';
import { MOCK_JOKERS } from '../../../constants';
import { Check, X, Shield, Crown, Trash2, ShieldX, ChevronRight, MoreVertical } from 'lucide-react';

import { useTeamModals } from './hooks/useTeamModals';
import { useMyTeam } from './hooks/useMyTeam';
import { useTeamRoster } from './hooks/useTeamRoster';

import { TeamHeaderCard } from './components/TeamHeaderCard';
import { TeamStatsRow } from './components/TeamStatsRow';
import { TeamActionButtons } from './components/TeamActionButtons';
import { TeamHomeBusiness } from './components/TeamHomeBusiness';
import { TeamRoster } from './components/TeamRoster';
import { TeamModals } from './components/TeamModals';
import { NoTeamView } from './components/NoTeamView';
import { TeamSettingsMenu } from './components/TeamSettingsMenu';

export const MyTeam: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const modals = useTeamModals();

    // Dışarıdan gelen navigate state ile modal aç (NeedTeamRoleModal → buton tıklaması)
    useEffect(() => {
        const state = location.state as { openModal?: string } | null;
        if (state?.openModal === 'createTeam') {
            modals.setIsCreateTeamModalOpen(true);
            navigate('/team', { replace: true, state: {} });
        } else if (state?.openModal === 'joinTeam') {
            modals.setIsJoinTeamModalOpen(true);
            navigate('/team', { replace: true, state: {} });
        }
    }, [location.state]);
    const {
        currentUser, isLoading, myTeam, setMyTeam, roster, setRoster,
        businesses, bio, setBio, isEditingBio, setIsEditingBio,
        isGenerating, upcomingMatches, isUpcomingLoading, fetchUpcomingMatches,
        matchHistory, isMatchHistoryLoading, fetchMatchHistory,
        successMessage, setSuccessMessage, successType, setSuccessType, errorMessage, setErrorMessage,
        handleGenerateBio, handleSaveBio, handleSetHomeBusiness, handleCreateTeam, handleLeaveTeam,
        isLocationFilterOpen, setIsLocationFilterOpen, locationFilter, applyLocationFilter, isLoadingLocation,
    } = useMyTeam(modals);

    const rosterActions = useTeamRoster({
        myTeam, setMyTeam, setRoster,
        setPlayerActionsModal: modals.setPlayerActionsModal,
        setConfirmModal: modals.setConfirmModal,
        setSuccessMessage, setSuccessType, setErrorMessage
    });

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

    const isCaptain = myTeam ? ((myTeam.captain && (myTeam.captain as any).id === currentUser?.id) || myTeam.captainId === currentUser?.id) : false;
    const isViceCaptain = myTeam?.viceCaptainIds?.includes(currentUser?.id) || false;

    const guestPlayers: any[] = [];
    if (myTeam?.guestPlayerIds) {
        myTeam.guestPlayerIds.forEach(id => {
            const joker = MOCK_JOKERS.find(j => j.id === id);
            if (joker) guestPlayers.push(joker);
        });
    }

    return (
        <>
            <TeamSettingsMenu
                isOpen={modals.isTeamMenuOpen}
                setIsOpen={modals.setIsTeamMenuOpen}
                myTeamName={myTeam?.name}
            />

            {successMessage && !successType && (
                <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 bg-green-500/10 border border-green-500/50 text-green-400 px-6 py-3 rounded-xl flex items-center gap-3 animate-fade-in shadow-lg backdrop-blur-sm">
                    <Check className="w-5 h-5" />
                    <p className="font-bold text-sm">{successMessage}</p>
                </div>
            )}

            {errorMessage && (
                <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 bg-red-500/10 border border-red-500/50 text-red-400 px-6 py-3 rounded-xl flex items-center gap-3 animate-fade-in shadow-lg backdrop-blur-sm">
                    <X className="w-5 h-5" />
                    <p className="font-bold text-sm">{errorMessage}</p>
                </div>
            )}

            <TeamModals
                modals={modals}
                myTeam={myTeam}
                roster={roster}
                upcomingMatches={upcomingMatches}
                isUpcomingLoading={isUpcomingLoading}
                handleCreateTeam={handleCreateTeam}
                matchHistory={matchHistory}
                isMatchHistoryLoading={isMatchHistoryLoading}
                successMessage={successMessage}
                successType={successType}
                setSuccessMessage={setSuccessMessage}
                setSuccessType={setSuccessType}
            />

            {!myTeam ? (
                <NoTeamView
                    setIsJoinTeamModalOpen={modals.setIsJoinTeamModalOpen}
                    setIsCreateTeamModalOpen={modals.setIsCreateTeamModalOpen}
                />
            ) : (
                <div className="animate-fade-in space-y-6">
                    <TeamHeaderCard
                        myTeam={myTeam}
                        bio={bio}
                        setBio={setBio}
                        isCaptain={isCaptain}
                        isEditingBio={isEditingBio}
                        setIsEditingBio={setIsEditingBio}
                        isGenerating={isGenerating}
                        handleGenerateBio={handleGenerateBio}
                        handleSaveBio={handleSaveBio}
                        setIsTeamMenuOpen={modals.setIsTeamMenuOpen}
                        handleLeaveTeam={handleLeaveTeam}
                    />

                    <TeamStatsRow myTeam={myTeam} matchCount={matchHistory.length} />

                    <TeamActionButtons
                        fetchUpcomingMatches={fetchUpcomingMatches}
                        setIsUpcomingMatchesOpen={modals.setIsUpcomingMatchesOpen}
                        fetchMatchHistory={fetchMatchHistory}
                        setIsMatchHistoryOpen={modals.setIsMatchHistoryOpen}
                    />

                    <TeamHomeBusiness
                        myTeam={myTeam}
                        businesses={businesses}
                        isCaptain={isCaptain}
                        isEditingPitch={modals.isEditingPitch}
                        setIsEditingPitch={modals.setIsEditingPitch}
                        handleSetHomeBusiness={handleSetHomeBusiness}
                        setIsCreateMatchModalOpen={modals.setIsCreateMatchModalOpen}
                        isLocationFilterOpen={isLocationFilterOpen}
                        setIsLocationFilterOpen={setIsLocationFilterOpen}
                        locationFilter={locationFilter}
                        applyLocationFilter={applyLocationFilter}
                        isLoadingLocation={isLoadingLocation}
                    />

                    <TeamRoster
                        myTeam={myTeam}
                        currentUser={currentUser}
                        roster={roster}
                        guestPlayers={guestPlayers}
                        isCaptain={isCaptain}
                        isViceCaptain={isViceCaptain}
                        setIsAddPlayerModalOpen={modals.setIsAddPlayerModalOpen}
                        setPlayerActionsModal={modals.setPlayerActionsModal}
                        setMyTeam={setMyTeam as any}
                    />
                </div>
            )}

            {/* Player Actions Bottom Sheet */}
            {modals.playerActionsModal.isOpen && modals.playerActionsModal.player && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => modals.setPlayerActionsModal({ isOpen: false, player: null })}></div>
                    <div className="bg-slate-800 w-full max-w-md rounded-t-3xl border-t border-slate-700 shadow-2xl z-[70] animate-slide-up pb-safe-bottom">
                        <div className="w-full flex justify-center pt-3 pb-1" onClick={() => modals.setPlayerActionsModal({ isOpen: false, player: null })}>
                            <div className="w-12 h-1.5 bg-slate-600 rounded-full"></div>
                        </div>
                        <div className="p-6 border-b border-slate-700 flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-slate-700 overflow-hidden border-2 border-slate-600">
                                <img src={modals.playerActionsModal.player.avatarUrl} alt="Player" className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-xl">{modals.playerActionsModal.player.name}</h3>
                                <p className="text-slate-400 text-sm uppercase font-bold tracking-wide">{modals.playerActionsModal.player.position}</p>
                            </div>
                        </div>
                        <div className="p-4 space-y-2">
                            {isCaptain && (
                                <>
                                    <button
                                        onClick={() => {
                                            rosterActions.handlePromotePlayer(modals.playerActionsModal.player!.id!, 'CAPTAIN');
                                            modals.setPlayerActionsModal({ isOpen: false, player: null });
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

                                    {isCaptain && !myTeam?.viceCaptainIds?.includes(modals.playerActionsModal.player.id) && (
                                        <button
                                            onClick={() => {
                                                rosterActions.handlePromotePlayer(modals.playerActionsModal.player!.id!, 'VICE');
                                                modals.setPlayerActionsModal({ isOpen: false, player: null });
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

                                    {isCaptain && myTeam?.viceCaptainIds?.includes(modals.playerActionsModal.player.id) && (
                                        <button
                                            onClick={() => {
                                                rosterActions.handleRevokeViceCaptain(modals.playerActionsModal.player!.id!);
                                                modals.setPlayerActionsModal({ isOpen: false, player: null });
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
                                const isPlayerCaptain = modals.playerActionsModal.player.id === myTeam?.captainId;
                                const isPlayerViceCaptain = myTeam?.viceCaptainIds?.includes(modals.playerActionsModal.player.id);
                                const canKick = isCaptain || (isViceCaptain && !isPlayerCaptain && !isPlayerViceCaptain);

                                return canKick ? (
                                    <button
                                        onClick={() => {
                                            rosterActions.handleKickPlayer(modals.playerActionsModal.player!.id!);
                                            modals.setPlayerActionsModal({ isOpen: false, player: null });
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
                            <button onClick={() => modals.setPlayerActionsModal({ isOpen: false, player: null })} className="w-full py-4 text-center text-slate-500 font-bold hover:text-white transition-colors">Vazgeç</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
