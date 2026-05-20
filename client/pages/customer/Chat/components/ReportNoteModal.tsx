import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

interface Props {
    visible: boolean;
    loading: boolean;
    isBlockAndReport: boolean;
    onClose: () => void;
    onSubmit: (note: string) => void;
}

export const ReportNoteModal: React.FC<Props> = ({
    visible, loading, isBlockAndReport, onClose, onSubmit,
}) => {
    const [note, setNote] = useState('');

    useEffect(() => {
        if (!visible) setNote('');
    }, [visible]);

    if (!visible) return null;

    const title = isBlockAndReport ? 'Engelle & Şikayet Et' : 'Şikayet Et';
    const canSubmit = note.trim().length > 0;

    const handleSubmit = () => {
        if (!canSubmit) return;
        onSubmit(note.trim());
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 w-full max-w-sm rounded-3xl border border-slate-700 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-700/60">
                    <h3 className="text-white font-bold text-base">{title}</h3>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-3">
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Şikayetiniz ekibimize iletilecek ve en kısa sürede incelenecektir.
                    </p>
                    <div className="relative">
                        <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="Şikayet nedeninizi yazın..."
                            rows={3}
                            maxLength={500}
                            autoFocus
                            className="w-full bg-slate-900 border border-slate-600 focus:border-orange-500/60 text-slate-200 text-sm rounded-xl px-3 py-2.5 resize-none placeholder:text-slate-600 focus:outline-none transition-colors"
                        />
                        <span className={`absolute bottom-2 right-3 text-[10px] ${note.length > 450 ? 'text-orange-400' : 'text-slate-600'}`}>
                            {note.length}/500
                        </span>
                    </div>
                    {!canSubmit && note.length === 0 && (
                        <p className="text-slate-500 text-xs">Göndermek için bir açıklama yazmanız gerekiyor.</p>
                    )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3 px-5 pb-5">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm transition-colors"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !canSubmit}
                        className={`flex-1 py-3 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2
                            ${canSubmit
                                ? 'bg-orange-600 hover:bg-orange-500 text-white'
                                : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'}`}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gönder'}
                    </button>
                </div>
            </div>
        </div>
    );
};
