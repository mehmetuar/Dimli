import React from 'react';
import { Calendar, History, Swords } from 'lucide-react';

interface TeamActionButtonsProps {
    fetchUpcomingMatches: () => void;
    setIsUpcomingMatchesOpen: (isOpen: boolean) => void;
    fetchMatchHistory: () => void;
    setIsMatchHistoryOpen: (isOpen: boolean) => void;
    setIsTeamRequestsOpen: (isOpen: boolean) => void;
}

export const TeamActionButtons: React.FC<TeamActionButtonsProps> = ({
    setIsUpcomingMatchesOpen, fetchUpcomingMatches, fetchMatchHistory, setIsMatchHistoryOpen,
    setIsTeamRequestsOpen
}) => {
    return (
        <>
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

            {/* Takım İstekleri: giden meydan okumalar + joker davetleri (sekmeli modal).
                Tüm üyelere görünür; iptal/geri al yalnız kaptan/yardımcıda (modal içinde).
                Renk: lacivert — modal içi mavi/lacivert tonlarıyla tutarlı. */}
            <button
                onClick={() => setIsTeamRequestsOpen(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold py-3 rounded-xl hover:from-blue-500 hover:to-indigo-600 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
                <Swords className="w-5 h-5" />
                Takım İstekleri
            </button>

            <button
                onClick={() => {
                    setIsMatchHistoryOpen(true);
                    fetchMatchHistory();
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
            >
                <History className="w-5 h-5" />
                Geçmiş Maçlar
            </button>
        </>
    );
};
