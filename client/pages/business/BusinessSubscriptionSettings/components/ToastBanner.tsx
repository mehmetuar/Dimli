import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface ToastBannerProps {
    toast: { text: string; type: 'success' | 'error' } | null;
}

export const ToastBanner: React.FC<ToastBannerProps> = ({ toast }) => {
    if (!toast) return null;
    const ok = toast.type === 'success';
    return (
        <div
            className={`fixed top-16 left-4 right-4 z-50 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl border
                ${ok ? 'bg-green-900/90 border-green-500/40 text-green-300' : 'bg-red-900/90 border-red-500/40 text-red-300'}`}
        >
            {ok ? <CheckCircle className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
            <p className="font-semibold text-sm">{toast.text}</p>
        </div>
    );
};
