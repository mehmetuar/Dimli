import React from 'react';
import { Check, X } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Paylaşılan toast — TEK premium desen (sayfa-başına inline toast konum
// tutarsızlıklarının çözümü; UserProfile'da alt navbar'ın arkasında kalıyordu,
// TeamSettings'te başlıkla çakışıyordu).
// Konum: viewport üstü, safe-area + başlık payı ile — alt navbar'dan tamamen
// bağımsız, hiçbir ekran boyutunda çakışmaz. Görünürlük/timeout üst bileşende
// (mevcut 3sn setTimeout akışları aynen çalışır): `{msg && <Toast .../>}`.
// ─────────────────────────────────────────────────────────────────────────────

interface ToastProps {
    message: string;
    type?: 'success' | 'error';
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success' }) => {
    const isSuccess = type === 'success';
    return (
        <div
            className="fixed left-4 right-4 z-[70] pointer-events-none"
            style={{ top: 'calc(env(safe-area-inset-top) + 72px)' }}
        >
            <div
                className={`max-w-sm mx-auto flex items-center gap-2.5 px-5 py-3 rounded-2xl border shadow-xl backdrop-blur-sm animate-fade-in ${
                    isSuccess
                        ? 'bg-green-500/10 border-green-500/50 text-green-400'
                        : 'bg-red-500/10 border-red-500/50 text-red-400'
                }`}
            >
                {isSuccess
                    ? <Check className="w-4 h-4 flex-shrink-0" />
                    : <X className="w-4 h-4 flex-shrink-0" />}
                <p className="font-bold leading-snug" style={{ fontSize: 'clamp(0.75rem, 3.2vw, 0.875rem)' }}>
                    {message}
                </p>
            </div>
        </div>
    );
};
