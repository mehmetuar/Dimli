import React from 'react';
import { X, Trophy, TrendingUp, Star } from 'lucide-react';
import { MatchHistory } from '../types';

interface MatchHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    matches: MatchHistory[];
}

export const MatchHistoryModal: React.FC<MatchHistoryModalProps> = ({
    isOpen,
    onClose,
    matches
}) => {
    if (!isOpen) return null;

    const getResultBadge = (result: 'WIN' | 'LOSS' | 'DRAW') => {
        switch (result) {
            case 'WIN':
                return <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-lg text-xs font-bold">GALİBİYET</span>;
            case 'LOSS':
                return <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-lg text-xs font-bold">MAĞLUBİYET</span>;
            case 'DRAW':
                return <span className="bg-slate-500/20 text-slate-400 px-2 py-1 rounded-lg text-xs font-bold">BERABERE</span>;
        }
    };

    const wins = matches.filter(m => m.result === 'WIN').length;
    const losses = matches.filter(m => m.result === 'LOSS').length;
    const draws = matches.filter(m => m.result === 'DRAW').length;
    const avgFairPlay = (matches.reduce((sum, m) => sum + m.fairPlayScore, 0) / matches.length).toFixed(1);

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 w-full max-w-2xl max-h-[80vh] rounded-3xl border border-slate-700 overflow-hidden relative shadow-2xl animate-scale-in flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-slate-900/50 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-turf-500/10 p-3 rounded-xl">
                            <Trophy className="w-6 h-6 text-turf-500" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-sport font-bold text-white uppercase italic tracking-wide">
                                Geçmiş Maçlar
                            </h3>
                            <p className="text-sm text-slate-400">Son {matches.length} maç performansı</p>
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-4 gap-3">
                        <div className="bg-slate-900/50 p-3 rounded-xl text-center">
                            <div className="text-green-400 font-sport font-bold text-2xl">{wins}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase">Galibiyet</div>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-xl text-center">
                            <div className="text-slate-400 font-sport font-bold text-2xl">{draws}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase">Berabere</div>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-xl text-center">
                            <div className="text-red-400 font-sport font-bold text-2xl">{losses}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase">Mağlubiyet</div>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-xl text-center">
                            <div className="text-turf-500 font-sport font-bold text-2xl">{avgFairPlay}</div>
                            <div className="text-xs text-slate-500 font-bold uppercase">Ort. FP</div>
                        </div>
                    </div>
                </div>

                {/* Matches List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {matches.map((match) => (
                        <div
                            key={match.id}
                            className={`bg-slate-900/50 border rounded-2xl p-4 hover:bg-slate-900 transition-colors ${match.result === 'WIN' ? 'border-green-500/20' :
                                match.result === 'LOSS' ? 'border-red-500/20' :
                                    'border-slate-700'
                                }`}
                        >
                            {/* Top Row: Logo, Name, Result Badge */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={match.opponentLogo}
                                        alt={match.opponentName}
                                        className="w-12 h-12 rounded-full border-2 border-slate-700 bg-slate-800 object-cover"
                                    />
                                    <div>
                                        <h4 className="text-white font-bold text-sm">{match.opponentName}</h4>
                                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                            <span>{match.date}</span>
                                            <span>•</span>
                                            <span className="truncate max-w-[120px]">{match.location}</span>
                                        </div>
                                    </div>
                                </div>
                                {getResultBadge(match.result)}
                            </div>

                            {/* Bottom Row: Score and Fair Play */}
                            <div className="flex items-center justify-between">
                                {/* Result Text */}
                                <div className="flex-1">
                                    <div className="text-xs text-slate-500 font-bold uppercase mb-1">Sonuç</div>
                                    <div className={`font-sport font-bold text-2xl ${match.result === 'WIN' ? 'text-green-400' :
                                        match.result === 'LOSS' ? 'text-red-400' :
                                            'text-slate-400'
                                        }`}>
                                        {match.result === 'WIN' ? 'KAZANDI' :
                                            match.result === 'LOSS' ? 'KAYBETTİ' : 'BERABERE'}
                                    </div>
                                </div>

                                {/* Fair Play Score */}
                                <div className="flex flex-col items-center bg-slate-800 px-4 py-3 rounded-xl border border-slate-700">
                                    <div className="flex items-center gap-1 mb-1">
                                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                        <span className="text-yellow-500 font-bold text-lg">{match.fairPlayScore.toFixed(1)}</span>
                                    </div>
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Fair Play</span>
                                </div>
                            </div>
                        </div>
                    ))}
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
