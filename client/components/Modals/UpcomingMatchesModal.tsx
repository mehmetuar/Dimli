import React from 'react';
import { X, Calendar, Clock, MapPin, Users, CheckCircle } from 'lucide-react';

interface UpcomingMatch {
    id: string;
    slotTime: string;
    status: string;
    pitch?: {
        name?: string;
        business?: {
            name?: string;
        };
    };
    team?: {
        id: string;
        name: string;
    };
    opponentTeam?: {
        id: string;
        name: string;
    };
}

interface UpcomingMatchesModalProps {
    isOpen: boolean;
    onClose: () => void;
    matches: UpcomingMatch[];
    currentTeamId?: string;
    isLoading?: boolean;
}

export const UpcomingMatchesModal: React.FC<UpcomingMatchesModalProps> = ({
    isOpen,
    onClose,
    matches,
    currentTeamId,
    isLoading = false,
}) => {
    if (!isOpen) return null;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    };

    const getOpponentName = (match: UpcomingMatch): string | null => {
        if (!currentTeamId) return match.opponentTeam?.name || match.team?.name || null;
        if (match.team?.id === currentTeamId) return match.opponentTeam?.name || null;
        return match.team?.name || null;
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            {/* Modal Container */}
            <div className="bg-slate-800 w-full max-w-lg max-h-[80vh] rounded-3xl border border-slate-700 overflow-hidden relative shadow-2xl animate-scale-in flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-slate-900/50 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="bg-turf-500/10 p-3 rounded-xl">
                            <Calendar className="w-6 h-6 text-turf-500" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-sport font-bold text-white uppercase italic tracking-wide">
                                Yaklaşan Maçlar
                            </h3>
                            <p className="text-sm text-slate-400">İşletme tarafından kesinleştirilmiş maçlar</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="w-8 h-8 border-2 border-turf-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-400 text-sm">Yükleniyor...</p>
                        </div>
                    ) : matches.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                                <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
                            </div>
                            <p className="text-white font-bold">Yaklaşan maç yok</p>
                            <p className="text-slate-400 text-sm max-w-[240px]">
                                İşletme tarafından onaylanmış gelecek bir maçınız bulunmuyor.
                            </p>
                        </div>
                    ) : (
                        matches.map((match) => {
                            const opponent = getOpponentName(match);
                            const pitchName = match.pitch?.name || 'Saha';
                            const businessName = match.pitch?.business?.name || 'İşletme';

                            return (
                                <div
                                    key={match.id}
                                    className="bg-slate-900/50 rounded-2xl border border-turf-500/30 overflow-hidden hover:border-turf-500/50 transition-colors"
                                >
                                    {/* Status bar */}
                                    <div className="bg-turf-500/10 px-4 py-2 flex items-center gap-2 border-b border-turf-500/20">
                                        <CheckCircle className="w-4 h-4 text-turf-400" />
                                        <span className="text-turf-400 text-xs font-bold uppercase tracking-wider">
                                            Kesinleştirildi
                                        </span>
                                    </div>

                                    <div className="p-4 space-y-3">
                                        {/* Date & Time */}
                                        <div className="flex items-start gap-3">
                                            <div className="bg-slate-800 p-2 rounded-lg shrink-0 border border-slate-700">
                                                <Calendar className="w-4 h-4 text-turf-400" />
                                            </div>
                                            <div>
                                                <div className="text-white font-bold text-sm">
                                                    {formatDate(match.slotTime)}
                                                </div>
                                                <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                                                    <Clock className="w-3 h-3" />
                                                    {formatTime(match.slotTime)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pitch / Business */}
                                        <div className="flex items-center gap-3">
                                            <div className="bg-slate-800 p-2 rounded-lg shrink-0 border border-slate-700">
                                                <MapPin className="w-4 h-4 text-blue-400" />
                                            </div>
                                            <div>
                                                <div className="text-white font-bold text-sm">{businessName}</div>
                                                <div className="text-slate-400 text-xs">{pitchName}</div>
                                            </div>
                                        </div>

                                        {/* Opponent */}
                                        <div className="flex items-center gap-3">
                                            <div className="bg-slate-800 p-2 rounded-lg shrink-0 border border-slate-700">
                                                <Users className="w-4 h-4 text-purple-400" />
                                            </div>
                                            <div>
                                                <div className="text-slate-400 text-xs">Rakip Takım</div>
                                                <div className="text-white font-bold text-sm">{opponent ?? 'Kendi Aramızda'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700 bg-slate-900/50">
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-700 text-white font-bold py-3 rounded-xl hover:bg-slate-600 transition-colors"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
};
