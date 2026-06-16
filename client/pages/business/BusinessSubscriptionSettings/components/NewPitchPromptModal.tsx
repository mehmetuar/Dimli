import React from 'react';
import { PlusCircle } from 'lucide-react';

interface NewPitchPromptModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const NewPitchPromptModal: React.FC<NewPitchPromptModalProps> = ({ visible, onClose, onConfirm }) => {
    if (!visible) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-slate-900 w-full max-w-sm rounded-3xl border border-emerald-500/20 shadow-2xl overflow-hidden">
                <div className="px-6 pt-6 pb-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                        <PlusCircle className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Planınız Yükseltildi!</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Yeni sahanızı eklemek için Saha Ayarları'na gidin. Eklediğiniz saha, yayınlanmadan önce admin onayından geçecektir.
                    </p>
                </div>
                <div className="flex gap-3 px-6 pt-2 pb-6">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors"
                    >
                        Daha Sonra
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-colors"
                    >
                        Şimdi Ekle
                    </button>
                </div>
            </div>
        </div>
    );
};
