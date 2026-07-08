import React from 'react';
import { CreateTeamModal } from './CreateTeamModal';
import { JoinTeamModal } from './JoinTeamModal';
import { AddPlayerModal } from './AddPlayerModal';
import { ConfirmModal } from '../../../../components/Modals/ConfirmModal';
import { MatchHistoryModal } from './MatchHistoryModal';
import { UpcomingMatchesModal } from './UpcomingMatchesModal';
import { TeamRequestsModal } from './TeamRequestsModal';
import { CreateMatchModal } from '../../../../components/Modals/CreateMatchModal';
import { SuccessModal, SuccessType } from '../../../../components/Modals/SuccessModal';
import { TeamCreatedCelebration } from './TeamCreatedCelebration';
import { MatchHistoryItem } from '../../../../types';

interface TeamModalsProps {
    modals: any;
    myTeam: any;
    roster: any[];
    upcomingMatches: any[];
    isUpcomingLoading: boolean;
    handleCreateTeam: (data: any) => void;
    matchHistory: MatchHistoryItem[];
    matchHistoryTotal: number;
    hasMoreMatchHistory: boolean;
    isMatchHistoryLoading: boolean;
    isLoadingMoreHistory: boolean;
    loadMoreMatchHistory: () => void;
    applyRatingResult: (reservationId: string, businessScore: number, fairPlayScore: number | null) => void;
    isLeader: boolean;
    successMessage: string;
    successType: SuccessType | null;
    setSuccessMessage: (msg: string) => void;
    setSuccessType: (type: SuccessType | null) => void;
}

export const TeamModals: React.FC<TeamModalsProps> = ({
    modals, myTeam, roster, upcomingMatches, isUpcomingLoading, handleCreateTeam,
    matchHistory, matchHistoryTotal, hasMoreMatchHistory, isMatchHistoryLoading,
    isLoadingMoreHistory, loadMoreMatchHistory, applyRatingResult, isLeader,
    successMessage, successType, setSuccessMessage, setSuccessType
}) => {
    return (
        <>
            {/* Takım kurulunca standart modal yerine World Cup kutlaması (animasyon bitince Takımım'a). */}
            <TeamCreatedCelebration
                isOpen={!!successMessage && successType === 'TEAM_CREATED'}
                teamName={myTeam?.name}
                onDone={() => {
                    // Reload YOK: handleCreateTeam myTeam+bio+roster'ı zaten doldurdu (create yanıtı findOne
                    // → players+description dahil) ve kullanıcı TAKIMIM tab'ında → kutlamayı kapatmak yeterli.
                    // Böylece ilk-açılış Takım Ruhu/Kadro boş-kalma bug'ı + reload yarışı tamamen giderilir.
                    setSuccessMessage('');
                    setSuccessType(null);
                }}
            />

            <SuccessModal
                isOpen={!!successMessage && !!successType && successType !== 'TEAM_CREATED'}
                onClose={() => {
                    setSuccessMessage('');
                    setSuccessType(null);
                }}
                message={successMessage}
                type={successType || 'DEFAULT'}
                confirmText="TAMAM"
                onConfirm={() => {
                    setSuccessMessage('');
                    setSuccessType(null);
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
                total={matchHistoryTotal}
                hasMore={hasMoreMatchHistory}
                isLoading={isMatchHistoryLoading}
                isLoadingMore={isLoadingMoreHistory}
                onLoadMore={loadMoreMatchHistory}
                applyRatingResult={applyRatingResult}
                teamFairPlayScore={myTeam?.fairPlayScore || 5.0}
            />

            <UpcomingMatchesModal
                isOpen={modals.isUpcomingMatchesOpen}
                onClose={() => modals.setIsUpcomingMatchesOpen(false)}
                matches={upcomingMatches}
                currentTeamId={myTeam?.id}
                isLoading={isUpcomingLoading}
            />

            <TeamRequestsModal
                isOpen={modals.isTeamRequestsOpen}
                onClose={() => modals.setIsTeamRequestsOpen(false)}
                teamId={myTeam?.id}
                isLeader={isLeader}
            />

            <CreateMatchModal
                isOpen={modals.isCreateMatchModalOpen}
                onClose={() => modals.setIsCreateMatchModalOpen(false)}
                preSelectedBusinessId={myTeam?.homeBusinessId}
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
                teamShortId={myTeam?.shortId}
                teamName={myTeam?.name}
            />
        </>
    );
};
