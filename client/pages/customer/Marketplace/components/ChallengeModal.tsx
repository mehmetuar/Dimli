import React, { useState } from 'react';
import { X, MapPin, Calendar, Clock, Swords, Store, Banknote, Navigation, Users } from 'lucide-react';
import { LoadingSpinner } from '../../../../components/UI/LoadingSpinner';
import { KeyboardAwareModal } from '../../../../components/Modals/KeyboardAwareModal';
import { addOneHour } from '../../../../utils/time';
import { teamInitialsAvatar } from '../../../../utils/teamColors';

interface ChallengeModalProps {
    isOpen: boolean;
    onClose: () => void;
    match: {
        id: string;
        teamName: string;
        teamLogo: string;
        date: string;
        time: string;
        pitchName: string;
        pitchLocation: string;
        businessName?: string;
        pricePerTeam?: number;
        distanceKm?: number;
        playerCount?: number;
    };
    onSubmit: (note: string) => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({ isOpen, onClose, match, onSubmit }) => {
    const [note, setNote] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const endTime = addOneHour(match.time);

    const handleSubmit = async () => {
        setIsLoading(true);
        await onSubmit(note);
        setIsLoading(false);
        setNote('');
        onClose();
    };

    return (
        <KeyboardAwareModal
            isOpen={isOpen}
            portalToBody
            zClassName="z-[70]"
            panelClassName="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 shadow-2xl shadow-turf-500/20"
            bodyClassName="p-6 space-y-6"
            header={
                <div className="bg-gradient-to-r from-turf-600 to-turf-700 p-5 relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 p-2 rounded-full text-white transition-colors z-20"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <h2 className="font-sport font-black text-2xl text-white uppercase italic tracking-wide relative z-10">
                        Meydan Oku
                    </h2>
                    <p className="text-turf-100 text-sm mt-1 relative z-10 font-medium">Rakip takıma maç teklifi gönder</p>
                </div>
            }
        >
                    {/* Match Info Card */}
                    <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden">
                        {/* Team Header */}
                        <div className="p-4 flex items-center gap-4 border-b border-slate-700/50 bg-slate-800/30">
                            <img
                                src={match.teamLogo || teamInitialsAvatar(match.teamName)}
                                alt={match.teamName}
                                className="w-12 h-12 rounded-full border-2 border-slate-600 object-cover"
                                onError={(e) => { const el = e.currentTarget; el.onerror = null; el.src = teamInitialsAvatar(match.teamName); }}
                            />
                            <div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Rakip Takım</div>
                                <h3 className="font-sport font-bold text-xl text-white uppercase italic">{match.teamName}</h3>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="p-4 grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase">
                                    <Calendar className="w-3 h-3" /> Tarih
                                </div>
                                <div className="text-white font-bold text-sm">{match.date}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase">
                                    <Clock className="w-3 h-3" /> Saat
                                </div>
                                <div className="text-white font-bold text-sm">{match.time}{endTime ? ` - ${endTime}` : ''}</div>
                            </div>
                            {match.playerCount != null && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase">
                                        <Users className="w-3 h-3" /> Format
                                    </div>
                                    <div className="text-white font-bold text-sm">{match.playerCount}v{match.playerCount}</div>
                                </div>
                            )}
                            {match.distanceKm != null && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase">
                                        <Navigation className="w-3 h-3" /> Uzaklık
                                    </div>
                                    <div className="text-turf-400 font-bold text-sm">{match.distanceKm} km</div>
                                </div>
                            )}
                            <div className="col-span-2 space-y-1 pt-2 border-t border-slate-700/30">
                                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase">
                                    <Store className="w-3 h-3" /> İşletme & Saha
                                </div>
                                <div className="text-white font-bold text-sm">
                                    {match.businessName && <span className="text-turf-400">{match.businessName} - </span>}
                                    {match.pitchName}
                                </div>
                            </div>
                            <div className="col-span-2 space-y-1">
                                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase">
                                    <MapPin className="w-3 h-3" /> Konum
                                </div>
                                <div className="text-slate-300 text-sm">{match.pitchLocation}</div>
                            </div>
                            {match.pricePerTeam && (
                                <div className="col-span-2 mt-2 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                                        <Banknote className="w-4 h-4 text-green-500" /> Takım Ücreti
                                    </div>
                                    <div className="text-green-400 font-bold text-sm">{match.pricePerTeam} ₺</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Note Input */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">
                            Kaptan Mesajı (Opsiyonel)
                        </label>
                        <div className="relative">
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Örn: Merhaba, takımımız hazır. Maçı onaylarsanız detayları konuşalım."
                                className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none resize-none h-28 text-sm placeholder:text-slate-600"
                                maxLength={200}
                            />
                            <div className="absolute bottom-3 right-3 text-[10px] font-bold text-slate-600 bg-slate-800 px-2 py-0.5 rounded-md">
                                {note.length}/200
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 bg-slate-800 text-slate-300 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                        >
                            Vazgeç
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="flex-[2] bg-turf-600 text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <LoadingSpinner size="sm" text="" />
                            ) : (
                                <>
                                    Meydan Oku <Swords className="w-5 h-5 fill-current" />
                                </>
                            )}
                        </button>
                    </div>
        </KeyboardAwareModal>
    );
};
