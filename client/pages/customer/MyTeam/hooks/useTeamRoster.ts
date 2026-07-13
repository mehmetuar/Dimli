import api from '../../../../services/api';
import { isDemoId } from '../../PitchBooking/demo/demoTourData';

interface TeamRosterProps {
    myTeam: any;
    setMyTeam: any;
    setRoster: any;
    setPlayerActionsModal: any;
    setConfirmModal: any;
    setSuccessMessage: any;
    setSuccessType: any;
    setErrorMessage: any;
}

export const useTeamRoster = ({
    myTeam, setMyTeam, setRoster,
    setPlayerActionsModal, setConfirmModal,
    setSuccessMessage, setSuccessType, setErrorMessage
}: TeamRosterProps) => {

    const handleKickPlayer = (playerId: string) => {
        if (!myTeam) return;
        if (isDemoId(myTeam.id)) return; // tanıtım turu: mutasyon yok

        setPlayerActionsModal({ isOpen: false, player: null });

        setConfirmModal({
            isOpen: true,
            title: 'Takımdan At',
            message: 'Bu oyuncuyu takımdan çıkarmak istiyor musun?',
            isDangerous: true,
            onConfirm: async () => {
                try {
                    await api.delete(`/teams/${myTeam.id}/players/${playerId}`);
                    setRoster((prev: any[]) => prev.filter((p: any) => p.id !== playerId));
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
        try {
            if (!myTeam?.id) return;
            if (isDemoId(myTeam.id)) return; // tanıtım turu: mutasyon yok

            const response = await api.patch(`/teams/${myTeam.id}/vice-captains`, {
                remove: playerId
            });

            setMyTeam(response.data);
            setSuccessMessage('Oyuncunun yetkileri alındı.');
            setSuccessType('ROLE_REMOVED');
        } catch (error: any) {
            console.error('Failed to remove vice-captain:', error);
            setErrorMessage(error.response?.data?.message || 'İşlem başarısız.');
        }
    };

    const VICE_LIMIT_MESSAGE =
        'Bir takımda en fazla 2 yardımcı kaptan olabilir. Yeni bir yardımcı atamak için önce mevcut yardımcılardan birinin yetkisini kaldırmalısın.';

    const handlePromotePlayer = async (playerId: string, role: 'CAPTAIN' | 'VICE') => {
        if (!myTeam) return;
        if (isDemoId(myTeam.id)) return; // tanıtım turu: mutasyon yok

        // Ön-kontrol: 2 yardımcı doluyken API'ye gitmeden uyarı modalı
        // (server'da da 409 guard'ı var — bayat state yarışına karşı aşağıdaki catch eşler).
        if (role === 'VICE' && (myTeam.viceCaptainIds?.length ?? 0) >= 2) {
            setSuccessMessage(VICE_LIMIT_MESSAGE);
            setSuccessType('VICE_LIMIT');
            return;
        }

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
            if (role === 'VICE' && error.response?.status === 409) {
                setSuccessMessage(error.response?.data?.message || VICE_LIMIT_MESSAGE);
                setSuccessType('VICE_LIMIT');
                return;
            }
            setErrorMessage(error.response?.data?.message || "Rol güncellenemedi.");
        }
    };

    return {
        handleKickPlayer,
        handleRevokeViceCaptain,
        handlePromotePlayer
    };
};
