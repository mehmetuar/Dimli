import { useState, useCallback } from 'react';
import api from '../../../../services/api';
import { JokerMatchHistoryItem } from '../../../../types';

/**
 * Kullanıcının JOKER olarak oynadığı maçları getirir (Hesap › Joker Geçmişi).
 * useMyTeam.fetchMatchHistory desenini izler — açılışta çağrılır, sonuç modalda gösterilir.
 */
export const useJokerHistory = () => {
    const [matches, setMatches] = useState<JokerMatchHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchJokerMatches = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/ratings/joker-history');
            setMatches(response.data || []);
        } catch (error) {
            console.error('Joker geçmişi alınamadı:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { matches, isLoading, fetchJokerMatches };
};
