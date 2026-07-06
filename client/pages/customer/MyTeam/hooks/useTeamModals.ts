import { useState, useEffect } from 'react';
import { Player } from '../../../../types';

export const useTeamModals = () => {
    const [isEditingPitch, setIsEditingPitch] = useState(false);
    const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
    const [isJoinTeamModalOpen, setIsJoinTeamModalOpen] = useState(false);
    const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
    const [isMatchHistoryOpen, setIsMatchHistoryOpen] = useState(false);
    const [isUpcomingMatchesOpen, setIsUpcomingMatchesOpen] = useState(false);
    const [isTeamRequestsOpen, setIsTeamRequestsOpen] = useState(false);
    const [isCreateMatchModalOpen, setIsCreateMatchModalOpen] = useState(false);
    const [isTeamMenuOpen, setIsTeamMenuOpen] = useState(false);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDangerous?: boolean;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const [playerActionsModal, setPlayerActionsModal] = useState<{
        isOpen: boolean;
        player: Partial<Player> | null;
    }>({ isOpen: false, player: null });

    useEffect(() => {
        if (playerActionsModal.isOpen) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
        return () => document.body.classList.remove('modal-open');
    }, [playerActionsModal.isOpen]);

    return {
        isEditingPitch, setIsEditingPitch,
        isCreateTeamModalOpen, setIsCreateTeamModalOpen,
        isJoinTeamModalOpen, setIsJoinTeamModalOpen,
        isAddPlayerModalOpen, setIsAddPlayerModalOpen,
        isMatchHistoryOpen, setIsMatchHistoryOpen,
        isUpcomingMatchesOpen, setIsUpcomingMatchesOpen,
        isTeamRequestsOpen, setIsTeamRequestsOpen,
        isCreateMatchModalOpen, setIsCreateMatchModalOpen,
        isTeamMenuOpen, setIsTeamMenuOpen,
        confirmModal, setConfirmModal,
        playerActionsModal, setPlayerActionsModal
    };
};
