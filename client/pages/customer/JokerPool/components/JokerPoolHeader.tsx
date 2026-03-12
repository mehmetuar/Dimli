import React from 'react';

interface JokerPoolHeaderProps {
    currentUser: any;
    setIsProfileModalOpen: (open: boolean) => void;
}

export const JokerPoolHeader: React.FC<JokerPoolHeaderProps> = ({ currentUser, setIsProfileModalOpen }) => {
    return (
        <header className="mb-6 flex justify-between items-end">
            <div>
                <h1 className="font-sport font-black text-4xl text-white uppercase italic tracking-tighter">
                    JOKER <span className="text-turf-500">HAVUZU</span>
                </h1>
                <p className="text-slate-400 text-sm">Eksik oyuncu mu var? Scout et ve çağır.</p>
            </div>
            <button
                onClick={() => setIsProfileModalOpen(true)}
                className={`${currentUser?.isJoker ? 'bg-slate-800 border-slate-600' : 'bg-turf-600 border-turf-500 shadow-neon'} border text-white px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105`}
            >
                {currentUser?.isJoker ? 'Profilini Düzenle' : 'Profilini Ekle'}
            </button>
        </header>
    );
};
