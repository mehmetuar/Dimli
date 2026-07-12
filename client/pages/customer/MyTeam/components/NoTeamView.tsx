import React from 'react';
import { Shield } from 'lucide-react';

interface NoTeamViewProps {
    setIsJoinTeamModalOpen: (isOpen: boolean) => void;
    setIsCreateTeamModalOpen: (isOpen: boolean) => void;
}

export const NoTeamView: React.FC<NoTeamViewProps> = ({
    setIsJoinTeamModalOpen, setIsCreateTeamModalOpen
}) => {
    return (
        <div className="animate-fade-in p-6 bg-slate-800 rounded-2xl border border-slate-700 text-center mt-6">
            <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-white font-bold text-lg mb-2">Henüz Bir Takımın Yok</h3>
            <p className="text-slate-400 text-sm mb-4">Bir takıma katıl veya kendi takımını kurarak sahalara hükmet.</p>
            <div className="flex gap-3 justify-center">
                <button
                    onClick={() => setIsJoinTeamModalOpen(true)}
                    className="px-6 py-3 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600 transition-colors"
                >
                    Takım Bul
                </button>
                <button
                    data-tour-id="team-create-btn"
                    onClick={() => setIsCreateTeamModalOpen(true)}
                    className="px-6 py-3 bg-turf-600 text-white font-bold rounded-xl hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20"
                >
                    Takım Kur
                </button>
            </div>
        </div>
    );
};
