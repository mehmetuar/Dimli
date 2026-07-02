import React from 'react';
import { MapPin, X, UserPlus, Handshake, Edit } from 'lucide-react';
import { calculateAge } from '../../../../utils/calculateAge';
import { useModalBodyClass } from '../../../../utils/useModalBodyClass';
import { Flag } from '../../../../components/UI/Flag';

interface JokerDetailModalProps {
    selectedJoker: any;
    currentUser: any;
    setSelectedJoker: (joker: any) => void;
    setIsInviteModalOpen: (open: boolean) => void;
    setIsProfileModalOpen: (open: boolean) => void;
}

export const JokerDetailModal: React.FC<JokerDetailModalProps> = ({
    selectedJoker,
    currentUser,
    setSelectedJoker,
    setIsInviteModalOpen,
    setIsProfileModalOpen
}) => {
    useModalBodyClass(!!selectedJoker);
    if (!selectedJoker) return null;

    const isMe = currentUser && selectedJoker.id === currentUser.id;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/95 backdrop-blur-md animate-fade-in overflow-y-auto py-10">
            {/* Close Button */}
            <button
                onClick={() => setSelectedJoker(null)}
                className="fixed top-12 right-4 bg-white/10 p-3 rounded-full text-white hover:bg-red-600 transition-colors z-50 backdrop-blur"
            >
                <X className="w-6 h-6" />
            </button>

            <div className="w-full max-w-sm relative">
                {/* Card Container */}
                <div className="relative bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 rounded-[2rem] overflow-hidden border-[3px] border-yellow-500/30 shadow-[0_0_40px_rgba(234,179,8,0.15)]">

                    {/* Decorative Shine */}
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent z-0"></div>

                    {/* Card Header */}
                    <div className="relative z-10 pt-6 px-6 pb-0 flex justify-between items-start">
                        <div className="flex flex-col pt-4">
                            <span className="text-[clamp(16px,5vw,22px)] font-bold text-slate-300 uppercase tracking-widest !whitespace-nowrap overflow-hidden text-ellipsis">{selectedJoker.position}</span>
                            <div className="mt-2 flex items-center gap-1">
                                <Flag code={selectedJoker.nationality || 'TR'} />
                            </div>
                        </div>
                        <div className="w-40 h-40 relative -mr-4 -mt-2">
                            <img
                                src={selectedJoker.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedJoker.full_name || selectedJoker.username)}&background=1a2e35&color=4ade80&size=160`}
                                className="w-full h-full object-cover rounded-full border-4 border-slate-800/50 shadow-2xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"
                                alt={selectedJoker.full_name}
                            />
                        </div>
                    </div>

                    {/* Name */}
                    <div className="relative z-10 text-center mt-6 mb-4">
                        <h2 className="font-sport font-black text-[clamp(20px,7.5vw,36px)] text-white uppercase italic tracking-tighter drop-shadow-md !whitespace-nowrap shrink-0 overflow-hidden text-ellipsis">
                            {selectedJoker.full_name || selectedJoker.username}
                        </h2>
                        <div className="flex justify-center items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wide">
                            <MapPin className="w-3 h-3 text-turf-500" /> {selectedJoker.location || 'Konum belirtilmemiş'}
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="relative z-10 px-6 pb-6">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-white/5 rounded-xl p-2 sm:p-3 border border-white/10 flex flex-col items-center justify-center min-w-0">
                                <span className="text-[clamp(8px,2.2vw,10px)] text-slate-400 font-bold uppercase mb-0.5">YAŞ</span>
                                <span className="font-sport text-[clamp(16px,5vw,24px)] font-black text-white !whitespace-nowrap overflow-hidden text-ellipsis">
                                    {selectedJoker.birthDate ? calculateAge(selectedJoker.birthDate) : '-'}
                                </span>
                            </div>
                            <div className="bg-white/5 rounded-xl p-2 sm:p-3 border border-white/10 flex flex-col items-center justify-center min-w-0">
                                <span className="text-[clamp(8px,2.2vw,10px)] text-slate-400 font-bold uppercase mb-0.5">AYAK</span>
                                <span className="font-sport text-[clamp(10px,3.5vw,18px)] font-black text-white uppercase !whitespace-nowrap overflow-hidden text-ellipsis">{selectedJoker.foot || '-'}</span>
                            </div>
                            <div className="bg-white/5 rounded-xl p-2 sm:p-3 border border-white/10 flex flex-col items-center justify-center min-w-0">
                                <span className="text-[clamp(8px,2.2vw,10px)] text-slate-400 font-bold uppercase mb-0.5">MEVKİ</span>
                                <span className="font-sport text-[clamp(10px,3.5vw,18px)] font-black text-white uppercase !whitespace-nowrap overflow-hidden text-ellipsis">{selectedJoker.position || '-'}</span>
                            </div>
                            <div className="bg-white/5 rounded-xl p-2 sm:p-3 border border-white/10 flex flex-col items-center justify-center min-w-0">
                                <span className="text-[clamp(8px,2.2vw,10px)] text-slate-400 font-bold uppercase mb-0.5">YAN MEVKİ</span>
                                <span className="font-sport text-[clamp(10px,3.5vw,18px)] font-black text-slate-300 uppercase !whitespace-nowrap overflow-hidden text-ellipsis">{selectedJoker.secondaryPosition || '-'}</span>
                            </div>
                        </div>

                        {/* Sharing Status */}
                        <div className="flex gap-3 mb-6">
                            <div className={`w-full rounded-xl p-3 border flex flex-col justify-center items-center ${selectedJoker.sharesFee ? 'bg-turf-900/30 border-turf-500/30' : 'bg-slate-800 border-slate-700'}`}>
                                <Handshake className={`w-5 h-5 mb-1 ${selectedJoker.sharesFee ? 'text-turf-500' : 'text-slate-500'}`} />
                                <div className={`text-[10px] uppercase font-bold text-center leading-none ${selectedJoker.sharesFee ? 'text-turf-300' : 'text-slate-500'}`}>
                                    {selectedJoker.sharesFee ? 'Ücrete Ortak' : 'Ücrete Ortak Değil'}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        {!isMe && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsInviteModalOpen(true)}
                                    className="w-full bg-gradient-to-r from-turf-600 to-green-500 text-white font-black text-lg uppercase italic py-3 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-turf-500/30 flex items-center justify-center gap-2"
                                >
                                    <UserPlus className="w-5 h-5" /> Maça Davet Et
                                </button>
                            </div>
                        )}
                        {isMe && (
                            <button
                                onClick={() => { setSelectedJoker(null); setIsProfileModalOpen(true); }}
                                className="w-full bg-slate-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-600"
                            >
                                <Edit className="w-4 h-4" /> Profili Düzenle
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
