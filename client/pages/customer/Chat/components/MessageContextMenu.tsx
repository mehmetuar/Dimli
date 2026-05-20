import React from 'react';
import { Copy, Flag } from 'lucide-react';
import type { MenuPosition } from '../hooks/useMessageActions';

interface Props {
    visible: boolean;
    position: MenuPosition;
    onCopy: () => void;
    onReport: () => void;
    onClose: () => void;
}

export const MessageContextMenu: React.FC<Props> = ({
    visible, position, onCopy, onReport, onClose,
}) => {
    if (!visible) return null;

    // Menüyü dokunulan noktanın ~72px üzerinde göster, ekran üstüne taşmasın
    const menuTop = Math.max(56, position.y - 72);

    return (
        <>
            {/* Dokunmayı kapatan transparan overlay */}
            <div
                className="fixed inset-0 z-[98]"
                onTouchStart={onClose}
                onClick={onClose}
            />

            {/* Context menü kartı */}
            <div
                className="fixed z-[99] flex overflow-hidden rounded-2xl border border-slate-600 bg-slate-800 shadow-2xl"
                style={{
                    top: menuTop,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    // Küçük scale-in animasyonu
                    animation: 'ctxIn 120ms cubic-bezier(0.2,0,0,1) both',
                }}
            >
                <button
                    className="flex flex-col items-center gap-1 px-6 py-3 active:bg-slate-700 transition-colors"
                    onTouchStart={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); onCopy(); }}
                >
                    <Copy className="w-5 h-5 text-slate-200" />
                    <span className="text-[11px] font-medium text-slate-300">Kopyala</span>
                </button>

                <div className="w-px bg-slate-600/60 my-2" />

                <button
                    className="flex flex-col items-center gap-1 px-6 py-3 active:bg-slate-700 transition-colors"
                    onTouchStart={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); onReport(); }}
                >
                    <Flag className="w-5 h-5 text-orange-400" />
                    <span className="text-[11px] font-medium text-orange-400">Bildir</span>
                </button>
            </div>

            <style>{`
                @keyframes ctxIn {
                    from { opacity: 0; transform: translateX(-50%) scale(0.85); }
                    to   { opacity: 1; transform: translateX(-50%) scale(1); }
                }
            `}</style>
        </>
    );
};
