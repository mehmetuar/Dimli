import React from 'react';
import { LottiePlayer } from '../../../../components/UI/LottiePlayer';
import { useModalBodyClass } from '../../../../utils/useModalBodyClass';

interface TeamCreatedCelebrationProps {
    isOpen: boolean;
    teamName?: string;
    /** Animasyon bitince (onComplete) VEYA "Kadroyu Yönet" ile atla → Takımım'a geç */
    onDone: () => void;
}

/**
 * Takım kurulunca (TEAM_CREATED) standart success modal yerine hafif kutlama görünümü:
 * World Cup Lottie (tek-sefer) + "{takım} takımını kurdun!" — başlık YOK. Animasyon bitince
 * onDone tetiklenir (Takımım'a geçiş). reduce-motion / yüklenme / hata durumunda animasyon
 * oynamaz; kullanıcı "Kadroyu Yönet" butonuyla ilerler (güvenlik ağı).
 */
export const TeamCreatedCelebration: React.FC<TeamCreatedCelebrationProps> = ({
    isOpen,
    teamName,
    onDone,
}) => {
    useModalBodyClass(isOpen);
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm px-6 animate-fade-in select-none"
            style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' } as React.CSSProperties}
        >
            <div className="w-64 h-64 max-w-[70vw] max-h-[70vw]">
                <LottiePlayer
                    src="/animations/world-cup.json"
                    loop={false}
                    autoplay
                    ariaLabel="Kutlama"
                    style={{ width: '100%', height: '100%' }}
                    onComplete={onDone}
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
        </div>
    );
};
