import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { UserProfile } from '../UserProfile/UserProfile';
import { MyTeam } from '../MyTeam/MyTeam';

export const TeamProfile: React.FC = () => {
    const location = useLocation();
    // Dışarıdan openModal state geliyorsa doğrudan TAKIMIM tabını aç
    const hasTeamModal = !!(location.state as any)?.openModal;
    const [activeTab, setActiveTab] = useState<'PLAYER' | 'TEAM'>(hasTeamModal ? 'TEAM' : 'PLAYER');

    return (
        <div className="pb-28 pt-20 px-4 max-w-3xl mx-auto min-h-screen bg-pitch relative">
            {/* Tab Switcher */}
            <div className="flex p-1 bg-slate-800 rounded-xl mb-8 border border-slate-700 sticky top-20 z-40 shadow-lg">
                <button
                    onClick={() => setActiveTab('PLAYER')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'PLAYER' ? 'bg-turf-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    PROFİLİM
                </button>
                <button
                    onClick={() => setActiveTab('TEAM')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'TEAM' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    TAKIMIM
                </button>
            </div>

            {activeTab === 'PLAYER' ? <UserProfile /> : <MyTeam />}
        </div>
    );
};
