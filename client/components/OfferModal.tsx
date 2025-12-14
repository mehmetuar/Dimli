
import React, { useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface OfferModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamName: string;
    onSend: (note: string) => Promise<void>;
}

export const OfferModal: React.FC<OfferModalProps> = ({ isOpen, onClose, teamName, onSend }) => {
    const [note, setNote] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isSent, setIsSent] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        setIsSending(true);
        try {
            await onSend(note);
            setIsSent(true);
            setTimeout(() => {
                setIsSent(false);
                setNote('');
                onClose();
            }, 2000);
        } catch (error) {
            console.error('Failed to send offer:', error);
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 w-full max-w-md rounded-3xl border border-slate-700 p-6 relative">
                {isSent ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                            <CheckCircle className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Teklif Gönderildi!</h3>
                        <p className="text-slate-400">Rakip kaptan teklifini inceleyip dönüş yapacak.</p>
                    </div>
                ) : (
                    <>
                        <h3 className="text-xl font-bold text-white mb-1">Maç Teklifi Yap</h3>
                        <p className="text-sm text-slate-400 mb-4">
                            <span className="text-turf-500 font-bold">{teamName}</span> takımına meydan okuyorsun.
                        </p>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Rakip Kaptana Notun (Opsiyonel)</label>
                            <textarea
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:border-turf-500 focus:outline-none transition-colors"
                                rows={3}
                                placeholder="Örn: Kadromuz tam, maça hazırız. Forma rengimiz kırmızı..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 bg-slate-700 text-white font-bold py-3 rounded-xl hover:bg-slate-600 transition-colors"
                                disabled={isSending}
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="flex-1 bg-turf-600 text-white font-bold py-3 rounded-xl hover:bg-turf-500 transition-colors shadow-lg shadow-turf-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isSending}
                            >
                                {isSending ? 'Gönderiliyor...' : 'Teklifi Gönder'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
