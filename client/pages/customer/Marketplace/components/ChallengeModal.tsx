import React, { useState } from 'react';
import { X, MapPin, Calendar, Clock, Swords, Store, Banknote, Navigation, Users } from 'lucide-react';
import { LoadingSpinner } from '../../../../components/UI/LoadingSpinner';
import { KeyboardAwareModal } from '../../../../components/Modals/KeyboardAwareModal';
import { addOneHour } from '../../../../utils/time';
import { teamInitialsAvatar } from '../../../../utils/teamColors';
import { CharCountTextarea } from '../../../../components/UI/CharCountTextarea';
import { NOTE_CHAR_LIMITS } from '../../../../utils/noteLimits';

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
            bodyClassName="p-[clamp(12px,2.2vh,24px)] space-y-[clamp(8px,1.6vh,18px)]"
            header={
                <div className="bg-gradient-to-r from-turf-600 to-turf-700 relative overflow-hidden" style={{ padding: 'clamp(14px, 2.5vh, 20px)' }}>
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>

                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 bg-black/20 hover:bg-black/40 p-2 rounded-full text-white transition-colors z-20"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <h2 className="font-sport font-black text-white uppercase italic tracking-wide relative z-10" style={{ fontSize: 'clamp(1.15rem, 3vh, 1.5rem)' }}>
                        Meydan Oku
                    </h2>
                    <p className="text-turf-100 mt-0.5 relative z-10 font-medium" style={{ fontSize: 'clamp(0.72rem, 1.7vh, 0.875rem)' }}>Rakip takıma maç teklifi gönder</p>
                </div>
            }
            footer={
                <div className="flex gap-3 border-t border-slate-700/40" style={{ padding: 'clamp(8px,1.4vh,12px) clamp(12px,2.2vh,24px) clamp(12px,2.2vh,24px)' }}>
                    <button
                        onClick={onClose}
                        className="flex-1 bg-slate-800 text-slate-300 rounded-xl font-bold uppercase tracking-wider hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                        style={{ height: 'clamp(42px, 6.5vh, 52px)', fontSize: 'clamp(0.75rem, 1.9vh, 0.875rem)' }}
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="flex-[2] bg-turf-600 text-white rounded-xl font-black uppercase tracking-wider hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{ height: 'clamp(42px, 6.5vh, 52px)', fontSize: 'clamp(0.75rem, 1.9vh, 0.875rem)' }}
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
            }
        >
                    {/* Match Info Card */}
                    <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden">
                        {/* Team Header */}
                        <div className="flex items-center gap-3 border-b border-slate-700/50 bg-slate-800/30" style={{ padding: 'clamp(10px,1.8vh,16px)' }}>
                            <img
                                src={match.teamLogo || teamInitialsAvatar(match.teamName)}
                                alt={match.teamName}
                                className="rounded-full border-2 border-slate-600 object-cover shrink-0"
                                style={{ width: 'clamp(42px,7vh,48px)', height: 'clamp(42px,7vh,48px)' }}
                                onError={(e) => { const el = e.currentTarget; el.onerror = null; el.src = teamInitialsAvatar(match.teamName); }}
                            />
                            <div className="min-w-0">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Rakip Takım</div>
                                <h3 className="font-sport font-bold text-white uppercase italic truncate" style={{ fontSize: 'clamp(1rem,2.5vh,1.25rem)' }}>{match.teamName}</h3>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2" style={{ padding: 'clamp(10px,1.8vh,16px)', gap: 'clamp(8px,1.5vh,16px)' }}>
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
                        <CharCountTextarea
                            value={note}
                            onChange={setNote}
                            placeholder="Örn: Takımımız hazır, bekliyoruz."
                            className="w-full bg-slate-900 text-white p-3.5 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none resize-none h-[clamp(56px,10vh,104px)] text-sm placeholder:text-slate-600"
                            maxChars={NOTE_CHAR_LIMITS.match}
                        />
                    </div>
        </KeyboardAwareModal>
    );
};
