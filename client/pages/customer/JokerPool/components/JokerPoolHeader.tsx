import React from 'react';

interface JokerPoolHeaderProps {
    currentUser: any;
    setIsProfileModalOpen: (open: boolean) => void;
}

export const JokerPoolHeader: React.FC<JokerPoolHeaderProps> = ({ currentUser, setIsProfileModalOpen }) => {
    return (
        <header className="mb-8 px-1">
            <div className="flex items-start justify-between gap-2">
                <h1 className="font-sport font-black text-[clamp(1.75rem,8vw,3rem)] text-white uppercase italic tracking-tighter leading-tight">
                    JOKER <span className="text-turf-500">HAVUZU</span>
                </h1>
                <button
                    onClick={() => setIsProfileModalOpen(true)}
                    className={`${currentUser?.isJoker ? 'bg-slate-800 border-slate-600' : 'bg-turf-600 border-turf-500 shadow-neon'} border text-white shrink-0 mt-1.5 px-2.5 xs:px-3 sm:px-4 py-1.5 xs:py-2 rounded-xl text-[10px] xs:text-[11px] sm:text-xs font-bold transition-all hover:scale-105 active:scale-95`}
                >
                    {currentUser?.isJoker ? 'Profilini Düzenle' : 'Profilini Ekle'}
                </button>
            </div>
            <p className="text-slate-400 font-medium text-xs sm:text-sm mt-1 leading-tight">
                Eksik oyuncu mu var? Scout et ve çağır.
            </p>
        </header>
    );
};
