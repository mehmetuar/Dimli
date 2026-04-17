import React from 'react';
import { CreateTeamModal } from '../../../../components/Modals/CreateTeamModal';
import { JoinTeamModal } from '../../../../components/Modals/JoinTeamModal';
import { AddPlayerModal } from '../../../../components/Modals/AddPlayerModal';
import { ConfirmModal } from '../../../../components/Modals/ConfirmModal';
import { MatchHistoryModal } from '../../../../components/Modals/MatchHistoryModal';
import { UpcomingMatchesModal } from '../../../../components/Modals/UpcomingMatchesModal';
import { CreateMatchModal } from '../../../../components/Modals/CreateMatchModal';
import { SuccessModal, SuccessType } from '../../../../components/Modals/SuccessModal';
import { MatchHistoryItem } from '../../../../types';

interface TeamModalsProps {
    modals: any;
    myTeam: any;
    roster: any[];
    upcomingMatches: any[];
    isUpcomingLoading: boolean;
    handleCreateTeam: (data: any) => void;
    matchHistory: MatchHistoryItem[];
    isMatchHistoryLoading: boolean;
    successMessage: string;
    successType: SuccessType | null;
    setSuccessMessage: (msg: string) => void;
    setSuccessType: (type: SuccessType | null) => void;
}

export const TeamModals: React.FC<TeamModalsProps> = ({
    modals, myTeam, roster, upcomingMatches, isUpcomingLoading, handleCreateTeam,
    matchHistory, isMatchHistoryLoading,
    successMessage, successType, setSuccessMessage, setSuccessType
}) => {
    return (
        <>
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

            <ConfirmModal
                isOpen={modals.confirmModal.isOpen}
                onClose={() => modals.setConfirmModal({ ...modals.confirmModal, isOpen: false })}
                onConfirm={modals.confirmModal.onConfirm}
                title={modals.confirmModal.title}
                message={modals.confirmModal.message}
                isDangerous={modals.confirmModal.isDangerous}
                confirmText={modals.confirmModal.isDangerous ? "Evet, Eminim" : "Tamam"}
                cancelText="İptal"
            />

            <MatchHistoryModal
                isOpen={modals.isMatchHistoryOpen}
                onClose={() => modals.setIsMatchHistoryOpen(false)}
                matches={matchHistory}
                isLoading={isMatchHistoryLoading}
                teamFairPlayScore={myTeam?.fairPlayScore || 5.0}
            />

            <UpcomingMatchesModal
                isOpen={modals.isUpcomingMatchesOpen}
                onClose={() => modals.setIsUpcomingMatchesOpen(false)}
                matches={upcomingMatches}
                currentTeamId={myTeam?.id}
                isLoading={isUpcomingLoading}
            />

            <CreateMatchModal
                isOpen={modals.isCreateMatchModalOpen}
                onClose={() => modals.setIsCreateMatchModalOpen(false)}
                preSelectedPitchId={myTeam?.homePitchId}
            />

            <CreateTeamModal
                isOpen={modals.isCreateTeamModalOpen}
                onClose={() => modals.setIsCreateTeamModalOpen(false)}
                onCreate={handleCreateTeam}
            />

            <JoinTeamModal
                isOpen={modals.isJoinTeamModalOpen}
                onClose={() => modals.setIsJoinTeamModalOpen(false)}
            />

            <AddPlayerModal
                isOpen={modals.isAddPlayerModalOpen}
                onClose={() => modals.setIsAddPlayerModalOpen(false)}
                currentRosterIds={roster.map(p => p.id!)}
                teamId={myTeam?.id}
            />
        </>
    );
};
