import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LottiePlayer } from './LottiePlayer';
import { useModalBodyClass } from '../../utils/useModalBodyClass';

interface CelebrationScreenProps {
    isOpen: boolean;
    /** public/animations altındaki Lottie yolu — özel animasyon bulununca tek satır değişir */
    lottieSrc: string;
    lottieLoop?: boolean;
    /** reduce-motion / yükleme hatasında gösterilecek statik görsel (boş ekran kalmasın diye ZORUNLU tut) */
    fallback: React.ReactNode;
    title: string;
    subtitle?: string;
    buttonLabel: string;
    /** Otomatik geçiş süresi (ms) — timer animasyondan BAĞIMSIZ çalışır (reduce-motion güvenli) */
    autoCloseMs?: number;
    onDone: () => void;
}

/**
 * Genel tam-ekran kutlama EKRANI (overlay değil — opak gradient zemin, backdrop-blur yok).
 * TeamCreatedCelebration deseninden türetildi: portal → document.body + z-[9999],
 * otomatik geçiş timer'ı + buton fallback'i. Kayıt başarısı ve Şifremi Unuttum başarısı kullanır.
 */
export const CelebrationScreen: React.FC<CelebrationScreenProps> = ({
    isOpen, lottieSrc, lottieLoop = false, fallback,
    title, subtitle, buttonLabel, autoCloseMs, onDone,
}) => {
    useModalBodyClass(isOpen);

    // Timer animasyonun onComplete'ine bağlı DEĞİL → reduce-motion/yükleme hatasında da işler.
    const onDoneRef = useRef(onDone);
    onDoneRef.current = onDone;
    useEffect(() => {
        if (!isOpen || !autoCloseMs) return;
        const t = setTimeout(() => onDoneRef.current(), autoCloseMs);
        return () => clearTimeout(t);
    }, [isOpen, autoCloseMs]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-pitch-surface to-pitch px-6 animate-fade-in select-none"
            style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' } as React.CSSProperties}
        >
            <div className="w-64 h-64 max-w-[70vw] max-h-[70vw] flex items-center justify-center">
                <LottiePlayer
                    src={lottieSrc}
                    loop={lottieLoop}
                    autoplay
                    ariaLabel="Kutlama"
                    style={{ width: '100%', height: '100%' }}
                    fallback={<div className="flex items-center justify-center w-full h-full">{fallback}</div>}
                />
            </div>

            <p className="text-white text-2xl font-sport font-black italic uppercase text-center mt-2 leading-tight animate-enter-up">
                {title}
            </p>
            {subtitle && (
                <p className="text-slate-400 text-sm mt-2 text-center animate-enter-up [animation-delay:150ms]">
                    {subtitle}
                </p>
            )}

            <button
                onClick={onDone}
                className="mt-8 bg-turf-600 hover:bg-turf-500 active:scale-[0.97] text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-turf-600/20"
            >
                {buttonLabel}
            </button>
        </div>,
        document.body
    );
};
