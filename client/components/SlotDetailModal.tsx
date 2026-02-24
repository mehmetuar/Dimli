import React, { useState } from 'react';
import { X, Users, MessageCircle, Shield, Clock } from 'lucide-react';
import { Team } from '../types';

interface SlotDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    slotTime: string; // e.g., "19:00"
    slotEndTime?: string; // e.g., "20:00"
    reservations: any[]; // Pending reservations
    announcements: any[]; // Looking for opponent
    approvedReservation?: any; // If FULL
    onCreateAd: () => void; // New prop for creating ad
    isAuthorized: boolean; // To check if user can create ad
    onChallenge: (matchId: string, teamName: string) => void;
    currentTeamId?: string;
}

export const SlotDetailModal: React.FC<SlotDetailModalProps> = ({
    isOpen,
    onClose,
    slotTime,
    slotEndTime,
    reservations,
    announcements,
    approvedReservation,
    onCreateAd,
    isAuthorized,
    onChallenge,
    currentTeamId
}) => {
    const [activeTab, setActiveTab] = useState<'PENDING' | 'LOOKING'>(
        reservations.length > 0 ? 'PENDING' : 'LOOKING'
    );

    if (!isOpen) return null;

    const isFull = !!approvedReservation;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b border-slate-700 bg-slate-900 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-turf-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div>
                        <div className="flex items-center gap-2 text-turf-500 mb-1">
                            <Clock className="w-5 h-5" />
                            <span className="font-bold text-sm tracking-wider">SAAT DETAYI</span>
                        </div>
                        <h2 className="font-sport font-black text-4xl text-white italic">{slotTime}{slotEndTime ? ` - ${slotEndTime}` : ''}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-red-500 transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {isFull ? (
                        /* FULL STATE */
                        <div className="text-center py-4">
                            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 mb-4">
                                <h3 className="text-red-400 font-black text-xl italic uppercase mb-2">DOLU - MAÇ VAR</h3>
                                <p className="text-slate-400 text-sm mb-6">Bu saat için saha ayrılmış durumda.</p>

                                <div className="flex items-center justify-center gap-4">
                                    {!approvedReservation.opponentTeam ? (
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-20 h-20 bg-slate-800 rounded-full mx-auto mb-2 border-2 border-orange-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.15)] relative overflow-hidden">
                                                {approvedReservation.team?.logoUrl ? (
                                                    <img src={approvedReservation.team.logoUrl} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Users className="w-8 h-8 text-orange-400" />
                                                )}
                                            </div>
                                            <div className="font-bold text-white text-lg uppercase tracking-wider text-center">{approvedReservation.team?.name || 'Kendi Aramızda'}</div>
                                            <div className="text-[10px] font-bold text-orange-400 uppercase tracking-widest bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/30">Kendi Aramızda (Tek Takım)</div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="text-center flex-1">
                                                <div className="w-16 h-16 bg-slate-800 rounded-full mx-auto mb-2 border-2 border-slate-600 overflow-hidden relative flex items-center justify-center">
                                                    {approvedReservation.team?.logoUrl ? (
                                                        <img src={approvedReservation.team.logoUrl} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Shield className="w-8 h-8 text-slate-600" />
                                                    )}
                                                </div>
                                                <div className="font-bold text-white text-sm">{approvedReservation.team?.name || 'Takım A'}</div>
                                            </div>

                                            <div className="text-2xl font-black text-slate-500 italic px-2">VS</div>

                                            <div className="text-center flex-1">
                                                <div className="w-16 h-16 bg-slate-800 rounded-full mx-auto mb-2 border-2 border-slate-600 overflow-hidden relative flex items-center justify-center">
                                                    {approvedReservation.opponentTeam?.logoUrl ? (
                                                        <img src={approvedReservation.opponentTeam.logoUrl} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Shield className="w-8 h-8 text-slate-600" />
                                                    )}
                                                </div>
                                                <div className="font-bold text-white text-sm">{approvedReservation.opponentTeam?.name || (approvedReservation.type === 'MATCH' ? 'Rakip Bekleniyor' : 'Hazırlık')}</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* PENDING / LOOKING STATE */
                        <>
                            {/* Tabs */}
                            <div className="flex p-1 bg-slate-900 rounded-xl mb-6">
                                <button
                                    onClick={() => setActiveTab('PENDING')}
                                    className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${activeTab === 'PENDING'
                                        ? 'bg-slate-700 text-white shadow-lg'
                                        : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    Onay Bekleyenler ({reservations.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('LOOKING')}
                                    className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${activeTab === 'LOOKING'
                                        ? 'bg-slate-700 text-white shadow-lg'
                                        : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    Rakip Arayanlar ({announcements.length})
                                </button>
                            </div>

                            {/* List */}
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar mb-6">
                                {activeTab === 'PENDING' && (
                                    reservations.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500 text-sm">
                                            Bu saat için onay bekleyen takım yok.
                                        </div>
                                    ) : (
                                        reservations.map((res: any) => (
                                            <div key={res.id} className="flex items-center gap-3 p-3 bg-slate-700/30 border border-slate-700 rounded-xl">
                                                <div className="flex -space-x-3">
                                                    <div className="w-10 h-10 bg-slate-800 rounded-full border border-slate-600 flex items-center justify-center overflow-hidden z-10">
                                                        {res.team?.logoUrl ? (
                                                            <img src={res.team.logoUrl} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Shield className="w-5 h-5 text-slate-500" />
                                                        )}
                                                    </div>
                                                    {res.opponentTeam && (
                                                        <div className="w-10 h-10 bg-slate-800 rounded-full border border-slate-600 flex items-center justify-center overflow-hidden z-20">
                                                            {res.opponentTeam?.logoUrl ? (
                                                                <img src={res.opponentTeam.logoUrl} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Shield className="w-5 h-5 text-slate-500" />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-white text-sm truncate">
                                                        {res.team?.name || 'Bilinmeyen Takım'}
                                                        {res.opponentTeam && <span className="text-slate-400 mx-1">vs</span>}
                                                        {res.opponentTeam?.name}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-[10px] text-orange-400 font-bold uppercase">Onay Bekliyor</div>
                                                        {currentTeamId && (res.teamId === currentTeamId || res.opponentTeamId === currentTeamId) && (
                                                            <span className="text-[10px] bg-turf-500/20 text-turf-400 px-1.5 py-0.5 rounded font-bold">SİZ</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )
                                )}

                                {activeTab === 'LOOKING' && (
                                    announcements.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500 text-sm">
                                            Bu saat için rakip arayan takım yok.
                                        </div>
                                    ) : (
                                        announcements.map((ann: any) => {
                                            const isMyTeam = currentTeamId && ann.teamId === currentTeamId;
                                            return (
                                                <div key={ann.id} className={`flex items-center gap-3 p-3 border rounded-xl relative overflow-hidden ${isMyTeam ? 'bg-turf-900/10 border-turf-500/30' : 'bg-slate-700/30 border-slate-700'}`}>
                                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${isMyTeam ? 'bg-white' : 'bg-turf-500'}`}></div>
                                                    <div className="w-10 h-10 bg-slate-800 rounded-full border border-slate-600 flex items-center justify-center overflow-hidden">
                                                        {ann.team?.logoUrl ? (
                                                            <img src={ann.team.logoUrl} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Shield className="w-5 h-5 text-slate-500" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-bold text-white text-sm flex items-center gap-2">
                                                            {ann.team?.name || 'Bilinmeyen Takım'}
                                                            {isMyTeam && <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-bold">SİZİN İLANINIZ</span>}
                                                        </div>
                                                        <div className="text-[10px] text-turf-400 font-bold uppercase">Rakip Arıyor</div>
                                                    </div>
                                                    {!isMyTeam && isAuthorized && (
                                                        <button
                                                            onClick={() => {
                                                                onClose();
                                                                onChallenge(ann.id, ann.team?.name || '');
                                                            }}
                                                            className="px-3 py-1 bg-turf-600 hover:bg-turf-500 text-white text-xs font-bold rounded-lg transition-colors"
                                                        >
                                                            Meydan Oku
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )
                                )}
                            </div>

                            {/* Create Ad Button - Only valid if authorized */}
                            {isAuthorized ? (
                                <button
                                    onClick={() => {
                                        onClose();
                                        onCreateAd();
                                    }}
                                    className="w-full py-4 bg-gradient-to-r from-turf-600 to-turf-500 hover:from-turf-500 hover:to-turf-400 text-white font-bold rounded-2xl shadow-lg shadow-turf-600/30 transition-all flex items-center justify-center gap-2"
                                >
                                    <Clock className="w-5 h-5" />
                                    Bu Saate İlan Aç
                                </button>
                            ) : (
                                <div className="text-center text-xs text-slate-500 mt-2">
                                    İlan açmak için takım kaptanı olmalısınız.
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
