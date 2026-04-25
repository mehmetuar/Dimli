import React from 'react';

interface JokerPoolHeaderProps {
    currentUser: any;
    setIsProfileModalOpen: (open: boolean) => void;
}

export const JokerPoolHeader: React.FC<JokerPoolHeaderProps> = ({ currentUser, setIsProfileModalOpen }) => {
    return (
        <header className="mb-8 flex justify-between items-end gap-3 px-1">
            <div className="min-w-0">
                <h1 className="font-sport font-black text-3xl xs:text-4xl sm:text-5xl text-white uppercase italic tracking-tighter leading-tight">
                    JOKER <span className="text-turf-500">HAVUZU</span>
                </h1>
                <p className="text-slate-400 font-medium text-[12px] xs:text-sm sm:text-base mt-1 leading-tight whitespace-nowrap">
                    Eksik oyuncu mu var? Scout et ve çağır.
                </p>
            </div>
            <button
                onClick={() => setIsProfileModalOpen(true)}
                className={`${currentUser?.isJoker ? 'bg-slate-800 border-slate-600' : 'bg-turf-600 border-turf-500 shadow-neon'} border text-white shrink-0 px-3 xs:px-4 py-2 rounded-xl text-[10px] xs:text-[11px] sm:text-xs font-bold transition-all hover:scale-105 active:scale-95 mb-0.5`}
            >
                {currentUser?.isJoker ? 'Profilini Düzenle' : 'Profilini Ekle'}
            </button>
        </header>
    );
};
