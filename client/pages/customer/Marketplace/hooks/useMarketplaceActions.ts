import React, { useState } from 'react';
import api from '../../../../services/api';

interface MarketplaceActionsProps {
    myTeam: any;
    selectedMatch: any;
    setSelectedMatch: (match: any) => void;
    setMyChallenges: React.Dispatch<React.SetStateAction<any[]>>;
    setIsChallengeModalOpen: (isOpen: boolean) => void;
    setMatches: React.Dispatch<React.SetStateAction<any[]>>;
}

export const useMarketplaceActions = ({
    myTeam,
    selectedMatch,
    setSelectedMatch,
    setMyChallenges,
    setIsChallengeModalOpen,
    setMatches
}: MarketplaceActionsProps) => {
    const [confirmCancelModal, setConfirmCancelModal] = useState<{ isOpen: boolean; challengeId: string | null }>({ isOpen: false, challengeId: null });
    const [confirmDeleteAdModal, setConfirmDeleteAdModal] = useState<{ isOpen: boolean; adId: string | null }>({ isOpen: false, adId: null });
    const [successModal, setSuccessModal] = useState<{
        isOpen: boolean;
        message: string;
        type: 'CHALLENGE_SENT' | 'DEFAULT' | 'CREATE_AD' | 'CHALLENGE_ACCEPTED';
    }>({ isOpen: false, message: '', type: 'DEFAULT' });

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

    const handleCancelClick = (challengeId: string) => {
        setConfirmCancelModal({ isOpen: true, challengeId });
    };

    const handleDeleteAdClick = (adId: string) => {
        setConfirmDeleteAdModal({ isOpen: true, adId });
    };

    return {
        confirmCancelModal,
        setConfirmCancelModal,
        confirmDeleteAdModal,
        setConfirmDeleteAdModal,
        successModal,
        setSuccessModal,
        handleSubmitChallenge,
        handleConfirmCancel,
        handleConfirmDeleteAd,
        handleCancelClick,
        handleDeleteAdClick
    };
};
