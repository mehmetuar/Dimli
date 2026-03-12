import React from 'react';

interface DeletePitchModalProps {
    deleting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const DeletePitchModal: React.FC<DeletePitchModalProps> = ({ deleting, onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-2">Emin misiniz?</h3>
                <p className="text-slate-400 mb-6">
                    Bu sahayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve sahaya ait tüm veriler silinecektir.
                </p>
                <div className="flex gap-3">
                    <button onClick={onCancel}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors">
                        İptal
                    </button>
                    <button onClick={onConfirm} disabled={deleting}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                        {deleting ? 'Siliniyor...' : 'Evet, Sil'}
                    </button>
                </div>
            </div>
        </div>
    );
};
