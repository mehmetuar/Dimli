import React from 'react';
import { X, ShieldOff, Flag, ShieldAlert } from 'lucide-react';

interface Props {
    visible: boolean;
    senderName: string;
    loading: boolean;
    onClose: () => void;
    onBlock: () => void;
    onReport: () => void;
    onBlockAndReport: () => void;
}

export const MessageActionModal: React.FC<Props> = ({
    visible, senderName, loading, onClose, onBlock, onReport, onBlockAndReport,
}) => {
    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-5 bg-black/75 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-800 w-full max-w-sm rounded-3xl border border-slate-700 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-700/60">
                    <div>
                        <p className="text-white font-bold text-base">{senderName}</p>
                        <p className="text-slate-400 text-xs mt-0.5">Bu kullanıcı için bir işlem seçin</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Actions */}
                <div className="flex flex-col p-4 gap-2.5">
                    <button
                        onClick={onBlock}
                        disabled={loading}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-slate-900 border border-red-900/30 hover:border-red-500/50 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        <ShieldOff className="w-5 h-5 text-red-400 shrink-0" />
                        <div className="text-left">
                            <p className="text-red-400 font-semibold text-sm">Engelle</p>
                            <p className="text-slate-500 text-xs mt-0.5">Bu kişinin mesajlarını bir daha görmezsin</p>
                        </div>
                    </button>

                    <button
                        onClick={onReport}
                        disabled={loading}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-slate-900 border border-orange-900/30 hover:border-orange-500/50 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        <Flag className="w-5 h-5 text-orange-400 shrink-0" />
                        <div className="text-left">
                            <p className="text-orange-400 font-semibold text-sm">Şikayet Et</p>
                            <p className="text-slate-500 text-xs mt-0.5">İnceleme için ekibimize bildir</p>
                        </div>
                    </button>

                    <button
                        onClick={onBlockAndReport}
                        disabled={loading}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-slate-900 border border-slate-600 hover:border-slate-400 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        <ShieldAlert className="w-5 h-5 text-slate-300 shrink-0" />
                        <div className="text-left">
                            <p className="text-slate-300 font-semibold text-sm">Engelle &amp; Şikayet Et</p>
                            <p className="text-slate-500 text-xs mt-0.5">Hem engelle hem de ekibimize bildir</p>
                        </div>
                    </button>
                </div>

                {/* Cancel */}
                <div className="px-4 pb-4">
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-2xl bg-slate-700/50 text-slate-300 font-medium text-sm active:bg-slate-700 transition-colors"
                    >
                        Vazgeç
                    </button>
                </div>
            </div>
        </div>
    );
};
