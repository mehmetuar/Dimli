import React from 'react';
import { Trash2 } from 'lucide-react';

interface DeleteAccountSectionProps {
    onOpenDelete: () => void;
}

export const DeleteAccountSection: React.FC<DeleteAccountSectionProps> = ({ onOpenDelete }) => (
    <div className="mt-2 border-t border-slate-800 pt-4">
        <div className="bg-red-500/5 border border-red-500/15 rounded-3xl p-5">
            <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-red-400 mb-1">Hesabı Sil</p>
                    <p className="text-slate-400 text-xs leading-relaxed">
                        İşletme hesabınızı tamamen kapatır. Tüm saha, rezervasyon ve işletme verileriniz kalıcı olarak silinir. Bu işlem geri alınamaz.
                    </p>
                    <button
                        onClick={onOpenDelete}
                        className="mt-3.5 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 active:scale-95 text-red-400 border border-red-500/25 rounded-xl text-sm font-bold transition-all"
                    >
                        Hesabı Sil
                    </button>
                </div>
            </div>
        </div>
    </div>
);
