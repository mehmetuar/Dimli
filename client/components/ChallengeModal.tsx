import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ChallengeModalProps {
    isOpen: boolean;
    onClose: () => void;
    match: {
        id: string;
        teamName: string;
        teamLogo: string;
        date: string;
        time: string;
        location: string;
    };
    onSubmit: (note: string) => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({ isOpen, onClose, match, onSubmit }) => {
    const [note, setNote] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        setIsLoading(true);
        await onSubmit(note);
        setIsLoading(false);
        setNote('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 overflow-hidden relative shadow-2xl shadow-turf-500/20">
                {/* Header */}
                <div className="bg-gradient-to-r from-turf-600 to-turf-700 p-5">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 bg-slate-900/50 p-2 rounded-full text-white hover:bg-red-500 transition-colors z-20"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <h2 className="font-sport font-black text-2xl text-white uppercase italic">
                        Meydan Oku
                    </h2>
                    <p className="text-turf-100 text-sm mt-1">Rakip takıma mesaj gönder</p>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Match Info */}
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                        <div className="flex items-center gap-3 mb-3">
                            <img src={match.teamLogo} alt={match.teamName} className="w-12 h-12 rounded-full border-2 border-slate-600" />
                            <div>
                                <h3 className="font-bold text-white">{match.teamName}</h3>
                                <p className="text-slate-400 text-xs">{match.date} • {match.time}</p>
                            </div>
                        </div>
                        <p className="text-slate-500 text-xs"><span className="text-turf-500">📍</span> {match.location}</p>
                    </div>

                    {/* Note Input */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                            Mesajın (Opsiyonel)
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Örn: Merhaba, bu akşam sahanız uygun mu? Bir maç yapalım!"
                            className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-700 focus:border-turf-500 focus:outline-none resize-none h-32 text-sm"
                            maxLength={200}
                        />
                        <p className="text-slate-600 text-xs mt-1 text-right">{note.length}/200</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 bg-slate-700 text-white py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-slate-600 transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="flex-1 bg-turf-600 text-white py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Gönderiliyor...' : 'Meydan Oku'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
