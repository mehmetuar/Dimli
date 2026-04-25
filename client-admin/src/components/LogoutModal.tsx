import React from 'react';
import { DimliLogo, IconLogout, IconX, IconAlertCircle } from './Icons';

interface LogoutModalProps {
    onConfirm: () => void;
    onCancel: () => void;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({ onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay */}
        <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCancel}
        />

        {/* Modal */}
        <div className="relative w-full max-w-sm bg-[#1e2d47] border border-slate-600/60 rounded-2xl shadow-2xl shadow-black/60 p-6 flex flex-col items-center gap-5">
            {/* Kapat X */}
            <button
                onClick={onCancel}
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-200 transition-colors p-1"
            >
                <IconX size={16} />
            </button>

            {/* Logo */}
            <div className="flex flex-col items-center gap-2">
                <DimliLogo size={52} className="drop-shadow-[0_0_14px_rgba(74,222,128,0.25)]" />
                <span className="text-orange-400/80 text-xs font-bold uppercase tracking-[0.2em]">Dimli Admin</span>
            </div>

            {/* Uyarı ikonu + başlık */}
            <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                    <IconAlertCircle size={22} className="text-red-400" />
                </div>
                <h2 className="text-[#dde8f5] font-black text-lg">Çıkış Yapmak İstiyor musunuz?</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                    Oturumunuz sonlandırılacak. Tekrar giriş yapmanız gerekecektir.
                </p>
            </div>

            {/* Butonlar */}
            <div className="flex gap-3 w-full">
                <button
                    onClick={onCancel}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-slate-600/50 text-slate-300 hover:text-slate-100 py-2.5 rounded-xl font-bold text-sm transition-all"
                >
                    İptal
                </button>
                <button
                    onClick={onConfirm}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 hover:text-red-200 py-2.5 rounded-xl font-black text-sm transition-all"
                >
                    <IconLogout size={15} />
                    Evet, Çıkış Yap
                </button>
            </div>
        </div>
    </div>
);

export default LogoutModal;
