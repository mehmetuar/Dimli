import React from 'react';
import { Settings, MapPin } from 'lucide-react';
import { PlayerDetailModal } from '../../../../components/Modals/PlayerDetailModal';
import { useNavigate } from 'react-router-dom';

interface ProfileHeaderCardProps {
    currentUser: any;
    /** Sunucudan türetilen canlı ilçe (LocationContext.locationName) — currentUser.location'a tercih edilir */
    liveLocation?: string | null;
    calculateAge: (birthDate: string | Date) => number | string;
    handleUpdateLocation: (isAuto?: boolean) => void;
    isModalOpen: boolean;
    setIsModalOpen: (isOpen: boolean) => void;
    setIsMenuOpen: (isOpen: boolean) => void;
}

export const ProfileHeaderCard: React.FC<ProfileHeaderCardProps> = ({
    currentUser,
    liveLocation,
    calculateAge,
    handleUpdateLocation,
    isModalOpen,
    setIsModalOpen,
    setIsMenuOpen
}) => {
    const navigate = useNavigate();

    return (
        <>
            <div className="animate-fade-in">
                <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                    <div className="relative z-10 p-6 flex flex-col items-center">
                        <div
                            className="w-24 h-24 xs:w-28 xs:h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-gradient-to-r from-turf-500 to-blue-500 mb-2 sm:mb-4 relative group-avatar cursor-pointer"
                            onClick={() => setIsModalOpen(true)}
                        >
                            {currentUser.avatarUrl ? (
                                <img
                                    src={currentUser.avatarUrl}
                                    alt="Profile"
                                    className="w-full h-full rounded-full object-cover border-4 border-slate-900"
                                />
                            ) : (
                                <div className="w-full h-full rounded-full border-4 border-slate-900 bg-gradient-to-br from-turf-600 to-blue-600 flex items-center justify-center">
                                    <span className="text-white font-sport font-bold text-3xl">
                                        {(currentUser.full_name || currentUser.username || '?')
                                            .trim().split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
                                    </span>
                                </div>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(true); }}
                                className="absolute -right-2 -bottom-2 bg-slate-800 text-white p-2.5 rounded-full border border-slate-600 shadow-lg hover:bg-slate-700 hover:scale-110 transition-all z-20"
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                        </div>

                        <h2
                            className="font-sport font-bold text-2xl xs:text-3xl sm:text-4xl text-white uppercase italic tracking-wide mb-4 sm:mb-6 cursor-pointer hover:text-turf-400 transition-colors text-center px-2"
                            onClick={() => setIsModalOpen(true)}
                        >
                            {currentUser.full_name || currentUser.username}
                        </h2>

                        <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full">
                            <div className="bg-slate-800/50 p-2 sm:p-3 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-0.5 sm:gap-1">
                                <span className="text-slate-400 text-[9px] xs:text-[10px] sm:text-xs font-bold uppercase tracking-wider">YAŞ</span>
                                <span className="text-white font-sport text-lg sm:text-xl font-bold">{calculateAge(currentUser.birthDate)}</span>
                            </div>
                            <div className="bg-slate-800/50 p-2 sm:p-3 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-0.5 sm:gap-1 relative group">
                                <span className="text-slate-400 text-[9px] xs:text-[10px] sm:text-xs font-bold uppercase tracking-wider">KONUM</span>
                                <span className="text-white font-sport text-base sm:text-lg font-bold truncate max-w-[100px] xs:max-w-[120px] sm:max-w-full text-center">{liveLocation || currentUser.location || 'İstanbul'}</span>
                                <button onClick={() => handleUpdateLocation(false)} className="absolute top-1 right-1 text-turf-500 hover:text-white transition-colors">
                                    <MapPin className="w-3 h-3" />
                                </button>
                            </div>
                            <div className="bg-slate-800/50 p-2 sm:p-3 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-0.5 sm:gap-1 col-span-2">
                                <span className="text-slate-400 text-[9px] xs:text-[10px] sm:text-xs font-bold uppercase tracking-wider">MEVKİ</span>
                                <span className="text-turf-400 font-sport text-xl sm:text-2xl font-bold">{currentUser.position || '-'}</span>
                            </div>
                            <div className="bg-slate-800/50 p-2 sm:p-3 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-0.5 sm:gap-1">
                                <span className="text-slate-400 text-[9px] xs:text-[10px] sm:text-xs font-bold uppercase tracking-wider">YAN MEVKİ</span>
                                <span className="text-white font-sport text-base sm:text-lg font-bold">{currentUser.secondaryPosition || '-'}</span>
                            </div>
                            <div className="bg-slate-800/50 p-2 sm:p-3 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-0.5 sm:gap-1">
                                <span className="text-slate-400 text-[9px] xs:text-[10px] sm:text-xs font-bold uppercase tracking-wider">AYAK</span>
                                <span className="text-white font-sport text-lg sm:text-xl font-bold uppercase">{currentUser.foot || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <PlayerDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                player={{
                    id: currentUser.id,
                    name: currentUser.full_name || currentUser.username,
                    position: currentUser.position || '-',
                    secondaryPosition: currentUser.secondaryPosition,
                    location: liveLocation || currentUser.location,
                    birthDate: currentUser.birthDate,
                    foot: currentUser.foot,
                    nationality: currentUser.nationality,
                    isJoker: false,
                    avatarUrl: currentUser.avatarUrl || undefined,
                    favoritePitchIds: currentUser.favoriteBusinessIds || [],
                    sharesFee: false
                } as any}
                isMe={true}
                onEdit={() => navigate('/settings/profile')}
            />
        </>
    );
};
