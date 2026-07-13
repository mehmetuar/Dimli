import { useState, useEffect, useCallback } from 'react';
import api from '../../../../services/api';
import { isDemoId, getDemoTeamRequests } from '../../PitchBooking/demo/demoTourData';

// Takım İstekleri modalı verisi: giden meydan okumalar + joker davetleri.
// Yalnız modal açıkken çekilir; iptal handler'ları optimistic günceller.
export const useTeamRequests = (teamId: string | undefined, isOpen: boolean) => {
    const [challenges, setChallenges] = useState<any[]>([]);
    const [jokerGroups, setJokerGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchAll = useCallback(async () => {
        if (!teamId) return;
        // Tanıtım turu demo takımı: sunucuya gidilmez — dummy meydan okuma +
        // Oyuncu 1'e joker daveti fikstürü basılır
        if (isDemoId(teamId)) {
            const demo = getDemoTeamRequests();
            setChallenges(demo.challenges);
            setJokerGroups(demo.jokerGroups);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [ch, jk] = await Promise.all([
                api.get(`/challenges/team/${teamId}/active`),
                api.get(`/notifications/joker-invites/team/${teamId}`),
            ]);
            setChallenges(Array.isArray(ch.data) ? ch.data : []);
            setJokerGroups(Array.isArray(jk.data) ? jk.data : []);
        } catch (err) {
            console.error('Takım istekleri çekilemedi:', err);
        } finally {
            setLoading(false);
        }
    }, [teamId]);

    useEffect(() => {
        if (isOpen) fetchAll();
    }, [isOpen, fetchAll]);

    // Meydan okumayı geri çek (yalnız PENDING; server kaptan/yardımcı doğrular)
    const cancelChallenge = async (challengeId: string) => {
        await api.delete(`/challenges/${challengeId}`);
        setChallenges((prev) => prev.filter((c) => c.id !== challengeId));
    };

    // Bekleyen joker davetini geri al (server kaptan/yardımcı doğrular)
    const cancelJokerInvite = async (matchId: string, jokerId: string) => {
        await api.delete(`/notifications/joker-invite/${jokerId}/${matchId}`);
        setJokerGroups((prev) =>
            prev
                .map((g) =>
                    g.matchId === matchId
                        ? {
                              ...g,
                              jokers: g.jokers.filter(
                                  (j: any) =>
                                      !(j.jokerId === jokerId && j.status === 'PENDING'),
                              ),
                          }
                        : g,
                )
                .filter((g) => g.jokers.length > 0),
        );
    };

    return { challenges, jokerGroups, loading, refetch: fetchAll, cancelChallenge, cancelJokerInvite };
};
