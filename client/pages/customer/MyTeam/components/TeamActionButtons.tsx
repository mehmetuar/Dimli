import React from 'react';
import { Calendar, History } from 'lucide-react';

interface TeamActionButtonsProps {
    fetchUpcomingMatches: () => void;
    setIsUpcomingMatchesOpen: (isOpen: boolean) => void;
    setIsMatchHistoryOpen: (isOpen: boolean) => void;
}

export const TeamActionButtons: React.FC<TeamActionButtonsProps> = ({
    setIsUpcomingMatchesOpen, fetchUpcomingMatches, setIsMatchHistoryOpen
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

            <button
                onClick={() => setIsMatchHistoryOpen(true)}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
            >
                <History className="w-5 h-5" />
                Geçmiş Maçlar
            </button>
        </>
    );
};
