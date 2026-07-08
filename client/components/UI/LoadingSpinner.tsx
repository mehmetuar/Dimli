import React from 'react';
import { LottiePlayer } from './LottiePlayer';

interface LoadingSpinnerProps {
    fullScreen?: boolean;
    size?: 'sm' | 'md' | 'lg';
    text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    fullScreen = false,
    size = 'md',
    text = 'Yükleniyor...'
}) => {
    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-12 h-12',
        lg: 'w-16 h-16'
    };

    const content = (
        <div className="flex flex-col items-center justify-center gap-4">
            <div className={`${sizeClasses[size]} flex items-center justify-center`}>
                <LottiePlayer
                    src="/animations/rolling-football.json"
                    loop
                    autoplay
                    ariaLabel={text || 'Yükleniyor'}
                    style={{ width: '100%', height: '100%' }}
                    fallback={
                        <div className={`${sizeClasses[size]} rounded-full border-4 border-slate-700 border-t-turf-500 animate-spin`} />
                    }
                />
            </div>

            {/* Text */}
            {text && size !== 'sm' && (
                <div className="flex flex-col items-center animate-pulse">
                    <span className="text-turf-500 font-bold text-sm tracking-widest uppercase">{text}</span>
                </div>
            )}
        </div>
    );

    if (fullScreen) {
        // Marka loader'ı: dönen top Lottie. reduce-motion/yüklenme/hata → mevcut CSS ring (dikişsiz).
        return (
            <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="w-20 h-20">
                        <LottiePlayer
                            src="/animations/rolling-football.json"
                            loop
                            autoplay
                            ariaLabel={text || 'Yükleniyor'}
                            style={{ width: '100%', height: '100%' }}
                            fallback={
                                <div className="w-20 h-20 rounded-full border-4 border-slate-700 border-t-turf-500 animate-spin" />
                            }
                        />
                    </div>
                    {text && (
                        <span className="text-turf-500 font-bold text-sm tracking-widest uppercase animate-pulse">{text}</span>
                    )}
                </div>
            </div>
        );
    }

    return content;
};
