import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LottiePlayer } from '../../../../components/UI/LottiePlayer';
import { useModalBodyClass } from '../../../../utils/useModalBodyClass';

interface TeamCreatedCelebrationProps {
    isOpen: boolean;
    teamName?: string;
    /** Otomatik kapanma süresi VEYA "Kadroyu Yönet" ile atla → Takımım'a geç */
    onDone: () => void;
}

// Kullanıcı isteği: animasyon DÖNGÜLÜ (tekrar etsin, son kareyi tutup durmasın) ve ~6sn
// (World Cup ~2.3s → ≈2-3 tekrar) ekranda kalsın.
const AUTO_CLOSE_MS = 6000;

/**
 * Takım kurulunca (TEAM_CREATED) standart success modal yerine hafif kutlama görünümü:
 * World Cup Lottie (DÖNGÜLÜ) + "{takım} takımını kurdun!" — başlık YOK. ~6sn sonra otomatik
 * (reduce-motion/hata'da da timer çalışır) VEYA "Kadroyu Yönet" ile onDone → Takımım'a geçiş.
 */
export const TeamCreatedCelebration: React.FC<TeamCreatedCelebrationProps> = ({
    isOpen,
    teamName,
    onDone,
}) => {
    useModalBodyClass(isOpen);

    // Otomatik kapanma timer'ı (animasyonun onComplete'ine bağlı DEĞİL → süre 2×, reduce-motion güvenli).
    const onDoneRef = useRef(onDone);
    onDoneRef.current = onDone;
    useEffect(() => {
        if (!isOpen) return;
        const t = setTimeout(() => onDoneRef.current(), AUTO_CLOSE_MS);
        return () => clearTimeout(t);
    }, [isOpen]);

    if (!isOpen) return null;

    // Portal → document.body: TeamProfile'ın fixed inset-0 stacking context'inden çıkar, böylece
    // PROFİLİM/TAKIMIM tab başlığı dahil TÜM ekranı örter (z-[9999]).
    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm px-6 animate-fade-in select-none"
            style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' } as React.CSSProperties}
        >
            <div className="w-64 h-64 max-w-[70vw] max-h-[70vw]">
                <LottiePlayer
                    src="/animations/world-cup.json"
                    loop
                    autoplay
                    ariaLabel="Kutlama"
                    style={{ width: '100%', height: '100%' }}
                    fallback={null}
                />
            </div>

            <p className="text-white text-2xl font-sport font-black italic uppercase text-center mt-2 leading-tight">
                {teamName ? `${teamName} takımını kurdun!` : 'Takımını kurdun!'}
            </p>

            <button
                onClick={onDone}
                className="mt-8 bg-turf-600 hover:bg-turf-500 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-lg shadow-turf-600/20"
            >
                KADROYU YÖNET
            </button>
        </div>,
        document.body
    );
};
