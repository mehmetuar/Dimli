import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface SaveConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const SaveConfirmModal: React.FC<SaveConfirmModalProps> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-600"></div>
                <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2 text-center italic uppercase">Emin misiniz?</h3>
                <p className="text-slate-400 mb-8 text-center font-medium">İşletme bilgileriniz güncellenecektir.</p>
                <div className="flex flex-col gap-3">
                    <button onClick={onConfirm} className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl transition-all shadow-lg shadow-orange-600/20 uppercase tracking-wider active:scale-[0.98]">
                        EVET, KAYDET
                    </button>
                    <button onClick={onClose} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all uppercase tracking-wider">
                        İPTAL
                    </button>
                </div>
            </div>
        </div>
    );
};
