import React from 'react';
import { X, Calendar, MapPin, Map, Phone, Users, User, Shield, Handshake, ChevronRight } from 'lucide-react';
import { getTacticalAdvice } from '../services/geminiService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    channel: any;
    matchData: any;
    currentUser: any;
}

export const JokerDMChatInfoModal: React.FC<Props> = ({ isOpen, onClose, channel, matchData, currentUser }) => {
    if (!isOpen) return null;

    // Identify Joker
    // In a JOKER_NEGOTIATION channel, there are two participants: the inviter (usually captain) and the joker.
    // We want to show the joker's info.
    // If currentUser is the joker, we show the other person? No, the user asked for "Joker oyuncu detayları", 
    // which implies they want to see who they are talking to (the Joker). If the current user IS the joker, 
    // maybe they just see their own stats or the team they are talking to, but typically this is used by the captain.
    // Actually, let's just find the participant who is NOT the current user. They are the "Opponent" in this DM.
    const checkOpponent = () => {
        if (!channel?.participants) return null;
        return channel.participants.find((p: any) => p.user?.id !== currentUser?.id)?.user;
    };

    const opponent = checkOpponent();
    const opponentAvatar = opponent?.avatarUrl || `https://ui-avatars.com/api/?name=${opponent?.full_name || opponent?.username || 'G'}&background=1e293b&color=fff`;

    // Provide fallback info if not all details are available in participant object
    const jokerName = opponent?.full_name || opponent?.username || 'Joker Oyuncu';
    const position = opponent?.position || 'Mevki Belirtilmemiş';

    // Match Info from matchData (comes from /match-details API endpoint usually, or channel.reservation)
    // Let's fallback to channel.reservation if matchData is still loading or incomplete.
    const reservation = matchData?.reservation || channel?.reservation;

    // The pitch might be inside matchData.pitch, matchData.reservation.pitch, or channel.reservation.pitch
    const pitch = matchData?.pitch || reservation?.pitch || channel?.pitch;

    // Business might be inside the pitch object
    const business = pitch?.business || matchData?.business || reservation?.business;

    const finalPitchName = pitch?.name || matchData?.match?.pitchName || 'Saha Belli Değil';
    const finalBusinessName = business?.name || matchData?.match?.businessName || '';

    const dateStr = reservation?.slotTime
        ? new Date(reservation.slotTime).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })
        : 'Tarih Belli Değil';
    const timeStr = reservation?.slotTime
        ? new Date(reservation.slotTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        : '--:--';

    const matchType = matchData?.match?.matchType === 'kendi_aramizda' ? 'Kendi Aramızda' : 'Normal Maç';

    return (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
            <div className="bg-slate-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-800/50 sticky top-0 z-10">
                    <div>
                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                            <span className="text-yellow-500 font-black uppercase text-xs bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">Joker Bilgisi</span>
                            Sohbet Detayları
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full p-2 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-5 space-y-6">

                    {/* Joker Info Card */}
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                        <div className="flex items-center gap-4 relative z-10">
                            <div className="relative">
                                <img src={opponentAvatar} alt={jokerName} className="w-20 h-20 rounded-full object-cover border-4 border-slate-900 shadow-xl" />
                                <div className="absolute bottom-0 right-0 bg-yellow-500 p-1.5 rounded-full border-2 border-slate-900">
                                    <User className="w-3 h-3 text-yellow-900" />
                                </div>
                            </div>

                            <div className="flex-1">
                                <h4 className="text-xl font-black text-white italic tracking-wide">{jokerName}</h4>
                                <div className="text-turf-400 text-sm font-bold uppercase mt-1">{position}</div>
                                {opponent?.location && (
                                    <div className="text-slate-400 text-xs flex items-center gap-1 mt-1">
                                        <MapPin className="w-3 h-3" /> {opponent.location}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-5 relative z-10">
                            <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50 flex flex-col items-center">
                                <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">Yaş</span>
                                <span className="text-white font-sport text-lg">
                                    {opponent?.birthDate ? new Date().getFullYear() - new Date(opponent.birthDate).getFullYear() : '-'}
                                </span>
                            </div>
                            <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50 flex flex-col items-center">
                                <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">Ayak</span>
                                <span className="text-white font-sport text-sm mt-1 uppercase">
                                    {opponent?.foot || '-'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Match Info Card */}
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-turf-500" /> İlgili Maç
                        </h4>

                        <div className="space-y-4">
                            {/* Pitch Info */}
                            <div className="flex items-start gap-3">
                                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700 text-turf-500">
                                    <Map className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-white font-bold text-sm leading-tight">{finalPitchName}</div>
                                    <div className="text-slate-400 text-xs mt-0.5">{finalBusinessName}</div>
                                </div>
                            </div>

                            {/* Date & Time */}
                            <div className="flex items-start gap-3">
                                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700 text-blue-400">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div className="flex-1 flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-700">
                                    <div className="text-white font-bold text-sm">{dateStr}</div>
                                    <div className="text-blue-400 font-black tracking-wider bg-blue-500/10 px-2 py-1 rounded-lg text-sm">
                                        {timeStr}
                                    </div>
                                </div>
                            </div>

                            {/* Match Type Details */}
                            <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-400">
                                    <Users className="w-4 h-4" />
                                </div>
                                <div className="text-sm font-medium text-slate-300">
                                    <span className="text-white font-bold">{matchData?.match?.playerCount || 14}</span> Kişilik <span className="text-white">{matchType}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer (Close button or view full profile if needed) */}
                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition-colors border border-slate-700"
                    >
                        Kapat
                    </button>
                </div>

            </div>
        </div>
    );
};
